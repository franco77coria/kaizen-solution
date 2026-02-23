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
        const { audioBuffer, characterCount } = await generateAudioForWhatsApp(text, voiceId)

        const estimatedTtsCost = (characterCount / 1000) * 0.30
        await logApiUsage("elevenlabs", "tts_generate", characterCount, estimatedTtsCost, {
            voiceId,
            textLength: characterCount,
            forWhatsApp: true,
        })

        // 2. Subir el audio OGG Opus a Media API de Meta
        const mediaId = await uploadMediaToWhatsApp(audioBuffer, "audio/ogg");

        // 3. Send audio message via WhatsApp usando el Media ID
        const result = await sendWhatsAppAudio(numero, mediaId);

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
        await logWhatsApp("send_audio_error", { error: error.message })
        return NextResponse.json(
            { error: error.message || "Error al enviar audio" },
            { status: 500 }
        )
    }
}
