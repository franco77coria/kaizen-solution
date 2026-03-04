import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logWhatsApp, upsertContact, normalizePhone } from "@/lib/whatsapp"
import { Client } from "@upstash/qstash"

// POST — Twilio sends incoming WhatsApp messages as application/x-www-form-urlencoded
export async function POST(request: NextRequest) {
    try {
        const text = await request.text()
        const params = new URLSearchParams(text)

        const messageSid = params.get("MessageSid") || ""
        const rawFrom = (params.get("From") || "").replace("whatsapp:", "")
        const from = normalizePhone(rawFrom)
        const body = params.get("Body") || ""
        const numMedia = parseInt(params.get("NumMedia") || "0")
        const profileName = params.get("ProfileName") || null

        if (!from || !messageSid) {
            return new NextResponse("ok", { status: 200 })
        }

        await logWhatsApp("twilio_incoming", { messageSid, from, numMedia })

        // Determine content and type
        let content = body
        let type = "text"

        if (numMedia > 0) {
            const mediaType = params.get("MediaContentType0") || ""
            if (mediaType.startsWith("image/")) {
                type = "image"
                content = "[Imagen]" + (body ? ": " + body : "")
            } else if (mediaType.startsWith("audio/") || mediaType.startsWith("video/ogg")) {
                type = "audio"
                content = "[Audio]"
            } else if (mediaType.startsWith("video/")) {
                type = "video"
                content = "[Video]"
            } else {
                type = "document"
                content = "[Documento]"
            }
        } else if (!body) {
            content = "[Mensaje vacío]"
        }

        // Save inbound message (upsert to avoid duplicates on Twilio retries)
        await prisma.whatsAppMessage.upsert({
            where: { messageId: messageSid },
            update: {},
            create: {
                messageId: messageSid,
                direction: "inbound",
                phone: from,
                contactName: profileName,
                content,
                type,
                status: "received",
                timestamp: new Date(),
            },
        })

        // Update contact
        await upsertContact(from, profileName || undefined)

        // Auto opt-out
        if (type === "text" && body) {
            const lower = body.trim().toLowerCase()
            if (lower === "stop" || lower === "baja" || lower === "cancelar") {
                await prisma.whatsAppContact.updateMany({
                    where: { phone: from },
                    data: { optInStatus: false },
                })
                await logWhatsApp("opt_out_received", { phone: from, message: body })
            }
        }

        // Sequence campaign: check for awaiting_reply jobs
        try {
            const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)

            // Expire stale awaiting_reply jobs (> 5h old)
            await prisma.campaignJob.updateMany({
                where: {
                    phone: from,
                    status: "awaiting_reply",
                    processedAt: { lt: fiveHoursAgo },
                },
                data: { status: "expired" },
            })

            // Atomically claim any active awaiting_reply job
            const claimed = await prisma.campaignJob.updateMany({
                where: { phone: from, status: "awaiting_reply" },
                data: { status: "processing" },
            })

            if (claimed.count > 0) {
                const processingJob = await prisma.campaignJob.findFirst({
                    where: { phone: from, status: "processing" },
                    orderBy: { processedAt: "desc" },
                })
                if (processingJob) {
                    const webhookUrl = process.env.UPSTASH_WEBHOOK_URL
                    if (process.env.QSTASH_TOKEN && webhookUrl) {
                        const qstash = new Client({ token: process.env.QSTASH_TOKEN })
                        await qstash.publishJSON({
                            url: webhookUrl,
                            body: { action: "sequence_continue", jobId: processingJob.id },
                        })
                    }
                }
            }
        } catch (seqErr: any) {
            console.error("Sequence check error (non-fatal):", seqErr.message)
        }

        // Twilio expects empty 200 response (or TwiML) — no body = no auto-reply
        return new NextResponse("", { status: 200 })
    } catch (error: any) {
        console.error("Twilio incoming webhook error:", error)
        // Always 200 so Twilio doesn't retry
        return new NextResponse("", { status: 200 })
    }
}
