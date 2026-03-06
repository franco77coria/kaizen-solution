/**
 * audio-storage.ts — Audio cache con Supabase Storage
 * 
 * Reemplaza el almacenamiento Base64 en PostgreSQL por URLs públicas
 * de Supabase Storage. Cada audio se guarda como archivo en el bucket 
 * 'campaign-audio' y se referencia por su hash SHA256.
 */

import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// ─── Supabase Storage Client ───

const BUCKET = "campaign-audio"

function getStorageClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error("Supabase Storage no configurado: faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
    }

    return createClient(url, key, {
        auth: { persistSession: false },
    })
}

// ─── Core Functions ───

/**
 * Sube un audio a Supabase Storage y retorna la URL pública.
 * Si ya existe un archivo con el mismo hash, retorna la URL existente sin re-subir.
 */
export async function uploadAudioToStorage(
    audioBuffer: Buffer,
    format: "mp3" | "ogg" = "mp3"
): Promise<string> {
    const hash = crypto.createHash("sha256")
        .update(audioBuffer)
        .digest("hex")
        .substring(0, 32)

    const filename = `${hash}.${format}`
    const mimeType = format === "mp3" ? "audio/mpeg" : "audio/ogg"
    const supabase = getStorageClient()

    // Intentar obtener URL pública directamente (si ya existe)
    const { data: existing } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filename)

    // Verificar si el archivo realmente existe haciendo un HEAD
    if (existing?.publicUrl) {
        try {
            const headRes = await fetch(existing.publicUrl, { method: "HEAD" })
            if (headRes.ok) {
                return existing.publicUrl
            }
        } catch {
            // No existe, seguir con upload
        }
    }

    // Subir el archivo
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, audioBuffer, {
            contentType: mimeType,
            upsert: true,
            cacheControl: "604800", // 7 días de cache CDN
        })

    if (error) {
        throw new Error(`Error subiendo audio a Storage: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filename)

    return urlData.publicUrl
}

/**
 * Obtiene un audio del cache o lo genera con la función proporcionada.
 * 
 * Flow:
 * 1. Busca en DB por hash → si existe, retorna URL de Storage
 * 2. Si no existe, ejecuta generateFn() para generar el buffer
 * 3. Sube a Supabase Storage
 * 4. Guarda referencia en AudioMessageCache
 * 5. Retorna URL pública
 */
export async function getOrGenerateAudio(
    text: string,
    voiceId: string,
    format: "mp3" | "ogg" = "mp3",
    generateFn: () => Promise<Buffer>,
    ttlMs: number = 7 * 24 * 60 * 60 * 1000 // 7 días default
): Promise<string> {
    const hash = crypto.createHash("sha256")
        .update(`${format}:${voiceId}:${text}`)
        .digest("hex")
        .substring(0, 32)

    // 1. Check cache
    const cached = await prisma.audioMessageCache.findUnique({
        where: { hash },
    })

    if (cached?.mediaUrl) {
        // Verificar que la URL sigue siendo válida (no expirada)
        if (!cached.expiresAt || cached.expiresAt > new Date()) {
            return cached.mediaUrl
        }
        // Expirado, limpiar y re-generar
        await prisma.audioMessageCache.delete({ where: { hash } })
    }

    // 2. Generate audio
    const buffer = await generateFn()

    // 3. Upload to Supabase Storage
    const publicUrl = await uploadAudioToStorage(buffer, format)

    // 4. Cache reference in DB
    await prisma.audioMessageCache.upsert({
        where: { hash },
        update: {
            mediaUrl: publicUrl,
            format,
            sizeBytes: buffer.length,
            expiresAt: new Date(Date.now() + ttlMs),
        },
        create: {
            hash,
            mediaUrl: publicUrl,
            format,
            sizeBytes: buffer.length,
            expiresAt: new Date(Date.now() + ttlMs),
        },
    })

    return publicUrl
}

/**
 * Pre-warm: genera todos los audios únicos de un batch en paralelo
 * antes de enviar los mensajes. Retorna un mapa hash → URL.
 */
export async function prewarmAudioBatch(
    prompts: Map<string, string>, // hash → prompt text
    voiceId: string,
    format: "mp3" | "ogg",
    generateFn: (text: string) => Promise<Buffer>,
    concurrency: number = 5
): Promise<Map<string, string>> {
    const results = new Map<string, string>()

    // Buscar cuáles ya están en cache
    const hashes = Array.from(prompts.keys())
    const existing = await prisma.audioMessageCache.findMany({
        where: { hash: { in: hashes } },
        select: { hash: true, mediaUrl: true },
    })

    for (const cached of existing) {
        // Ignorar entradas con URL corrupta (datos binarios en vez de URL HTTP)
        if (cached.mediaUrl?.startsWith("http")) {
            results.set(cached.hash, cached.mediaUrl)
        }
    }

    const uncached = hashes.filter(h => !results.has(h))
    if (uncached.length === 0) return results

    console.log(`[AudioPrewarm] Generando ${uncached.length} audio(s) únicos en paralelo (concurrency: ${concurrency})...`)

    // Procesar en chunks de 'concurrency'
    for (let i = 0; i < uncached.length; i += concurrency) {
        const chunk = uncached.slice(i, i + concurrency)
        const settled = await Promise.allSettled(
            chunk.map(async (hash) => {
                const prompt = prompts.get(hash)!
                const buffer = await generateFn(prompt)
                const publicUrl = await uploadAudioToStorage(buffer, format)

                await prisma.audioMessageCache.upsert({
                    where: { hash },
                    update: { mediaUrl: publicUrl, format, sizeBytes: buffer.length },
                    create: {
                        hash,
                        mediaUrl: publicUrl,
                        format,
                        sizeBytes: buffer.length,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                })

                results.set(hash, publicUrl)
            })
        )

        // Log failures
        for (let j = 0; j < settled.length; j++) {
            if (settled[j].status === "rejected") {
                const err = (settled[j] as PromiseRejectedResult).reason
                console.warn(`[AudioPrewarm] Failed hash ${chunk[j]}: ${err.message}`)
            }
        }
    }

    return results
}

/**
 * Limpia audios expirados del cache (DB + Storage).
 * Llamar desde un cron job o manualmente.
 */
export async function cleanExpiredAudio(): Promise<number> {
    const expired = await prisma.audioMessageCache.findMany({
        where: {
            expiresAt: { lt: new Date() },
        },
        select: { id: true, hash: true, format: true },
    })

    if (expired.length === 0) return 0

    const supabase = getStorageClient()

    // Borrar archivos de Storage
    const filenames = expired.map(e => `${e.hash}.${e.format || "mp3"}`)
    await supabase.storage.from(BUCKET).remove(filenames)

    // Borrar registros de DB
    await prisma.audioMessageCache.deleteMany({
        where: { id: { in: expired.map(e => e.id) } },
    })

    console.log(`[AudioCleanup] Eliminados ${expired.length} audios expirados`)
    return expired.length
}
