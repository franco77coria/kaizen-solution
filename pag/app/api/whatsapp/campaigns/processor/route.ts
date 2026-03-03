import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generateAudioForWhatsApp, getElevenLabsConfig, logApiUsage } from "@/lib/elevenlabs";
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

export const POST = verifySignatureAppRouter(async (req: Request) => {
    try {
        const body = await req.json();
        const { campaignId, batchSize = 50 } = body;

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
        let audioConfig: any = null;
        let imageConfig: any = null;

        if (isAudio) {
            if (isTwilio) {
                await prisma.whatsAppCampaign.update({
                    where: { id: campaignId },
                    data: { status: "failed" }
                });
                return NextResponse.json({ error: "Campañas de audio no soportadas con proveedor Twilio" }, { status: 400 });
            }
            audioConfig = JSON.parse(campaign.audioConfig || "{}");
            const elConfig = await getElevenLabsConfig();
            if (!elConfig) throw new Error("Configuración ElevenLabs faltante para campaña de audio");
        }

        if (isImage) {
            imageConfig = JSON.parse(campaign.audioConfig || "{}");
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

                if (isAudio) {
                    let prompt = audioConfig.prompt || "";
                    for (const [varKey, columnMapped] of Object.entries(mapping)) {
                        const val = resolveContactField(contact, columnMapped as string);
                        prompt = prompt.replace(new RegExp(`\\{${varKey}\\}`, 'g'), val);
                    }
                    const { audioBuffer } = await generateAudioForWhatsApp(prompt, audioConfig.voiceId);
                    const mediaId = await uploadMediaToWhatsApp(audioBuffer, 'audio/ogg');
                    const data = await sendWhatsAppAudio(job.phone, mediaId);
                    if (data.messages && data.messages.length > 0) {
                        messageId = data.messages[0].id;
                    } else {
                        throw new Error("No message ID returned (Audio)");
                    }

                } else if (isImage) {
                    let caption = imageConfig.caption || "";
                    for (const [varKey, columnMapped] of Object.entries(mapping)) {
                        const val = resolveContactField(contact, columnMapped as string);
                        caption = caption.replace(new RegExp(`\\{${varKey}\\}`, 'g'), val);
                    }
                    const data = await sendWhatsAppImage(job.phone, imageConfig.imageUrl, caption);
                    if (data.messages && data.messages.length > 0) {
                        messageId = data.messages[0].id;
                    } else {
                        throw new Error("No message ID returned (Image)");
                    }

                } else if (isTwilio) {
                    // Template → texto libre para Twilio
                    let text = templateBodyText || campaign.template?.name || "";
                    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b));
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

                await prisma.campaignJob.update({
                    where: { id: job.id },
                    data: { status: 'sent', messageId: messageId || undefined, processedAt: new Date() }
                });

                let msgContent = `[Campaña: ${campaign.name}]`;
                if (isAudio) msgContent = `[Audio IA - ${campaign.name}]`;
                else if (isImage) msgContent = `[Imagen - ${campaign.name}]`;
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
                } catch (_) {}

                const provider = isTwilio ? "twilio" : "whatsapp";
                await logApiUsage(
                    provider,
                    isAudio ? "send_audio" : isImage ? "send_image" : "bulk_template",
                    1,
                    isImage ? 0 : isTwilio ? 0.05 : 0.0773,
                    { phone: job.phone, campaignId, messageId, provider }
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
