import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getWhatsAppConfig, logWhatsApp, upsertContact } from "@/lib/whatsapp"

// GET — Webhook verification from Meta
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    if (mode === "subscribe") {
        // Try to get verify token from DB, fallback to hardcoded
        let verifyToken = "kaizen_whatsapp_2026"
        try {
            const config = await getWhatsAppConfig()
            if (config?.verifyToken) verifyToken = config.verifyToken
        } catch {
            // DB not available, use default
        }

        if (token === verifyToken) {
            try { await logWhatsApp("webhook_verified", { mode, token: "***" }) } catch { }
            return new NextResponse(challenge, { status: 200 })
        }

        try { await logWhatsApp("webhook_verify_failed", { mode, token }) } catch { }
        return NextResponse.json({ error: "Token inválido" }, { status: 403 })
    }

    return NextResponse.json({ status: "WhatsApp webhook activo" })
}

// POST — Receive incoming messages from Meta
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        await logWhatsApp("webhook_received", body)

        const entry = body?.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value

        if (!value) {
            return NextResponse.json({ status: "no_data" })
        }

        // Handle status updates
        if (value.statuses) {
            for (const status of value.statuses) {
                await prisma.whatsAppMessage.updateMany({
                    where: { messageId: status.id },
                    data: { status: status.status },
                })
            }
        }

        // Handle incoming messages
        if (value.messages) {
            for (const msg of value.messages) {
                const contact = value.contacts?.find(
                    (c: any) => c.wa_id === msg.from
                )
                const contactName = contact?.profile?.name || null

                let content = ""
                switch (msg.type) {
                    case "text":
                        content = msg.text?.body || ""
                        break
                    case "image":
                        content = "[Imagen]" + (msg.image?.caption ? ": " + msg.image.caption : "")
                        break
                    case "audio":
                        content = "[Audio]"
                        break
                    case "video":
                        content = "[Video]"
                        break
                    case "document":
                        content = "[Documento]" + (msg.document?.filename ? ": " + msg.document.filename : "")
                        break
                    case "sticker":
                        content = "[Sticker]"
                        break
                    case "location":
                        content = `[Ubicación: ${msg.location?.latitude}, ${msg.location?.longitude}]`
                        break
                    case "reaction":
                        content = `[Reacción: ${msg.reaction?.emoji || ""}]`
                        break
                    default:
                        content = `[${msg.type || "desconocido"}]`
                }

                // Save message
                await prisma.whatsAppMessage.upsert({
                    where: { messageId: msg.id },
                    update: {},
                    create: {
                        messageId: msg.id,
                        direction: "inbound",
                        phone: msg.from,
                        contactName,
                        content,
                        type: msg.type || "text",
                        status: "received",
                        timestamp: new Date(parseInt(msg.timestamp) * 1000),
                    },
                })

                // Update contact
                await upsertContact(msg.from, contactName)
            }
        }

        return NextResponse.json({ status: "ok" })
    } catch (error: any) {
        await logWhatsApp("webhook_error", { error: error.message })
        return NextResponse.json({ status: "error" }, { status: 200 }) // Always 200 for Meta
    }
}
