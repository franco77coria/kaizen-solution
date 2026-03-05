import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generateAudio, generateAudioForWhatsApp, getElevenLabsConfig, logApiUsage } from "@/lib/elevenlabs";
import {
    uploadMediaToWhatsApp,
    sendWhatsAppAudio,
    sendWhatsAppImage,
    getWhatsAppConfig,
    callTwilioAPI,
} from "@/lib/whatsapp";

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
});

const THROTTLE_MS = 150;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Retry helper with exponential backoff (for ElevenLabs rate limits at scale)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 2000): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const isRateLimit = err.message?.includes("429") || err.message?.toLowerCase().includes("rate") || err.message?.toLowerCase().includes("too many");
            if (attempt === maxRetries || !isRateLimit) throw err;
            const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms: ${err.message}`);
            await sleep(delay);
        }
    }
    throw new Error("Unreachable");
}

// Helper to send an audio buffer to a contact via Twilio or Meta
async function sendAudioToContact(
    config: any, isTwilio: boolean, phone: string, audioBuffer: Buffer, format: 'ogg' | 'mp3' = 'ogg'
) {
    if (isTwilio) {
        const crypto = await import("crypto");
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/ogg';
        const hash = crypto.createHash("sha256").update(audioBuffer).digest("hex").substring(0, 32);
        // Use media-cache (same as images) — audio-cache causes Twilio error 63021
        await (prisma as any).mediaCache.upsert({
            where: { hash },
            update: {},
            create: { hash, mimeType, data: audioBuffer.toString("base64") },
        });
        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
        await callTwilioAPI(config, {
            From: `whatsapp:${config.twilioNumber}`,
            To: `whatsapp:${phone}`,
            MediaUrl: `${appUrl}/api/media-cache/${hash}`,
        });
    } else {
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/ogg';
        const mediaId = await uploadMediaToWhatsApp(audioBuffer, mimeType);
        await sendWhatsAppAudio(phone, mediaId);
    }
}


/**
 * Strip ID3v2 header and ID3v1 tag from an MP3 buffer, returning only raw MP3 frames.
 * This is needed for clean MP3 concatenation — duplicate ID3 headers cause WhatsApp to reject the file.
 */
function stripMp3Headers(buf: Buffer): Buffer {
    let start = 0;
    // Skip ID3v2 header if present (starts with "ID3")
    if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
        // ID3v2 size is stored in 4 bytes (synchsafe integer) at offset 6-9
        const size = (buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f);
        start = 10 + size;
    }
    // Find first MP3 sync frame (0xFF followed by 0xE0-0xFF)
    while (start < buf.length - 1) {
        if (buf[start] === 0xFF && (buf[start + 1] & 0xE0) === 0xE0) break;
        start++;
    }
    let end = buf.length;
    // Strip ID3v1 tag if present (last 128 bytes starting with "TAG")
    if (end > 128 && buf[end - 128] === 0x54 && buf[end - 127] === 0x41 && buf[end - 126] === 0x47) {
        end -= 128;
    }
    return buf.subarray(start, end);
}

async function handleSequenceContinue(jobId: string): Promise<Response> {
    const job = await prisma.campaignJob.findUnique({
        where: { id: jobId },
        include: { campaign: { include: { template: true } } }
    });

    if (!job || job.status !== "processing") {
        return NextResponse.json({ success: true, message: "Job not in processing state, skipped" });
    }

    const campaign = (job as any).campaign;
    const config = await getWhatsAppConfig();
    if (!config || !config.isConfigured) {
        await prisma.campaignJob.update({ where: { id: jobId }, data: { status: "failed", errorMessage: "WhatsApp config missing" } });
        return NextResponse.json({ error: "WhatsApp config missing" }, { status: 500 });
    }

    const isTwilio = config.provider === "twilio";
    const audioConfig = JSON.parse(campaign.audioConfig || "{}");
    const mapping = JSON.parse(campaign.mapping || "{}");
    const contact = await prisma.whatsAppContact.findUnique({ where: { phone: job.phone } });

    const resolveField = (col: string): string => {
        if (!contact) return "";
        switch (col) {
            case "name": return (contact as any).name || "";
            case "phone": return (contact as any).phone || "";
            case "tags": try { return JSON.parse((contact as any).tags || "[]").join(", "); } catch { return ""; }
            case "source": return (contact as any).source || "";
            case "externalId": return (contact as any).externalId || "";
            default: return "";
        }
    };

    try {
        // 1. Generate + send audio
        // OPTIMIZATION: Cache audio by resolved text hash.
        // If multiple contacts have the same name, audio is generated ONCE and reused.
        let audioPrompt = audioConfig.prompt || "";
        for (const [varKey, col] of Object.entries(mapping)) {
            audioPrompt = audioPrompt.replace(new RegExp(`\\{${varKey}\\}`, 'g'), resolveField(col as string));
        }

        const crypto = await import("crypto");

        if (audioConfig.preRecordedAudioUrl) {
            // IA + GRABADO MODE: Generate AI greeting as MP3, concatenate with pre-recorded MP3
            // MP3 frames are self-contained, so Buffer.concat produces a valid MP3 file
            const greetingHash = crypto.createHash("sha256").update(`mp3:${audioPrompt}`).digest("hex").substring(0, 32);

            let greetingBuffer: Buffer;
            const cachedGreeting = await prisma.audioMessageCache.findUnique({ where: { hash: greetingHash } });
            if (cachedGreeting) {
                greetingBuffer = Buffer.from(cachedGreeting.mediaUrl, 'base64');
            } else {
                // Generate AI greeting in MP3 format (concatenation-friendly)
                const result = await withRetry(
                    () => generateAudio(audioPrompt, audioConfig.voiceId, undefined, "mp3_44100_128"),
                    3, 2000
                );
                greetingBuffer = result.audioBuffer;
                await prisma.audioMessageCache.upsert({
                    where: { hash: greetingHash },
                    update: { mediaUrl: greetingBuffer.toString("base64") },
                    create: { hash: greetingHash, mediaUrl: greetingBuffer.toString("base64"), expiresAt: new Date(Date.now() + 86400000) },
                });
            }

            // Load pre-recorded audio directly from DB (avoid serverless-to-serverless fetch)
            let preRecordedBuffer: Buffer;
            const preRecHash = crypto.createHash("sha256").update(`prerec:${audioConfig.preRecordedAudioUrl}`).digest("hex").substring(0, 32);
            const cachedPreRec = await prisma.audioMessageCache.findUnique({ where: { hash: preRecHash } });
            if (cachedPreRec) {
                preRecordedBuffer = Buffer.from(cachedPreRec.mediaUrl, 'base64');
            } else {
                // Extract hash from the media-cache URL and read directly from DB
                const urlParts = audioConfig.preRecordedAudioUrl.split("/");
                const mediaCacheHash = urlParts[urlParts.length - 1].replace(/\.[^.]+$/, "");
                const mediaEntry = await (prisma as any).mediaCache.findUnique({ where: { hash: mediaCacheHash } });

                if (mediaEntry && mediaEntry.data) {
                    preRecordedBuffer = Buffer.from(mediaEntry.data, 'base64');
                } else {
                    // Fallback: try HTTP fetch
                    const preRecRes = await fetch(audioConfig.preRecordedAudioUrl);
                    if (!preRecRes.ok) throw new Error("No se pudo obtener el audio pregrabado");
                    preRecordedBuffer = Buffer.from(await preRecRes.arrayBuffer());
                }

                // Cache in audioMessageCache for faster access on subsequent jobs
                await prisma.audioMessageCache.upsert({
                    where: { hash: preRecHash },
                    update: { mediaUrl: preRecordedBuffer.toString("base64") },
                    create: { hash: preRecHash, mediaUrl: preRecordedBuffer.toString("base64"), expiresAt: new Date(Date.now() + 86400000) },
                });
            }

            // Concatenate: strip ID3 headers for clean MP3 concat
            const combinedBuffer = Buffer.concat([stripMp3Headers(greetingBuffer), stripMp3Headers(preRecordedBuffer)]);
            await sendAudioToContact(config, isTwilio, job.phone, combinedBuffer, 'mp3');

        } else {
            // FULL AI MODE: Generate complete audio in OGG Opus (voice note)
            const textHash = crypto.createHash("sha256").update(audioPrompt).digest("hex").substring(0, 32);
            const cachedAudio = await prisma.audioMessageCache.findUnique({ where: { hash: textHash } });

            let audioBuffer: Buffer;
            if (cachedAudio) {
                audioBuffer = Buffer.from(cachedAudio.mediaUrl, 'base64');
            } else {
                const result = await withRetry(
                    () => generateAudioForWhatsApp(audioPrompt, audioConfig.voiceId),
                    3, 2000
                );
                audioBuffer = result.audioBuffer;
                await prisma.audioMessageCache.upsert({
                    where: { hash: textHash },
                    update: { mediaUrl: audioBuffer.toString("base64") },
                    create: { hash: textHash, mediaUrl: audioBuffer.toString("base64"), expiresAt: new Date(Date.now() + 86400000) },
                });
            }
            await sendAudioToContact(config, isTwilio, job.phone, audioBuffer);
        }

        // 2b. Sleep 3s then send image
        await sleep(3000);

        if (audioConfig.imageUrl) {
            let imageUrl = audioConfig.imageUrl;
            let caption = audioConfig.imageCaption || "";
            for (const [varKey, col] of Object.entries(mapping)) {
                caption = caption.replace(new RegExp(`\\{${varKey}\\}`, 'g'), resolveField(col as string));
            }

            if (isTwilio) {
                const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
                if (!imageUrl.startsWith(`${appUrl}/api/media-cache`)) {
                    // Download and cache image ONCE, then update campaign config
                    // so all subsequent jobs skip this download
                    const imgRes = await fetch(imageUrl);
                    if (imgRes.ok) {
                        const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
                        const buffer = Buffer.from(await imgRes.arrayBuffer());
                        const crypto = await import("crypto");
                        const hash = crypto.createHash("sha256").update(buffer).digest("hex");
                        await (prisma as any).mediaCache.upsert({
                            where: { hash }, update: {},
                            create: { hash, mimeType, data: buffer.toString("base64") },
                        });
                        imageUrl = `${appUrl}/api/media-cache/${hash}`;

                        // Persist cached URL so other jobs skip downloading
                        const updatedAudioConfig = { ...audioConfig, imageUrl };
                        await prisma.whatsAppCampaign.update({
                            where: { id: campaign.id },
                            data: { audioConfig: JSON.stringify(updatedAudioConfig) },
                        });
                    }
                }
                const apiBody: Record<string, string> = {
                    From: `whatsapp:${config.twilioNumber}`,
                    To: `whatsapp:${job.phone}`,
                    MediaUrl: imageUrl,
                };
                if (caption) apiBody.Body = caption;
                await callTwilioAPI(config, apiBody);
            } else {
                await sendWhatsAppImage(job.phone, imageUrl, caption);
            }
        }

        // 3. Mark job sent + update stats
        await prisma.campaignJob.update({
            where: { id: jobId },
            data: { status: "sent", processedAt: new Date() }
        });

        try {
            await prisma.whatsAppMessage.create({
                data: {
                    direction: "outbound",
                    phone: job.phone,
                    content: `[Secuencia audio - ${campaign.name}]`,
                    type: "audio",
                    status: "sent",
                    timestamp: new Date(),
                }
            });
            if (audioConfig.imageUrl) {
                await prisma.whatsAppMessage.create({
                    data: {
                        direction: "outbound",
                        phone: job.phone,
                        content: `[Secuencia imagen - ${campaign.name}]`,
                        type: "image",
                        status: "sent",
                        timestamp: new Date(),
                    }
                });
            }
        } catch (_) { }

        const prevStats = JSON.parse(campaign.stats || "{}");
        prevStats.sent = (prevStats.sent || 0) + 1;
        await prisma.whatsAppCampaign.update({
            where: { id: campaign.id },
            data: { stats: JSON.stringify(prevStats) }
        });

        // 4. Expire stale awaiting_reply jobs (> 5h) and check completion
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const expired = await prisma.campaignJob.updateMany({
            where: {
                campaignId: campaign.id,
                status: "awaiting_reply",
                processedAt: { lt: fiveHoursAgo },
            },
            data: { status: "expired" },
        });
        if (expired.count > 0) {
            // Update stats with expired count
            const freshCampaign = await prisma.whatsAppCampaign.findUnique({ where: { id: campaign.id } });
            if (freshCampaign) {
                const stats = JSON.parse(freshCampaign.stats || "{}");
                stats.expired = (stats.expired || 0) + expired.count;
                await prisma.whatsAppCampaign.update({
                    where: { id: campaign.id },
                    data: { stats: JSON.stringify(stats) },
                });
            }
        }

        const remaining = await prisma.campaignJob.count({
            where: { campaignId: campaign.id, status: { in: ["pending", "awaiting_reply", "processing"] } }
        });
        if (remaining === 0) {
            await prisma.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
        }

        return NextResponse.json({ success: true, message: "Sequence continuation completed" });
    } catch (err: any) {
        await prisma.campaignJob.update({
            where: { id: jobId },
            data: { status: "failed", errorMessage: err.message, processedAt: new Date() }
        });
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(async (req: Request) => {
    try {
        const body = await req.json();
        const { campaignId, batchSize = 50, action, jobId } = body;

        // Route sequence continuation
        if (action === "sequence_continue" && jobId) {
            return await handleSequenceContinue(jobId);
        }

        if (!campaignId) return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });

        const campaign = await prisma.whatsAppCampaign.findUnique({
            where: { id: campaignId },
            include: { template: true }
        });

        if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

        if (campaign.status !== 'running') {
            return NextResponse.json({ success: true, message: `Abortado por estado ${campaign.status}` });
        }

        const pendingJobs = await prisma.campaignJob.findMany({
            where: { campaignId, status: "pending" },
            take: batchSize,
        });

        if (pendingJobs.length === 0) {
            // For sequence campaigns, check if awaiting_reply jobs remain
            if (campaign.type === "sequence") {
                const awaitingCount = await prisma.campaignJob.count({
                    where: { campaignId, status: { in: ["awaiting_reply", "processing"] } }
                });
                if (awaitingCount > 0) {
                    return NextResponse.json({ success: true, message: `Sequence running: ${awaitingCount} jobs awaiting reply` });
                }
            }
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: { status: "completed" }
            });
            return NextResponse.json({ success: true, message: "Campaign Completed" });
        }

        const config = await getWhatsAppConfig();
        if (!config || !config.isConfigured) throw new Error("Config WhatsApp faltante");

        const isTwilio = config.provider === "twilio";

        const phones = pendingJobs.map(j => j.phone);
        const contacts = await prisma.whatsAppContact.findMany({
            where: { phone: { in: phones } },
        });
        const contactMap = new Map(contacts.map(c => [c.phone, c]));

        let successCount = 0;
        let failCount = 0;

        const mapping = JSON.parse(campaign.mapping || "{}");
        const isAudio = campaign.type === 'audio';
        const isImage = campaign.type === 'image';
        const isSequence = campaign.type === 'sequence';
        let audioConfig: any = null;
        let imageConfig: any = null;

        if (isAudio) {
            audioConfig = JSON.parse(campaign.audioConfig || "{}");
            const elConfig = await getElevenLabsConfig();
            if (!elConfig) throw new Error("Configuración ElevenLabs faltante para campaña de audio");
        }

        if (isImage) {
            imageConfig = JSON.parse(campaign.audioConfig || "{}");

            // If imageUrl is an external URL, download it and cache it in MediaCache
            // so Twilio always fetches from our domain (avoids "Media failed to download")
            const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
            if (imageConfig.imageUrl && !imageConfig.imageUrl.startsWith(`${appUrl}/api/media-cache`)) {
                try {
                    const imgRes = await fetch(imageConfig.imageUrl);
                    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status} al descargar imagen`);
                    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    const crypto = await import("crypto");
                    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

                    await (prisma as any).mediaCache.upsert({
                        where: { hash },
                        update: {},
                        create: { hash, mimeType, data: buffer.toString("base64") },
                    });

                    imageConfig.imageUrl = `${appUrl}/api/media-cache/${hash}`;

                    // Persist so subsequent batches also use the cached URL
                    await prisma.whatsAppCampaign.update({
                        where: { id: campaignId },
                        data: { audioConfig: JSON.stringify(imageConfig) },
                    });
                } catch (err: any) {
                    throw new Error(`No se pudo descargar la imagen de la URL: ${err.message}`);
                }
            }
        }

        // Texto del template (usado por Twilio y para contar variables)
        const parsedComponents = campaign.template?.components ? JSON.parse(campaign.template.components) : [];
        const templateBodyText = parsedComponents.find((c: any) => c.type === 'BODY')?.text || "";

        const resolveContactField = (contact: any, columnMapped: string): string => {
            if (!contact) return "";
            switch (columnMapped) {
                case "name": return contact.name || "";
                case "phone": return contact.phone || "";
                case "tags": {
                    try { return JSON.parse(contact.tags || "[]").join(", "); } catch { return ""; }
                }
                case "source": return contact.source || "";
                case "externalId": return contact.externalId || "";
                default: return "";
            }
        };

        for (let i = 0; i < pendingJobs.length; i++) {
            const job = pendingJobs[i];
            const contact = contactMap.get(job.phone) || null;

            try {
                let messageId = "";
                let twilioPrice = 0;

                if (isAudio) {
                    let prompt = audioConfig.prompt || "";
                    for (const [varKey, columnMapped] of Object.entries(mapping)) {
                        const val = resolveContactField(contact, columnMapped as string);
                        prompt = prompt.replace(new RegExp(`\\{${varKey}\\}`, 'g'), val);
                    }

                    let finalAudioBuffer: Buffer;

                    if (audioConfig.preRecordedAudioUrl) {
                        // IA + GRABADO: Generate AI greeting as MP3, concat with pre-recorded
                        const crypto = await import("crypto");

                        // Generate or retrieve cached AI greeting (MP3)
                        const greetingHash = crypto.createHash("sha256").update(`mp3:${prompt}`).digest("hex").substring(0, 32);
                        let greetingBuf: Buffer;
                        const cachedGreet = await prisma.audioMessageCache.findUnique({ where: { hash: greetingHash } });
                        if (cachedGreet) {
                            greetingBuf = Buffer.from(cachedGreet.mediaUrl, 'base64');
                        } else {
                            const result = await withRetry(
                                () => generateAudio(prompt, audioConfig.voiceId, undefined, "mp3_44100_128"),
                                3, 2000
                            );
                            greetingBuf = result.audioBuffer;
                            await prisma.audioMessageCache.upsert({
                                where: { hash: greetingHash },
                                update: { mediaUrl: greetingBuf.toString("base64") },
                                create: { hash: greetingHash, mediaUrl: greetingBuf.toString("base64"), expiresAt: new Date(Date.now() + 86400000) },
                            });
                        }

                        // Download or retrieve cached pre-recorded audio
                        const preRecHash = crypto.createHash("sha256").update(`prerec:${audioConfig.preRecordedAudioUrl}`).digest("hex").substring(0, 32);
                        let preRecBuf: Buffer;
                        const cachedPreRec = await prisma.audioMessageCache.findUnique({ where: { hash: preRecHash } });
                        if (cachedPreRec) {
                            preRecBuf = Buffer.from(cachedPreRec.mediaUrl, 'base64');
                        } else {
                            // Read directly from MediaCache DB
                            const urlParts = audioConfig.preRecordedAudioUrl.split("/");
                            const mediaCacheHash = urlParts[urlParts.length - 1].replace(/\.[^.]+$/, "");
                            const mediaEntry = await (prisma as any).mediaCache.findUnique({ where: { hash: mediaCacheHash } });

                            if (mediaEntry && mediaEntry.data) {
                                preRecBuf = Buffer.from(mediaEntry.data, 'base64');
                            } else {
                                const preRecRes = await fetch(audioConfig.preRecordedAudioUrl);
                                if (!preRecRes.ok) throw new Error("No se pudo obtener el audio pregrabado");
                                preRecBuf = Buffer.from(await preRecRes.arrayBuffer());
                            }

                            await prisma.audioMessageCache.upsert({
                                where: { hash: preRecHash },
                                update: { mediaUrl: preRecBuf.toString("base64") },
                                create: { hash: preRecHash, mediaUrl: preRecBuf.toString("base64"), expiresAt: new Date(Date.now() + 86400000) },
                            });
                        }

                        // Concatenate: strip ID3 headers for clean MP3 concat
                        finalAudioBuffer = Buffer.concat([stripMp3Headers(greetingBuf), stripMp3Headers(preRecBuf)]);
                    } else {
                        // Full AI: generate complete audio as OGG Opus
                        const result = await withRetry(
                            () => generateAudioForWhatsApp(prompt, audioConfig.voiceId),
                            3, 2000
                        );
                        finalAudioBuffer = result.audioBuffer;
                    }

                    // Send the audio
                    if (isTwilio) {
                        const crypto = await import("crypto");
                        const hash = crypto.createHash("sha256")
                            .update(finalAudioBuffer)
                            .digest("hex")
                            .substring(0, 32);

                        const mimeType = audioConfig.preRecordedAudioUrl ? 'audio/mpeg' : 'audio/ogg';
                        // Use media-cache (same as images) — audio-cache causes Twilio error 63021
                        await (prisma as any).mediaCache.upsert({
                            where: { hash },
                            update: {},
                            create: { hash, mimeType, data: finalAudioBuffer.toString("base64") },
                        });

                        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
                        const audioUrl = `${appUrl}/api/media-cache/${hash}`;

                        const data = await callTwilioAPI(config, {
                            From: `whatsapp:${config.twilioNumber}`,
                            To: `whatsapp:${job.phone}`,
                            MediaUrl: audioUrl,
                        });
                        messageId = data?.sid || "";
                        twilioPrice = Math.abs(parseFloat(data?.price || "0"));
                    } else {
                        const mimeType = audioConfig.preRecordedAudioUrl ? 'audio/mpeg' : 'audio/ogg';
                        const mediaId = await uploadMediaToWhatsApp(finalAudioBuffer, mimeType);
                        const data = await sendWhatsAppAudio(job.phone, mediaId);
                        if (data.messages && data.messages.length > 0) {
                            messageId = data.messages[0].id;
                        } else {
                            throw new Error("No message ID returned (Audio)");
                        }
                    }

                } else if (isImage) {
                    let caption = imageConfig.caption || "";
                    for (const [varKey, columnMapped] of Object.entries(mapping)) {
                        const val = resolveContactField(contact, columnMapped as string);
                        caption = caption.replace(new RegExp(`\\{${varKey}\\}`, 'g'), val);
                    }
                    if (isTwilio) {
                        const apiBody: Record<string, string> = {
                            From: `whatsapp:${config.twilioNumber}`,
                            To: `whatsapp:${job.phone}`,
                            MediaUrl: imageConfig.imageUrl,
                        };
                        if (caption) apiBody.Body = caption;
                        const data = await callTwilioAPI(config, apiBody);
                        messageId = data?.sid || "";
                        twilioPrice = Math.abs(parseFloat(data?.price || "0"));
                    } else {
                        const data = await sendWhatsAppImage(job.phone, imageConfig.imageUrl, caption);
                        if (data.messages && data.messages.length > 0) {
                            messageId = data.messages[0].id;
                        } else {
                            throw new Error("No message ID returned (Image)");
                        }
                    }

                } else if (isTwilio) {
                    const templateWabaId = campaign.template?.wabaId;
                    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b));

                    if (templateWabaId?.startsWith("HX")) {
                        // Use ContentSid — works outside 24h window
                        const vars: Record<string, string> = {};
                        sortedEntries.forEach(([, col], i) => {
                            vars[String(i + 1)] = resolveContactField(contact, col as string) || "Usuario";
                        });
                        const apiBody: Record<string, string> = {
                            From: `whatsapp:${config.twilioNumber}`,
                            To: `whatsapp:${job.phone}`,
                            ContentSid: templateWabaId,
                        };
                        if (Object.keys(vars).length > 0) {
                            apiBody.ContentVariables = JSON.stringify(vars);
                        }
                        const data = await callTwilioAPI(config, apiBody);
                        messageId = data.sid || "";
                        twilioPrice = Math.abs(parseFloat(data.price || "0"));
                    } else {
                        // Fallback: plain text substitution (within 24h window only)
                        let text = templateBodyText || campaign.template?.name || "";
                        const bodyParams: string[] = sortedEntries.map(([, col]) => resolveContactField(contact, col as string) || "Usuario");
                        const requiredVarsCount = new Set(templateBodyText.match(/\{\{\d+\}\}/g) || []).size;
                        while (bodyParams.length < requiredVarsCount) bodyParams.push("...");
                        bodyParams.forEach((val, i) => { text = text.replace(`{{${i + 1}}}`, val); });
                        const data = await callTwilioAPI(config, {
                            From: `whatsapp:${config.twilioNumber}`,
                            To: `whatsapp:${job.phone}`,
                            Body: text,
                        });
                        messageId = data.sid || "";
                        twilioPrice = Math.abs(parseFloat(data.price || "0"));
                    }

                } else {
                    // Meta template
                    const componentsParam: any[] = [];
                    const bodyParams: any[] = [];

                    const allNamedParams: { componentType: string, param_name: string }[] = [];
                    for (const comp of parsedComponents) {
                        const namedParams = comp.example?.header_text_named_params || comp.example?.body_text_named_params || [];
                        for (const p of namedParams) {
                            if (p.param_name) allNamedParams.push({ componentType: comp.type, param_name: p.param_name });
                        }
                    }

                    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b));
                    let paramIdx = 0;
                    for (const [, columnMapped] of sortedEntries) {
                        const val = resolveContactField(contact, columnMapped as string);
                        const paramInfo = allNamedParams[paramIdx];
                        bodyParams.push({
                            type: "text",
                            parameter_name: paramInfo?.param_name || String(paramIdx + 1),
                            text: val || "Usuario"
                        });
                        paramIdx++;
                    }
                    while (bodyParams.length < allNamedParams.length) {
                        const paramInfo = allNamedParams[bodyParams.length];
                        bodyParams.push({
                            type: "text",
                            parameter_name: paramInfo?.param_name || String(bodyParams.length + 1),
                            text: "..."
                        });
                    }

                    const headerParams = bodyParams.filter((_: any, i: number) => allNamedParams[i]?.componentType === 'HEADER');
                    const realBodyParams = bodyParams.filter((_: any, i: number) => allNamedParams[i]?.componentType === 'BODY' || !allNamedParams[i]);
                    if (headerParams.length > 0) componentsParam.push({ type: "header", parameters: headerParams });
                    if (realBodyParams.length > 0) componentsParam.push({ type: "body", parameters: realBodyParams });

                    for (const comp of parsedComponents) {
                        if (comp.type === 'BUTTONS' && comp.buttons) {
                            comp.buttons.forEach((btn: any, idx: number) => {
                                if (btn.type === 'FLOW') {
                                    componentsParam.push({ type: "button", sub_type: "flow", index: String(idx), parameters: [] });
                                }
                            });
                        }
                    }

                    const payload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: job.phone,
                        type: "template",
                        template: {
                            name: campaign.template?.name,
                            language: { code: campaign.template?.language || 'es' },
                            ...(componentsParam.length > 0 && { components: componentsParam })
                        }
                    };

                    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${config.apiToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (res.ok && data.messages) {
                        messageId = data.messages[0].id;
                    } else {
                        throw new Error(data.error?.message || "Meta API Error");
                    }
                }

                // Sequence campaigns: after sending template, wait for reply
                const jobStatus = isSequence ? 'awaiting_reply' : 'sent';
                await prisma.campaignJob.update({
                    where: { id: job.id },
                    data: { status: jobStatus, messageId: messageId || undefined, processedAt: new Date() }
                });

                let msgContent = `[Campaña: ${campaign.name}]`;
                if (isAudio) msgContent = `[Audio IA - ${campaign.name}]`;
                else if (isImage) msgContent = `[Imagen - ${campaign.name}]`;
                else if (isSequence) msgContent = `[Secuencia (template) - ${campaign.name}]`;
                else if (campaign.template?.name) msgContent = `[Template: ${campaign.template.name}]`;

                try {
                    await prisma.whatsAppMessage.create({
                        data: {
                            messageId: messageId || undefined,
                            direction: "outbound",
                            phone: job.phone,
                            content: msgContent,
                            type: isAudio ? "audio" : isImage ? "image" : "template",
                            status: "sent",
                            timestamp: new Date(),
                        }
                    });
                } catch (_) { }

                const provider = isTwilio ? "twilio" : "whatsapp";
                const templateCategory = (campaign.template?.category || "UTILITY").toUpperCase();
                const estimatedMsgCost = templateCategory === "MARKETING" ? 0.0615
                    : templateCategory === "AUTHENTICATION" ? 0.0325
                        : templateCategory === "UTILITY" ? 0.0200
                            : 0.0085;
                await logApiUsage(
                    provider,
                    isAudio ? "send_audio" : isImage ? "send_image" : isSequence ? "sequence_template" : "bulk_template",
                    1,
                    isImage ? 0 : isTwilio ? (twilioPrice || estimatedMsgCost) : estimatedMsgCost,
                    { phone: job.phone, campaignId, messageId, provider, category: templateCategory }
                );
                successCount++;

            } catch (err: any) {
                await prisma.campaignJob.update({
                    where: { id: job.id },
                    data: { status: 'failed', errorMessage: err.message, processedAt: new Date() }
                });
                failCount++;
            }

            if (i < pendingJobs.length - 1) {
                await sleep(THROTTLE_MS);
            }
        }

        const prevStats = JSON.parse(campaign.stats || "{}");
        prevStats.sent = (prevStats.sent || 0) + successCount;
        prevStats.failed = (prevStats.failed || 0) + failCount;

        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { stats: JSON.stringify(prevStats) }
        });

        const webhookUrl = process.env.UPSTASH_WEBHOOK_URL;
        if (process.env.QSTASH_TOKEN && webhookUrl) {
            await qstash.publishJSON({
                url: webhookUrl,
                body: { action: "process_batch", campaignId, batchSize }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Batch procesado: ${successCount} OK, ${failCount} Errors. Next batch queued.`
        });

    } catch (error: any) {
        console.error("Processor error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
