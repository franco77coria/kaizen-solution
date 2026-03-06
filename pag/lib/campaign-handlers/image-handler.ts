/**
 * image-handler.ts — Handler para campañas de tipo "image"
 *
 * Envía imágenes con caption personalizado vía Twilio o Meta Cloud API.
 * Cache de imágenes en MediaCache para evitar re-downloads.
 */

import crypto from "crypto"
import { CampaignHandler, CampaignContext, JobResult, resolveVariables } from "./index"
import { SenderConfig, callTwilioWithSender } from "@/lib/sender-pool"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppImage } from "@/lib/whatsapp"

let cachedImageUrl: string | null = null

const handler: CampaignHandler = {
    async prepareBatch(ctx, _jobs, _contactMap) {
        const { isTwilio } = ctx
        const imageConfig = JSON.parse(ctx.campaign.audioConfig || "{}")
        const appUrl = ctx.appUrl

        // Para Twilio: descargar imagen y cachear en MediaCache una sola vez
        if (isTwilio && imageConfig.imageUrl && !imageConfig.imageUrl.startsWith(`${appUrl}/api/media-cache`)) {
            try {
                const imgRes = await fetch(imageConfig.imageUrl)
                if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status} al descargar imagen`)
                const mimeType = imgRes.headers.get("content-type") || "image/jpeg"
                const buffer = Buffer.from(await imgRes.arrayBuffer())
                const hash = crypto.createHash("sha256").update(buffer).digest("hex")

                await (prisma as any).mediaCache.upsert({
                    where: { hash },
                    update: {},
                    create: { hash, mimeType, data: buffer.toString("base64") },
                })

                cachedImageUrl = `${appUrl}/api/media-cache/${hash}`

                // Persistir URL cacheada en la campaña
                imageConfig.imageUrl = cachedImageUrl
                await prisma.whatsAppCampaign.update({
                    where: { id: ctx.campaign.id },
                    data: { audioConfig: JSON.stringify(imageConfig) },
                })
            } catch (err: any) {
                throw new Error(`No se pudo descargar la imagen: ${err.message}`)
            }
        } else {
            cachedImageUrl = imageConfig.imageUrl
        }
    },

    async sendMessage(ctx, job, contact, sender): Promise<JobResult> {
        const { mapping, isTwilio } = ctx
        const imageConfig = JSON.parse(ctx.campaign.audioConfig || "{}")

        let caption = imageConfig.caption || ""
        caption = resolveVariables(caption, mapping, contact)

        const imageUrl = cachedImageUrl || imageConfig.imageUrl

        if (isTwilio) {
            const apiBody: Record<string, string> = {
                To: `whatsapp:${job.phone}`,
                MediaUrl: imageUrl,
            }
            if (caption) apiBody.Body = caption

            const data = await callTwilioWithSender(sender, apiBody)
            return {
                success: true,
                messageId: data?.sid || "",
                cost: Math.abs(parseFloat(data?.price || "0")),
            }
        } else {
            const data = await sendWhatsAppImage(job.phone, imageUrl, caption)
            if (data.messages && data.messages.length > 0) {
                return {
                    success: true,
                    messageId: data.messages[0].id,
                }
            }
            throw new Error("No message ID returned (Image)")
        }
    },

    getMessageType() {
        return "image"
    },
}

export default handler
