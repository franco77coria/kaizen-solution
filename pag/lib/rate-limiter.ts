/**
 * rate-limiter.ts — Token Bucket adaptativo para rate limiting
 *
 * Se adapta automáticamente cuando recibe 429s o errores de rate limit,
 * reduciendo la velocidad. Se recupera gradualmente con envíos exitosos.
 *
 * Funciona in-memory durante la vida de una invocación serverless.
 * No requiere Redis — el estado se restablece en cada invocación,
 * lo cual es aceptable porque cada batch es independiente.
 */

// ─── Token Bucket ───

export class AdaptiveRateLimiter {
    private tokens: number
    private maxTokens: number
    private refillRate: number // tokens per second
    private lastRefill: number
    private backoffMultiplier: number = 1
    private consecutiveErrors: number = 0

    /**
     * @param maxMps - Máximo de mensajes por segundo permitidos
     */
    constructor(maxMps: number) {
        this.maxTokens = Math.max(1, maxMps)
        this.tokens = this.maxTokens
        this.refillRate = maxMps
        this.lastRefill = Date.now()
    }

    /**
     * Espera hasta que haya un token disponible.
     * Bloquea (await) si el bucket está vacío.
     */
    async waitForToken(): Promise<void> {
        this.refill()

        while (this.tokens < 1) {
            const waitMs = Math.ceil((1 / this.refillRate) * 1000 * this.backoffMultiplier)
            await sleep(waitMs)
            this.refill()
        }

        this.tokens -= 1
    }

    /**
     * Llamar cuando se recibe un 429 o error de rate limit.
     * Duplica el backoff (máximo 16x).
     */
    onRateLimit(): void {
        this.consecutiveErrors++
        this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 16)
        console.warn(
            `[RateLimiter] Rate limit hit #${this.consecutiveErrors}. ` +
            `Backoff: ${this.backoffMultiplier}x (delay: ~${Math.ceil(1000 / this.refillRate * this.backoffMultiplier)}ms)`
        )
    }

    /**
     * Llamar después de un envío exitoso.
     * Reduce gradualmente el backoff.
     */
    onSuccess(): void {
        this.consecutiveErrors = 0
        if (this.backoffMultiplier > 1) {
            this.backoffMultiplier = Math.max(this.backoffMultiplier * 0.95, 1)
        }
    }

    /**
     * Retorna el delay estimado en ms entre mensajes.
     */
    getCurrentDelayMs(): number {
        return Math.ceil((1000 / this.refillRate) * this.backoffMultiplier)
    }

    /**
     * Retorna el MPS efectivo con el backoff actual.
     */
    getEffectiveMps(): number {
        return this.refillRate / this.backoffMultiplier
    }

    private refill(): void {
        const now = Date.now()
        const elapsed = (now - this.lastRefill) / 1000
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
        this.lastRefill = now
    }
}

// ─── ElevenLabs Rate Limiter ───

/**
 * Rate limiter específico para ElevenLabs.
 * Los planes de ElevenLabs tienen límites de concurrencia.
 */
export class ElevenLabsRateLimiter {
    private activeRequests: number = 0
    private maxConcurrent: number
    private queue: (() => void)[] = []

    /**
     * @param maxConcurrent - Máximo de requests concurrentes
     *   Starter: 2, Creator: 3, Pro: 10, Scale: 50
     */
    constructor(maxConcurrent: number = 5) {
        this.maxConcurrent = maxConcurrent
    }

    /**
     * Ejecuta una función respetando el límite de concurrencia.
     * Encola la ejecución si el límite ya se alcanzó.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire()
        try {
            return await fn()
        } finally {
            this.release()
        }
    }

    private async acquire(): Promise<void> {
        if (this.activeRequests < this.maxConcurrent) {
            this.activeRequests++
            return
        }

        // Esperar a que se libere un slot
        return new Promise<void>((resolve) => {
            this.queue.push(() => {
                this.activeRequests++
                resolve()
            })
        })
    }

    private release(): void {
        this.activeRequests--
        if (this.queue.length > 0) {
            const next = this.queue.shift()!
            next()
        }
    }

    getActiveRequests(): number {
        return this.activeRequests
    }

    getQueueLength(): number {
        return this.queue.length
    }
}

// ─── Retry Helper ───

/**
 * Retry con exponential backoff. Detecta rate limits automáticamente.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    baseDelayMs: number = 500,
    rateLimiter?: AdaptiveRateLimiter
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn()
            rateLimiter?.onSuccess()
            return result
        } catch (err: any) {
            const isRateLimit =
                err.message?.includes("429") ||
                err.message?.toLowerCase().includes("rate") ||
                err.message?.toLowerCase().includes("too many") ||
                err.code === 429

            if (attempt === maxRetries || !isRateLimit) {
                throw err
            }

            rateLimiter?.onRateLimit()
            const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000
            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms: ${err.message}`)
            await sleep(delay)
        }
    }
    throw new Error("Unreachable")
}

// ─── Utility ───

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calcula el delay recomendado entre mensajes para un trust level.
 */
export function getDelayForTrustLevel(trustLevel: string): number {
    switch (trustLevel) {
        case "new": return 1000      // 1 MPS
        case "standard": return 100  // 10 MPS
        case "high": return 20       // ~50 MPS
        default: return 200          // Conservador
    }
}
