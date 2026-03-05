import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateAudio, generateAudioForWhatsApp, logApiUsage } from "@/lib/elevenlabs"
import {
    getWhatsAppConfig,
    logWhatsApp,
    upsertContact,
    uploadMediaToWhatsApp,
    sendWhatsAppAudio,
    callTwilioAPI,
} from "@/lib/whatsapp"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { numero, text, voiceId } = body

        if (!numero) {
            return NextResponse.json({ error: "Número requerido" }, { status: 400 })
        }
        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Texto requerido" }, { status: 400 })
        }

        const config = await getWhatsAppConfig()
        if (!config) throw new Error("WhatsApp no configurado")

        // 1. Generate audio — MP3 for Twilio, OGG Opus for Meta
        const isTwilio = config.provider === "twilio"
        let audioBuffer: Buffer
        let characterCount: number
        try {
            const result = isTwilio
                ? await generateAudio(text, voiceId, undefined, "mp3_44100_128")
                : await generateAudioForWhatsApp(text, voiceId)
            audioBuffer = result.audioBuffer
            characterCount = result.characterCount
        } catch (elError: any) {
            await logWhatsApp("send_audio_error", {
                step: "elevenlabs_tts",
                error: elError.message,
                voiceId,
                textLength: text.length,
            })
            return NextResponse.json(
                { error: `Error de ElevenLabs: ${elError.message}` },
                { status: 500 }
            )
        }

        const estimatedTtsCost = (characterCount / 1000) * 0.30
        await logApiUsage("elevenlabs", "tts_generate", characterCount, estimatedTtsCost, {
            voiceId,
            textLength: characterCount,
            forWhatsApp: true,
        })

        let msgId: string | null = null

        if (isTwilio) {
            // ─── Twilio path: cache MP3 and send via MediaUrl ───
            if (!config.twilioNumber) throw new Error("Número Twilio no configurado")

            try {
                const hash = crypto.createHash("sha256")
                    .update(audioBuffer)
                    .digest("hex")
                    .substring(0, 32)

                const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
                if (!appUrl) throw new Error("NEXTAUTH_URL no está configurada. Se necesita para servir el audio a Twilio.")

                await (prisma as any).mediaCache.upsert({
                    where: { hash },
                    update: { mimeType: "audio/mpeg" },
                    create: { hash, mimeType: "audio/mpeg", data: audioBuffer.toString("base64") },
                })

                const audioUrl = `${appUrl}/api/media-cache/${hash}.mp3`

                const twilioResult = await callTwilioAPI(config, {
                    From: `whatsapp:${config.twilioNumber}`,
                    To: `whatsapp:${numero}`,
                    MediaUrl: audioUrl,
                })

                msgId = twilioResult?.sid || null
            } catch (twilioError: any) {
                await logWhatsApp("send_audio_error", {
                    step: "twilio_send",
                    error: twilioError.message,
                })
                return NextResponse.json(
                    { error: `Error enviando audio por Twilio: ${twilioError.message}` },
                    { status: 500 }
                )
            }
        } else {
            // ─── Meta path: upload media then send ───
            let mediaId: string
            try {
                mediaId = await uploadMediaToWhatsApp(audioBuffer, "audio/ogg")
            } catch (uploadError: any) {
                await logWhatsApp("send_audio_error", {
                    step: "upload_media",
                    error: uploadError.message,
                    audioSize: audioBuffer.length,
                })
                return NextResponse.json(
                    { error: `Error subiendo audio a WhatsApp: ${uploadError.message}` },
                    { status: 500 }
                )
            }

            let result: any
            try {
                result = await sendWhatsAppAudio(numero, mediaId)
            } catch (sendError: any) {
                await logWhatsApp("send_audio_error", {
                    step: "send_whatsapp_audio",
                    error: sendError.message,
                    mediaId,
                })
                return NextResponse.json(
                    { error: `Error enviando audio por WhatsApp: ${sendError.message}` },
                    { status: 500 }
                )
            }

            msgId = result?.messages?.[0]?.id || null
        }

        // Save outbound message
        await prisma.whatsAppMessage.create({
            data: {
                messageId: msgId,
                direction: "outbound",
                phone: numero,
                content: `[Audio IA: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"]`,
                type: "audio",
                status: "sent",
                timestamp: new Date(),
            },
        })

        await upsertContact(numero)

        await logApiUsage("whatsapp", "send_audio", 1, 0, {
            numero,
            audioLength: audioBuffer.length,
            provider: config.provider,
        })

        await logWhatsApp("audio_sent", {
            numero,
            textLength: characterCount,
            msgId,
            provider: config.provider,
        })

        return NextResponse.json({
            success: true,
            messageId: msgId,
            characterCount,
        })
    } catch (error: any) {
        await logWhatsApp("send_audio_error", { step: "unknown", error: error.message })
        return NextResponse.json(
            { error: error.message || "Error al enviar audio" },
            { status: 500 }
        )
    }
}
