import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadMediaToWhatsApp, getWhatsAppConfig } from "@/lib/whatsapp";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const formData = await req.formData();
        const numero = formData.get("numero") as string;
        const text = formData.get("text") as string;
        const file = formData.get("file") as File;

        if (!numero || !file) {
            return NextResponse.json({ error: "Faltan parámetros (numero, file)" }, { status: 400 });
        }

        const config = await getWhatsAppConfig();
        if (!config || !config.isConfigured) throw new Error("WhatsApp no configurado");

        // 1. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type;

        // 2. Upload to Meta
        const mediaId = await uploadMediaToWhatsApp(buffer, mimeType);

        // 3. Determine Msg Type
        let whatsappMsgType = "document";
        let mediaObject: any = { id: mediaId };

        if (mimeType.startsWith("image/")) {
            whatsappMsgType = "image";
        } else if (mimeType.startsWith("video/")) {
            whatsappMsgType = "video";
        } else if (mimeType.startsWith("audio/")) {
            whatsappMsgType = "audio";
        } else {
            mediaObject.filename = file.name || "documento";
        }

        if (text && whatsappMsgType !== "audio") {
            mediaObject.caption = text;
        }

        // 4. Send
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: numero,
            type: whatsappMsgType,
            [whatsappMsgType]: mediaObject
        };

        const res = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Guardar en BD
            const uiContent = `[Archivo: ${file.name}] ${text ? text : ''}`;
            await prisma.whatsAppMessage.create({
                data: {
                    messageId: data.messages[0].id,
                    phone: numero,
                    direction: "outbound",
                    type: whatsappMsgType,
                    content: uiContent.trim(),
                    status: "sent"
                }
            });

            return NextResponse.json({ success: true, messageId: data.messages[0].id });
        } else {
            console.error(data);
            return NextResponse.json({ error: data.error?.message || "Error Graph API" }, { status: 500 });
        }

    } catch (e: any) {
        console.error("Upload Media Error: ", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
