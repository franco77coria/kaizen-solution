import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client } from "@upstash/qstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { generateAudioForWhatsApp, getElevenLabsConfig } from "@/lib/elevenlabs";
import { uploadMediaToWhatsApp, sendWhatsAppAudio, getWhatsAppConfig } from "@/lib/whatsapp";

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
});

// Este endpoint DEBE ser llamado por QStash. Usamos verifySignatureAppRouter para seguridad criptográfica.
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

        // Safety check: Si fue pausada o cancelada después de encolarla
        if (campaign.status !== 'running') {
            console.log(`Campaña ${campaign.id} ignorada por estado: ${campaign.status}`);
            return NextResponse.json({ success: true, message: `Abortado por estado ${campaign.status}` });
        }

        // Buscar trabajos pendientes (LIMIT = batchSize)
        const pendingJobs = await prisma.campaignJob.findMany({
            where: { campaignId, status: "pending" },
            take: batchSize,
            include: {
                campaign: { include: { list: { include: { subscribers: { include: { contact: true } } } } } }
            }
        });

        // Si ya no hay pendientes, marcamos completada
        if (pendingJobs.length === 0) {
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: { status: "completed" }
            });
            console.log(`Campaña ${campaign.id} finalizada exitosamente.`);
            return NextResponse.json({ success: true, message: "Campaign Completed" });
        }

        // Config de WhatsApp
        const config = await getWhatsAppConfig();
        if (!config || !config.apiToken) throw new Error("Config WhatsApp faltante");

        let successCount = 0;
        let failCount = 0;

        // TODO: Recuperar el mapa de variables y cruzar los datos
        const mapping = JSON.parse(campaign.mapping || "{}");
        const isAudio = campaign.type === 'audio';
        let audioConfig: any = null;

        if (isAudio) {
            audioConfig = JSON.parse(campaign.audioConfig || "{}");
            const elConfig = await getElevenLabsConfig();
            if (!elConfig) throw new Error("Configuración ElevenLabs faltante para campaña de audio");
        }

        const resolveContactField = (subscriber: any, columnMapped: string): string => {
            if (!subscriber) return "";
            const contact = subscriber.contact;
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

        for (const job of pendingJobs) {
            const subscriber = job.campaign.list.subscribers.find((s: any) => s.contact.phone === job.phone);

            try {
                let messageId = "";

                if (isAudio) {
                    let prompt = audioConfig.prompt || "";
                    for (const [varKey, columnMapped] of Object.entries(mapping)) {
                        const val = resolveContactField(subscriber, columnMapped as string);
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
                } else {
                    const componentsParam: any[] = [];
                    const bodyParams: any[] = [];

                    const parsedComponents = campaign.template?.components ? JSON.parse(campaign.template.components) : [];

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
                        const val = resolveContactField(subscriber, columnMapped as string);
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
                    if (headerParams.length > 0) {
                        componentsParam.push({ type: "header", parameters: headerParams });
                    }
                    if (realBodyParams.length > 0) {
                        componentsParam.push({ type: "body", parameters: realBodyParams });
                    }

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

                // Job Exitoso
                await prisma.campaignJob.update({
                    where: { id: job.id },
                    data: { status: 'sent', messageId: messageId, processedAt: new Date() }
                });
                successCount++;

            } catch (err: any) {
                await prisma.campaignJob.update({
                    where: { id: job.id },
                    data: { status: 'failed', errorMessage: err.message, processedAt: new Date() }
                });
                failCount++;
            }
        }

        // Actualizar Stats de Campaña
        const prevStats = JSON.parse(campaign.stats || "{}");
        prevStats.sent = (prevStats.sent || 0) + successCount;
        prevStats.failed = (prevStats.failed || 0) + failCount;

        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { stats: JSON.stringify(prevStats) }
        });

        // Encolar siguiente lote si el Qstash env no está vacío
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
