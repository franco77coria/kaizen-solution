import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateAudio, logApiUsage } from "@/lib/elevenlabs"
import {
    callWhatsAppAPI,
    getWhatsAppConfig,
    logWhatsApp,
    upsertContact,
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

        // 1. Generate audio with ElevenLabs
        const { audioBuffer, characterCount } = await generateAudio(text, voiceId)

        const estimatedTtsCost = (characterCount / 1000) * 0.30
        await logApiUsage("elevenlabs", "tts_generate", characterCount, estimatedTtsCost, {
            voiceId,
            textLength: characterCount,
            forWhatsApp: true,
        })

        // 2. Upload audio to WhatsApp Media API
        const formData = new FormData()
        const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" })
        formData.append("file", audioBlob, "audio.mp3")
        formData.append("type", "audio/mpeg")
        formData.append("messaging_product", "whatsapp")

        const uploadUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
            },
            body: formData,
        })

        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) {
            throw new Error(uploadData?.error?.message || "Error al subir audio a WhatsApp")
        }

        const mediaId = uploadData.id

        // 3. Send audio message via WhatsApp
        const sendBody = {
            messaging_product: "whatsapp",
            to: numero,
            type: "audio",
            audio: { id: mediaId },
        }

        const result = await callWhatsAppAPI(
            `${config.phoneNumberId}/messages`,
            "POST",
            sendBody
        )

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
