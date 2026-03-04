import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getElevenLabsConfig, saveElevenLabsConfig } from "@/lib/elevenlabs"
import { maskToken } from "@/lib/whatsapp"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const config = await getElevenLabsConfig()
        if (!config) {
            return NextResponse.json({
                isConfigured: false,
                apiKey: "",
                voiceId: "21m00Tcm4TlvDq8ikWAM",
                modelId: "eleven_multilingual_v2",
                speed: 0.95,
                stability: 0.80,
                similarityBoost: 1.0,
                styleExaggeration: 0.30,
            })
        }

        return NextResponse.json({
            isConfigured: config.isConfigured,
            apiKey: maskToken(config.apiKey),
            voiceId: config.voiceId,
            modelId: config.modelId,
            speed: config.speed,
            stability: config.stability,
            similarityBoost: config.similarityBoost,
            styleExaggeration: config.styleExaggeration,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { apiKey, voiceId, modelId, speed, stability, similarityBoost, styleExaggeration } = body

        if (!apiKey) {
            return NextResponse.json({ error: "API Key requerida" }, { status: 400 })
        }

        await saveElevenLabsConfig({ apiKey, voiceId, modelId, speed, stability, similarityBoost, styleExaggeration })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
