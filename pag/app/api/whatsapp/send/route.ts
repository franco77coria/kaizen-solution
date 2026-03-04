import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
    sendWhatsAppTemplate,
    sendWhatsAppText,
    logWhatsApp,
    upsertContact,
} from "@/lib/whatsapp"
import { logApiUsage } from "@/lib/elevenlabs"

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

        const isTwilioResult = !!(result?.sid && !result?.messages)
        const msgId = result?.messages?.[0]?.id || result?.sid || null

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

        // Calculate estimated cost based on template category
        let estimatedCost = 0.0085 // default: service/text conversation
        if (tipo === "template" && template) {
            const templateRecord = await prisma.whatsAppTemplate.findFirst({ where: { name: template } })
            const category = (templateRecord?.category || "UTILITY").toUpperCase()
            estimatedCost = category === "MARKETING" ? 0.0615
                : category === "AUTHENTICATION" ? 0.0325
                    : category === "UTILITY" ? 0.0200
                        : 0.0085
        }

        await logApiUsage(
            isTwilioResult ? "twilio" : "whatsapp",
            tipo === "template" ? "send_template" : "send_text",
            1,
            estimatedCost,
            { phone: numero, template: template || null, messageId: msgId }
        )

        return NextResponse.json({ success: true, messageId: msgId })
    } catch (error: any) {
        await logWhatsApp("send_error", { error: error.message })
        return NextResponse.json(
            { error: error.message || "Error al enviar" },
            { status: 500 }
        )
    }
}
