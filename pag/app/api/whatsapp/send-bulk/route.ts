import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
    sendWhatsAppTemplate,
    logWhatsApp,
    upsertContact,
} from "@/lib/whatsapp"
import { logApiUsage } from "@/lib/elevenlabs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { template, idioma, numeros, components: templateComponents } = body

        if (!template) {
            return NextResponse.json({ error: "Template requerido" }, { status: 400 })
        }

        if (!numeros || !Array.isArray(numeros) || numeros.length === 0) {
            return NextResponse.json({ error: "Se requiere al menos un número" }, { status: 400 })
        }

        // Clean and validate numbers
        const cleanNumbers = numeros
            .map((n: string) => n.replace(/[^0-9]/g, "").trim())
            .filter((n: string) => n.length >= 10)

        if (cleanNumbers.length === 0) {
            return NextResponse.json({ error: "No se encontraron números válidos" }, { status: 400 })
        }

        const results: Array<{ numero: string; success: boolean; error?: string; messageId?: string }> = []

        for (let i = 0; i < cleanNumbers.length; i++) {
            const numero = cleanNumbers[i]
            try {
                const validComponents = Array.isArray(templateComponents) && templateComponents.length > 0 ? templateComponents : undefined
                const result = await sendWhatsAppTemplate(numero, template, idioma || "es", validComponents)
                const msgId = result?.messages?.[0]?.id || null

                // Save outbound message
                await prisma.whatsAppMessage.create({
                    data: {
                        messageId: msgId,
                        direction: "outbound",
                        phone: numero,
                        content: `[Template: ${template}]`,
                        type: "template",
                        status: "sent",
                        timestamp: new Date(),
                    },
                })

                await upsertContact(numero)

                // Calculate estimated cost based on template category
                const templateRecord = await prisma.whatsAppTemplate.findFirst({ where: { name: template } })
                const category = (templateRecord?.category || "UTILITY").toUpperCase()
                const estimatedCost = category === "MARKETING" ? 0.0615
                    : category === "AUTHENTICATION" ? 0.0325
                        : category === "UTILITY" ? 0.0200
                            : 0.0085 // service/other

                // Log usage
                await logApiUsage("whatsapp", "bulk_template", 1, estimatedCost, {
                    template,
                    numero,
                    category,
                    batchIndex: i + 1,
                    batchTotal: cleanNumbers.length,
                })

                results.push({ numero, success: true, messageId: msgId })
            } catch (error: any) {
                results.push({ numero, success: false, error: error.message })
            }

            // Delay between sends (1 second) to avoid rate limiting
            if (i < cleanNumbers.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }

        const enviados = results.filter((r) => r.success).length
        const errores = results.filter((r) => !r.success).length

        await logWhatsApp("bulk_send", {
            template,
            total: cleanNumbers.length,
            enviados,
            errores,
        })

        return NextResponse.json({
            success: true,
            total: cleanNumbers.length,
            enviados,
            errores,
            detalles: results,
        })
    } catch (error: any) {
        await logWhatsApp("bulk_send_error", { error: error.message })
        return NextResponse.json(
            { error: error.message || "Error al enviar masivo" },
            { status: 500 }
        )
    }
}
