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
            })
        }

        return NextResponse.json({
            isConfigured: config.isConfigured,
            apiKey: maskToken(config.apiKey),
            voiceId: config.voiceId,
            modelId: config.modelId,
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
        const { apiKey, voiceId, modelId } = body

        if (!apiKey) {
            return NextResponse.json({ error: "API Key requerida" }, { status: 400 })
        }

        await saveElevenLabsConfig({ apiKey, voiceId, modelId })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
