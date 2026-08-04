import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limit por IP para endpoints públicos (chat, formulario de leads).
 *
 * Ventana deslizante in-memory. En serverless el estado vive por instancia,
 * así que el límite real es por-instancia y no global — alcanza para frenar
 * abuso casual y scripts, no a un atacante distribuido. Si más adelante hay
 * Redis, este módulo es el único punto a cambiar.
 */

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

const SWEEP_INTERVAL_MS = 5 * 60_000
const MAX_BUCKETS = 10_000

function sweep(now: number, windowMs: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return
    lastSweep = now

    buckets.forEach((bucket, key) => {
        bucket.hits = bucket.hits.filter((t: number) => now - t < windowMs)
        if (bucket.hits.length === 0) buckets.delete(key)
    })

    // Cinturón por si el sweep no alcanza: no dejamos crecer el Map sin techo
    if (buckets.size > MAX_BUCKETS) buckets.clear()
}

export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return req.headers.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitOptions {
    /** Identificador del endpoint, para que no compartan cupo entre sí */
    name: string
    /** Cantidad máxima de requests dentro de la ventana */
    limit: number
    /** Tamaño de la ventana en milisegundos */
    windowMs: number
}

/**
 * Devuelve una respuesta 429 si se pasó del límite, o null si puede seguir.
 */
export function checkRateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
    const now = Date.now()
    sweep(now, opts.windowMs)

    const key = `${opts.name}:${getClientIp(req)}`
    const bucket = buckets.get(key) ?? { hits: [] }

    bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs)

    if (bucket.hits.length >= opts.limit) {
        const oldest = bucket.hits[0]
        const retryAfter = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000))
        buckets.set(key, bucket)

        return NextResponse.json(
            { error: 'Demasiadas solicitudes. Probá de nuevo en un momento.' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
    }

    bucket.hits.push(now)
    buckets.set(key, bucket)
    return null
}
