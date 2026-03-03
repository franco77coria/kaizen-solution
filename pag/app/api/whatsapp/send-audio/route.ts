import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateAudioForWhatsApp, logApiUsage } from "@/lib/elevenlabs"
import {
    getWhatsAppConfig,
    logWhatsApp,
    upsertContact,
    uploadMediaToWhatsApp,
    sendWhatsAppAudio
} from "@/lib/whatsapp"
import { prisma } from "@/lib/prisma"

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

        // 1. Generate audio with ElevenLabs (formato OGG Opus nativo, sin ffmpeg)
        let audioBuffer: Buffer
        let characterCount: number
        try {
            const result = await generateAudioForWhatsApp(text, voiceId)
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

        // 2. Subir el audio OGG Opus a Media API de Meta
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

        // 3. Send audio message via WhatsApp usando el Media ID
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

        const msgId = result?.messages?.[0]?.id || null

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
        })

        await logWhatsApp("audio_sent", {
            numero,
            textLength: characterCount,
            msgId,
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
