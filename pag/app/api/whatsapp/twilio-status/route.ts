import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logWhatsApp } from "@/lib/whatsapp"
import { logApiUsage } from "@/lib/elevenlabs"

// Twilio status → nuestro status
const STATUS_MAP: Record<string, string> = {
    queued: "pending",
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
    undelivered: "failed",
}

// POST — Twilio nos notifica el estado de cada mensaje enviado
export async function POST(request: NextRequest) {
    try {
        // Twilio envía application/x-www-form-urlencoded
        const text = await request.text()
        const params = new URLSearchParams(text)

        const messageSid = params.get("MessageSid") || params.get("SmsSid") || ""
        const rawStatus = params.get("MessageStatus") || params.get("SmsStatus") || ""
        const status = STATUS_MAP[rawStatus] || rawStatus
        const price = params.get("Price")         // e.g. "-0.005" (negative = charged)
        const priceUnit = params.get("PriceUnit") || "USD"

        if (!messageSid) {
            return new NextResponse("ok", { status: 200 })
        }

        await logWhatsApp("twilio_status_update", { messageSid, rawStatus, status, price, priceUnit })

        // Log the REAL Twilio price when available
        if (price && price !== "null" && parseFloat(price) !== 0) {
            const realCost = Math.abs(parseFloat(price))
            await logApiUsage("twilio", "real_cost", 1, realCost, {
                messageSid, status: rawStatus, priceUnit,
            })
            console.log(`[Twilio Price] ${messageSid} → $${realCost} ${priceUnit}`)
        }

        // Actualizar mensajes individuales
        await prisma.whatsAppMessage.updateMany({
            where: { messageId: messageSid },
            data: { status },
        })

        // Actualizar jobs de campañas y propagar stats si es delivered/read/failed
        const jobs = await prisma.campaignJob.findMany({
            where: { messageId: messageSid },
        })

        if (jobs.length > 0) {
            // IMPORTANT: Do NOT overwrite 'awaiting_reply' or 'processing' status
            // with delivery statuses — sequence campaigns need these states intact
            // so twilio-incoming can find them when the contact replies
            await prisma.campaignJob.updateMany({
                where: {
                    messageId: messageSid,
                    status: { notIn: ['awaiting_reply', 'processing'] },
                },
                data: {
                    status,
                    ...(status === "failed" ? {
                        errorMessage: `${params.get("ErrorCode") || "?"}: ${params.get("ErrorMessage") || "Fallo en entrega"}`
                    } : {}),
                },
            })

            // Actualizar stats de la campaña
            for (const job of jobs) {
                const campaign = await prisma.whatsAppCampaign.findUnique({
                    where: { id: job.campaignId },
                })
                if (!campaign) continue

                const stats = JSON.parse(campaign.stats || "{}")
                if (status === "delivered") stats.delivered = (stats.delivered || 0) + 1
                if (status === "read") {
                    stats.read = (stats.read || 0) + 1
                    // Si pasó a read, también contar como delivered si no lo estaba
                    if (job.status !== "delivered" && job.status !== "read") {
                        stats.delivered = (stats.delivered || 0) + 1
                    }
                }
                if (status === "failed") {
                    stats.failed = (stats.failed || 0) + 1
                    // Descontar del sent si venía como sent
                    if (job.status === "sent") stats.sent = Math.max(0, (stats.sent || 0) - 1)
                }

                await prisma.whatsAppCampaign.update({
                    where: { id: job.campaignId },
                    data: { stats: JSON.stringify(stats) },
                })
            }
        }

        return new NextResponse("ok", { status: 200 })
    } catch (error: any) {
        console.error("Twilio status webhook error:", error)
        return new NextResponse("ok", { status: 200 }) // siempre 200 para que Twilio no reintente
    }
}
