import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
    sendWhatsAppTemplate,
    sendWhatsAppText,
    logWhatsApp,
    upsertContact,
} from "@/lib/whatsapp"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { tipo, numero, template, idioma, mensaje, components: templateComponents } = body

        if (!numero) {
            return NextResponse.json({ error: "Número requerido" }, { status: 400 })
        }

        let result: any
        let content: string

        if (tipo === "template") {
            if (!template) {
                return NextResponse.json({ error: "Template requerido" }, { status: 400 })
            }
            const validComponents = Array.isArray(templateComponents) && templateComponents.length > 0 ? templateComponents : undefined
            result = await sendWhatsAppTemplate(numero, template, idioma || "en_US", validComponents)
            content = `[Template: ${template}]`
        } else {
            if (!mensaje) {
                return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
            }
            result = await sendWhatsAppText(numero, mensaje)
            content = mensaje
        }

        const msgId = result?.messages?.[0]?.id || null

        // Save outbound message
        await prisma.whatsAppMessage.create({
            data: {
                messageId: msgId,
                direction: "outbound",
                phone: numero,
                content,
                type: tipo === "template" ? "template" : "text",
                status: "sent",
                timestamp: new Date(),
            },
        })

        // Update contact
        await upsertContact(numero)

        await logWhatsApp("message_sent", {
            tipo,
            numero,
            template,
            msgId,
        })

        return NextResponse.json({ success: true, messageId: msgId })
    } catch (error: any) {
        await logWhatsApp("send_error", { error: error.message })
        return NextResponse.json(
            { error: error.message || "Error al enviar" },
            { status: 500 }
        )
    }
}
