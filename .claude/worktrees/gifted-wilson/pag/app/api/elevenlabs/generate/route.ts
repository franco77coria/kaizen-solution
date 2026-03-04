import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateAudio, logApiUsage } from "@/lib/elevenlabs"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { text, voiceId } = body

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "Texto requerido" }, { status: 400 })
        }

        if (text.length > 5000) {
            return NextResponse.json({ error: "Texto demasiado largo (máx 5000 chars)" }, { status: 400 })
        }

        const { audioBuffer, characterCount } = await generateAudio(text, voiceId)

        // Log usage: ElevenLabs charges ~$0.30 per 1000 chars on paid plans
        const estimatedCost = (characterCount / 1000) * 0.30
        await logApiUsage("elevenlabs", "tts_generate", characterCount, estimatedCost, {
            voiceId,
            textLength: characterCount,
        })

        // Return audio as base64
        const base64Audio = audioBuffer.toString("base64")

        return NextResponse.json({
            success: true,
            audio: base64Audio,
            characterCount,
            estimatedCost: estimatedCost.toFixed(4),
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Error al generar audio" },
            { status: 500 }
        )
    }
}
