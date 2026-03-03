import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/whatsapp"

// Cast prisma to any to work before prisma generate runs
const db = prisma as any

// ─── Config helpers ───

export interface ElevenLabsConfigData {
    apiKey: string
    voiceId: string
    modelId: string
    isConfigured: boolean
}

export async function getElevenLabsConfig(): Promise<ElevenLabsConfigData | null> {
    const config = await db.elevenLabsConfig.findFirst()
    if (!config) return null

    return {
        apiKey: decrypt(config.apiKey),
        voiceId: config.voiceId,
        modelId: config.modelId,
        isConfigured: config.isConfigured,
    }
}

export async function saveElevenLabsConfig(data: {
    apiKey: string
    voiceId?: string
    modelId?: string
}): Promise<void> {
    const existing = await db.elevenLabsConfig.findFirst()
    const encrypted = encrypt(data.apiKey)

    const payload = {
        apiKey: encrypted,
        voiceId: data.voiceId || "21m00Tcm4TlvDq8ikWAM",
        modelId: data.modelId || "eleven_multilingual_v2",
        isConfigured: true,
    }

    if (existing) {
        await db.elevenLabsConfig.update({
            where: { id: existing.id },
            data: payload,
        })
    } else {
        await db.elevenLabsConfig.create({ data: payload })
    }
}

// ─── ElevenLabs API helpers ───

export async function callElevenLabsAPI(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: any,
    isJson: boolean = true,
    returnRaw: boolean = false,
    queryParams?: Record<string, string>
): Promise<any> {
    const config = await getElevenLabsConfig()
    if (!config || !config.isConfigured) {
        throw new Error("ElevenLabs no está configurado. Ve a Configuración para agregar tu API Key.")
    }

    if (!config.apiKey || config.apiKey.trim().length === 0) {
        throw new Error("La API Key de ElevenLabs no se pudo desencriptar. Vuelve a ingresarla en Configuración > ElevenLabs.")
    }

    let url = `https://api.elevenlabs.io/v1/${endpoint}`
    if (queryParams) {
        const params = new URLSearchParams(queryParams)
        url += `?${params.toString()}`
    }

    const headers: Record<string, string> = {
        "xi-api-key": config.apiKey,
    }

    const options: RequestInit = { method, headers }

    if (body && method === "POST") {
        if (isJson) {
            headers["Content-Type"] = "application/json"
            options.body = JSON.stringify(body)
        } else {
            // FormData — don't set Content-Type, let fetch handle it
            options.body = body
        }
    }

    const response = await fetch(url, options)

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const detail = errData?.detail?.message || errData?.detail || `Error ${response.status}`
        if (response.status === 401 || (typeof detail === 'string' && detail.toLowerCase().includes('auth'))) {
            throw new Error("Error de autenticación en ElevenLabs. Tu API Key puede ser inválida o haber expirado. Actualizala en Configuración > ElevenLabs.")
        }
        throw new Error(`ElevenLabs API: ${detail}`)
    }

    if (returnRaw) return response
    return response.json()
}

export async function getVoicesList(): Promise<Array<{ voice_id: string; name: string; category: string }>> {
    const data = await callElevenLabsAPI("voices")

    return (data.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category || "premade",
    }))
}

// ─── Voice Cloning ───

export async function cloneVoice(
    name: string,
    description: string,
    audioFiles: Buffer[],
    fileNames: string[]
): Promise<{ voice_id: string; name: string }> {
    const formData = new FormData()
    formData.append("name", name)
    formData.append("description", description || `Voz clonada: ${name}`)

    for (let i = 0; i < audioFiles.length; i++) {
        const blob = new Blob([new Uint8Array(audioFiles[i])], { type: "audio/mpeg" })
        formData.append("files", blob, fileNames[i] || `sample_${i}.mp3`)
    }

    const data = await callElevenLabsAPI("voices/add", "POST", formData, false)

    return {
        voice_id: data.voice_id,
        name: name,
    }
}

export async function deleteVoice(voiceId: string): Promise<void> {
    await callElevenLabsAPI(`voices/${voiceId}`, "DELETE")
}

// ─── Text-to-Speech ───

export async function generateAudio(
    text: string,
    voiceId?: string,
    modelId?: string,
    outputFormat?: string
): Promise<{ audioBuffer: Buffer; characterCount: number }> {
    const config = await getElevenLabsConfig()
    if (!config) throw new Error("ElevenLabs no configurado")

    const voice = voiceId || config.voiceId
    const model = modelId || config.modelId

    const queryParams: Record<string, string> = {}
    if (outputFormat) {
        queryParams.output_format = outputFormat
    }

    const response = await callElevenLabsAPI(
        `text-to-speech/${voice}`,
        "POST",
        {
            text,
            model_id: model,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        },
        true,   // isJson
        true,   // returnRaw (we need the buffer)
        queryParams.output_format ? queryParams : undefined
    )

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    return {
        audioBuffer,
        characterCount: text.length,
    }
}

/**
 * Genera audio en formato OGG Opus directamente desde ElevenLabs.
 * Ideal para WhatsApp, que requiere Opus para renderizarse como "nota de voz".
 * Usa output_format=opus_48000_32 nativo de la API — sin necesidad de ffmpeg.
 */
export async function generateAudioForWhatsApp(
    text: string,
    voiceId?: string,
    modelId?: string
): Promise<{ audioBuffer: Buffer; characterCount: number }> {
    return generateAudio(text, voiceId, modelId, "opus_48000_32")
}

// ─── Template variable substitution ───

/**
 * Replace {variable} placeholders in text.
 * e.g. "Hola {nombre}, ¿cómo estás?" with { nombre: "Juan" } → "Hola Juan, ¿cómo estás?"
 */
export function resolveTemplateVariables(
    text: string,
    variables: Record<string, string>
): string {
    let result = text
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), value)
    }
    return result
}

/**
 * Extract variable names from a template string.
 * e.g. "Hola {nombre}, tu código es {codigo}" → ["nombre", "codigo"]
 */
export function extractTemplateVariables(text: string): string[] {
    const matches = text.match(/\{(\w+)\}/g)
    if (!matches) return []
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))))
}

// ─── Usage logging ───

export async function logApiUsage(
    service: "whatsapp" | "elevenlabs" | "twilio",
    operation: string,
    units: number = 0,
    cost: number = 0,
    metadata?: Record<string, any>
) {
    try {
        await db.apiUsageLog.create({
            data: {
                service,
                operation,
                cost,
                units,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        })
    } catch (e) {
        console.error("Failed to log API usage:", e)
    }
}
