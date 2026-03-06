import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadMediaToWhatsApp, getWhatsAppConfig, callTwilioAPI, decrypt } from "@/lib/whatsapp";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { callTwilioWithSender } from "@/lib/sender-pool";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const formData = await req.formData();
        const numero = formData.get("numero") as string;
        const text = formData.get("text") as string;
        const file = formData.get("file") as File;
        const senderId = formData.get("senderId") as string | null;

        if (!numero || !file) {
            return NextResponse.json({ error: "Faltan parámetros (numero, file)" }, { status: 400 });
        }

        const config = await getWhatsAppConfig();
        if (!config || !config.isConfigured) throw new Error("WhatsApp no configurado");

        // 1. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type;

        // 2. Determine message type
        let whatsappMsgType = "document";
        if (mimeType.startsWith("image/")) whatsappMsgType = "image";
        else if (mimeType.startsWith("video/")) whatsappMsgType = "video";
        else if (mimeType.startsWith("audio/")) whatsappMsgType = "audio";

        let messageId: string | undefined;

        if (config.provider === "twilio") {
            // Twilio path: store file in MediaCache, serve publicly via /api/media-cache/[hash]
            const hash = crypto.createHash("sha256").update(buffer).digest("hex");
            const db = prisma as any;

            await db.mediaCache.upsert({
                where: { hash },
                update: {},
                create: {
                    hash,
                    mimeType,
                    data: buffer.toString("base64"),
                },
            });

            const baseUrl = process.env.NEXTAUTH_URL || "";
            const mediaUrl = `${baseUrl}/api/media-cache/${hash}`;

            const twilioBody: Record<string, string> = {
                To: `whatsapp:${numero}`,
                MediaUrl: mediaUrl,
            };
            if (text && whatsappMsgType !== "audio") {
                twilioBody.Body = text;
            }

            let twilioRes: any;
            if (senderId && senderId !== 'global') {
                const sender = await prisma.twilioSender.findUnique({ where: { id: senderId } });
                if (!sender) throw new Error("Sender no encontrado");

                const senderConfig = {
                    id: sender.id,
                    name: sender.name,
                    accountSid: decrypt(sender.accountSid),
                    authToken: decrypt(sender.authToken),
                    phoneNumber: sender.phoneNumber,
                    messagingServiceSid: sender.messagingServiceSid || undefined,
                    trustLevel: sender.trustLevel,
                    maxMps: sender.maxMps,
                    sentToday: sender.sentToday,
                    delayBetweenMs: Math.ceil(1000 / sender.maxMps),
                };

                twilioRes = await callTwilioWithSender(senderConfig, twilioBody);

                await prisma.twilioSender.update({
                    where: { id: senderId },
                    data: {
                        sentToday: { increment: 1 },
                        totalSent: { increment: 1 },
                        lastUsedAt: new Date(),
                    },
                });
            } else {
                twilioBody.From = `whatsapp:${config.twilioNumber}`;
                twilioRes = await callTwilioAPI(config, twilioBody);
            }
            messageId = twilioRes?.sid;

        } else {
            // Meta path: upload to Meta and send via Graph API
            const mediaId = await uploadMediaToWhatsApp(buffer, mimeType);

            let mediaObject: any = { id: mediaId };
            if (whatsappMsgType === "document") {
                mediaObject.filename = file.name || "documento";
            }
            if (text && whatsappMsgType !== "audio") {
                mediaObject.caption = text;
            }

            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: numero,
                type: whatsappMsgType,
                [whatsappMsgType]: mediaObject,
            };

            const res = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                console.error(data);
                return NextResponse.json({ error: data.error?.message || "Error Graph API" }, { status: 500 });
            }
            messageId = data.messages?.[0]?.id;
        }

        // 3. Save to DB
        const uiContent = `[Archivo: ${file.name}] ${text ? text : ""}`;
        await prisma.whatsAppMessage.create({
            data: {
                messageId: messageId || undefined,
                phone: numero,
                direction: "outbound",
                type: whatsappMsgType,
                content: uiContent.trim(),
                status: "sent",
            },
        });

        return NextResponse.json({ success: true, messageId });

    } catch (e: any) {
        console.error("Upload Media Error:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
