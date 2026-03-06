/**
 * audio-handler.ts — Handler para campañas de tipo "audio"
 *
 * Soporta dos modos:
 * 1. Full AI: ElevenLabs genera todo el audio
 * 2. IA + Pregrabado: ElevenLabs genera saludo personalizado + audio pregrabado concatenados
 *
 * Usa Supabase Storage para cache de audio en vez de Base64 en DB.
 */

import crypto from "crypto"
import { CampaignHandler, CampaignContext, JobResult, resolveVariables } from "./index"
import { SenderConfig, callTwilioWithSender } from "@/lib/sender-pool"
import { getOrGenerateAudio, prewarmAudioBatch, uploadAudioToStorage } from "@/lib/audio-storage"
import { generateAudio, generateAudioForWhatsApp, getElevenLabsConfig } from "@/lib/elevenlabs"
import { withRetry, ElevenLabsRateLimiter } from "@/lib/rate-limiter"
import { prisma } from "@/lib/prisma"
import { uploadMediaToWhatsApp, sendWhatsAppAudio } from "@/lib/whatsapp"

// Semáforo de concurrencia para ElevenLabs (compartido entre jobs del batch)
const elevenLabsLimiter = new ElevenLabsRateLimiter(5)

// ─── MP3 Helpers (extraídos del procesador original) ───

function getMp3FrameSize(buf: Buffer, offset: number): number {
    const h = (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]
    const mpegVersion = (h >> 19) & 0x3
    const layer = (h >> 17) & 0x3
    const bitrateIdx = (h >> 12) & 0xF
    const sampleRateIdx = (h >> 10) & 0x3
    const padding = (h >> 9) & 0x1

    const bitrates: Record<string, number[]> = {
        "3-1": [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
        "3-2": [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
        "2-1": [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
    }
    const sampleRates: Record<string, number[]> = {
        "3": [44100, 48000, 32000, 0],
        "2": [22050, 24000, 16000, 0],
        "0": [11025, 12000, 8000, 0],
    }

    const brKey = `${mpegVersion}-${layer}`
    const srKey = `${mpegVersion}`
    const bitrate = (bitrates[brKey]?.[bitrateIdx] ?? 0) * 1000
    const sampleRate = sampleRates[srKey]?.[sampleRateIdx] ?? 0
    if (!bitrate || !sampleRate) return 0
    if (layer === 1) return Math.floor(144 * bitrate / sampleRate) + padding
    return 0
}

function isVbrHeaderFrame(buf: Buffer, offset: number): boolean {
    const checkOffsets = [offset + 36, offset + 21, offset + 13, offset + 9]
    for (const o of checkOffsets) {
        if (o + 4 <= buf.length) {
            const tag = buf.toString("ascii", o, o + 4)
            if (tag === "Xing" || tag === "Info" || tag === "VBRI") return true
        }
    }
    return false
}

function stripMp3Headers(buf: Buffer): Buffer {
    let start = 0
    if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
        const size = (buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f)
        start = 10 + size
    }
    while (start < buf.length - 1) {
        if (buf[start] === 0xFF && (buf[start + 1] & 0xE0) === 0xE0) break
        start++
    }
    if (start < buf.length - 4 && isVbrHeaderFrame(buf, start)) {
        const frameSize = getMp3FrameSize(buf, start)
        if (frameSize > 0) start += frameSize
    }
    let end = buf.length
    if (end > 128 && buf[end - 128] === 0x54 && buf[end - 127] === 0x41 && buf[end - 126] === 0x47) {
        end -= 128
    }
    return buf.subarray(start, end)
}

// ─── Cache for pre-recorded audio (loaded once per batch) ───
let preRecordedBufferCache: Buffer | null = null

const handler: CampaignHandler = {
    async prepareBatch(ctx, jobs, contactMap) {
        const { audioConfig, mapping, isTwilio } = ctx

        // Verificar ElevenLabs config
        const elConfig = await getElevenLabsConfig()
        if (!elConfig) throw new Error("Configuración ElevenLabs faltante para campaña de audio")

        // Pre-warm: generar audios únicos en paralelo
        const promptMap = new Map<string, string>()

        for (const job of jobs) {
            const contact = contactMap.get(job.phone) || null
            const prompt = resolveVariables(audioConfig.prompt || "", mapping, contact)
            const prefix = audioConfig.preRecordedAudioUrl ? "mp3:" : (isTwilio ? "mp3:" : "")
            const hash = crypto.createHash("sha256")
                .update(`${prefix}${prompt}`)
                .digest("hex")
                .substring(0, 32)
            if (!promptMap.has(hash)) promptMap.set(hash, prompt)
        }

        // Pre-generar con concurrencia controlada
        const useMp3 = audioConfig.preRecordedAudioUrl || isTwilio
        const format = useMp3 ? "mp3" : "ogg"

        await prewarmAudioBatch(
            promptMap,
            audioConfig.voiceId || elConfig.voiceId,
            format as "mp3" | "ogg",
            async (text: string) => {
                return elevenLabsLimiter.execute(async () => {
                    const result = await withRetry(
                        () => useMp3
                            ? generateAudio(text, audioConfig.voiceId, undefined, "mp3_44100_128")
                            : generateAudioForWhatsApp(text, audioConfig.voiceId),
                        2, 500
                    )
                    return result.audioBuffer
                })
            },
            5 // concurrency
        )

        // Pre-cargar audio pregrabado si existe
        if (audioConfig.preRecordedAudioUrl) {
            preRecordedBufferCache = await loadPreRecordedAudio(audioConfig.preRecordedAudioUrl)
        }
    },

    async sendMessage(ctx, job, contact, sender): Promise<JobResult> {
        const { audioConfig, mapping, isTwilio, appUrl } = ctx
        const prompt = resolveVariables(audioConfig.prompt || "", mapping, contact)

        let finalAudioBuffer: Buffer

        if (audioConfig.preRecordedAudioUrl) {
            // IA + Pregrabado: generar saludo AI + concatenar con pregrabado
            finalAudioBuffer = await buildHybridAudio(prompt, audioConfig, isTwilio)
        } else {
            // Full AI
            finalAudioBuffer = await buildFullAIAudio(prompt, audioConfig, isTwilio)
        }

        // Enviar
        if (isTwilio) {
            return sendViaTwilio(sender, job.phone, finalAudioBuffer, appUrl)
        } else {
            return sendViaMeta(job.phone, finalAudioBuffer, audioConfig.preRecordedAudioUrl ? "mp3" : "ogg")
        }
    },

    getMessageType() {
        return "audio"
    },
}

// ─── Audio Generation ───

async function buildHybridAudio(prompt: string, audioConfig: any, isTwilio: boolean): Promise<Buffer> {
    // Obtener saludo AI del cache (debería existir por el pre-warm)
    const greetingHash = crypto.createHash("sha256").update(`mp3:${prompt}`).digest("hex").substring(0, 32)
    const cached = await prisma.audioMessageCache.findUnique({ where: { hash: greetingHash } })

    let greetingBuffer: Buffer
    if (cached?.mediaUrl) {
        // Descargar del Storage
        const res = await fetch(cached.mediaUrl)
        greetingBuffer = Buffer.from(await res.arrayBuffer())
    } else {
        // Generar en el momento (fallback si el pre-warm falló)
        const result = await withRetry(
            () => generateAudio(prompt, audioConfig.voiceId, undefined, "mp3_44100_128"),
            2, 500
        )
        greetingBuffer = result.audioBuffer
    }

    // Cargar pregrabado (debería estar en cache de batch)
    const preRecBuffer = preRecordedBufferCache || await loadPreRecordedAudio(audioConfig.preRecordedAudioUrl)

    // Concatenar MP3 limpio
    return Buffer.concat([stripMp3Headers(greetingBuffer), stripMp3Headers(preRecBuffer)])
}

async function buildFullAIAudio(prompt: string, audioConfig: any, isTwilio: boolean): Promise<Buffer> {
    const cachePrefix = isTwilio ? "mp3:" : ""
    const textHash = crypto.createHash("sha256").update(`${cachePrefix}${prompt}`).digest("hex").substring(0, 32)
    const cached = await prisma.audioMessageCache.findUnique({ where: { hash: textHash } })

    if (cached?.mediaUrl) {
        const res = await fetch(cached.mediaUrl)
        return Buffer.from(await res.arrayBuffer())
    }

    // Fallback: generar
    const result = await withRetry(
        () => isTwilio
            ? generateAudio(prompt, audioConfig.voiceId, undefined, "mp3_44100_128")
            : generateAudioForWhatsApp(prompt, audioConfig.voiceId),
        2, 500
    )
    return result.audioBuffer
}

// ─── Send helpers ───

async function sendViaTwilio(sender: SenderConfig, phone: string, audioBuffer: Buffer, appUrl: string): Promise<JobResult> {
    const hash = crypto.createHash("sha256").update(audioBuffer).digest("hex").substring(0, 32)

    // Subir a Supabase Storage
    const audioUrl = await uploadAudioToStorage(audioBuffer, "mp3")

    const data = await callTwilioWithSender(sender, {
        To: `whatsapp:${phone}`,
        MediaUrl: audioUrl,
    })

    return {
        success: true,
        messageId: data?.sid || "",
        cost: Math.abs(parseFloat(data?.price || "0")),
    }
}

async function sendViaMeta(phone: string, audioBuffer: Buffer, format: "mp3" | "ogg"): Promise<JobResult> {
    const mimeType = format === "mp3" ? "audio/mpeg" : "audio/ogg"
    const mediaId = await uploadMediaToWhatsApp(audioBuffer, mimeType)
    const data = await sendWhatsAppAudio(phone, mediaId)

    if (data.messages && data.messages.length > 0) {
        return {
            success: true,
            messageId: data.messages[0].id,
        }
    }

    throw new Error("No message ID returned (Audio)")
}

// ─── Pre-recorded audio loader ───

async function loadPreRecordedAudio(url: string): Promise<Buffer> {
    // Primero intentar leer de AudioMessageCache
    const preRecHash = crypto.createHash("sha256").update(`prerec:${url}`).digest("hex").substring(0, 32)
    const cached = await prisma.audioMessageCache.findUnique({ where: { hash: preRecHash } })

    if (cached?.mediaUrl) {
        const res = await fetch(cached.mediaUrl)
        if (res.ok) return Buffer.from(await res.arrayBuffer())
    }

    // Intentar leer de MediaCache (legacy base64)
    const urlParts = url.split("/")
    const mediaCacheHash = urlParts[urlParts.length - 1].replace(/\.[^.]+$/, "")
    const mediaEntry = await (prisma as any).mediaCache.findUnique({ where: { hash: mediaCacheHash } })

    if (mediaEntry?.data) {
        const buffer = Buffer.from(mediaEntry.data, "base64")
        // Migrar a Supabase Storage
        const storageUrl = await uploadAudioToStorage(buffer, "mp3")
        await prisma.audioMessageCache.upsert({
            where: { hash: preRecHash },
            update: { mediaUrl: storageUrl },
            create: {
                hash: preRecHash,
                mediaUrl: storageUrl,
                format: "mp3",
                sizeBytes: buffer.length,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            },
        })
        return buffer
    }

    // Último recurso: HTTP fetch
    const res = await fetch(url)
    if (!res.ok) throw new Error("No se pudo obtener el audio pregrabado")
    return Buffer.from(await res.arrayBuffer())
}

export default handler
