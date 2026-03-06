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
import { callTwilioWithSender } from "@/lib/sender-pool"
import { decrypt } from "@/lib/whatsapp"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { tipo, numero, template, idioma, mensaje, components: templateComponents, senderId } = body

        if (!numero) {
            return NextResponse.json({ error: "Número requerido" }, { status: 400 })
        }

        let result: any
        let content: string

        // If a specific senderId is provided and it's not 'global', use that sender
        if (senderId && senderId !== 'global') {
            const sender = await prisma.twilioSender.findUnique({ where: { id: senderId } })
            if (!sender) {
                return NextResponse.json({ error: "Sender no encontrado" }, { status: 404 })
            }

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
            }

            if (tipo === "template") {
                if (!template) {
                    return NextResponse.json({ error: "Template requerido" }, { status: 400 })
                }
                // Lookup template for ContentSid
                const dbTemplate = await prisma.whatsAppTemplate.findFirst({
                    where: { name: template },
                    select: { wabaId: true, bodyText: true },
                })

                const apiBody: Record<string, string> = {
                    To: `whatsapp:${numero}`,
                }

                if (dbTemplate?.wabaId?.startsWith("HX")) {
                    apiBody.ContentSid = dbTemplate.wabaId
                    const bodyComp = (templateComponents || []).find((c: any) => c.type === "body")
                    if (bodyComp?.parameters?.length) {
                        const vars: Record<string, string> = {}
                        bodyComp.parameters.forEach((p: any, i: number) => { vars[String(i + 1)] = p.text || "" })
                        apiBody.ContentVariables = JSON.stringify(vars)
                    }
                } else {
                    let text = dbTemplate?.bodyText || template
                    const bodyComp = (templateComponents || []).find((c: any) => c.type === "body")
                    if (bodyComp?.parameters?.length) {
                        bodyComp.parameters.forEach((p: any, i: number) => {
                            text = text.replace(`{{${i + 1}}}`, p.text || "")
                        })
                    }
                    apiBody.Body = text
                }

                result = await callTwilioWithSender(senderConfig, apiBody)
                content = `[Template: ${template}]`
            } else {
                if (!mensaje) {
                    return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
                }
                result = await callTwilioWithSender(senderConfig, {
                    To: `whatsapp:${numero}`,
                    Body: mensaje,
                })
                content = mensaje
            }

            // Update sender stats
            await prisma.twilioSender.update({
                where: { id: senderId },
                data: {
                    sentToday: { increment: 1 },
                    totalSent: { increment: 1 },
                    lastUsedAt: new Date(),
                },
            })
        } else {
            // Use global config (existing behavior)
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
