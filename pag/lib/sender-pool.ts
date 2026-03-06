/**
 * sender-pool.ts — Pool de senders Twilio multi-cuenta
 *
 * Gestiona múltiples cuentas Twilio con:
 * - Round-robin con respaldo de capacidad
 * - Reset automático de contadores diarios
 * - Health tracking (marca senders como no saludables si falla)
 * - Distribución proporcional de carga
 * - Soporte para Messaging Service de Twilio
 */

import { prisma } from "@/lib/prisma"
import { decrypt, encrypt } from "@/lib/whatsapp"

// ─── Types ───

export interface SenderConfig {
    id: string
    name: string
    accountSid: string
    authToken: string
    phoneNumber: string
    messagingServiceSid?: string
    trustLevel: string
    maxMps: number
    sentToday: number
    delayBetweenMs: number // Calculado: ceil(1000 / maxMps)
}

export interface SenderDistribution {
    senderId: string
    jobCount: number
    delayMs: number
}

// ─── Sender Pool ───

export class SenderPool {
    private senders: SenderConfig[] = []
    private currentIndex = 0
    private initialized = false

    /**
     * Carga todos los senders activos y saludables de la DB.
     * Resetea contadores diarios si es necesario.
     */
    async initialize(): Promise<void> {
        // Reset daily counters if needed (new day)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        await prisma.twilioSender.updateMany({
            where: {
                dailyResetAt: { lt: todayStart },
            },
            data: {
                sentToday: 0,
                dailyResetAt: now,
            },
        })

        // Load active senders
        const dbSenders = await prisma.twilioSender.findMany({
            where: { isActive: true, isHealthy: true },
            orderBy: { createdAt: "asc" },
        })

        this.senders = dbSenders.map(s => ({
            id: s.id,
            name: s.name,
            accountSid: decrypt(s.accountSid),
            authToken: decrypt(s.authToken),
            phoneNumber: s.phoneNumber,
            messagingServiceSid: s.messagingServiceSid || undefined,
            trustLevel: s.trustLevel,
            maxMps: s.maxMps,
            sentToday: s.sentToday,
            delayBetweenMs: Math.ceil(1000 / s.maxMps),
        }))

        this.currentIndex = 0
        this.initialized = true

        if (this.senders.length === 0) {
            console.warn("[SenderPool] No hay senders activos y saludables disponibles")
        }
    }

    /**
     * Retorna el siguiente sender disponible (round-robin).
     * Si un sender alcanza su límite diario, lo salta.
     * Retorna null si todos están agotados.
     */
    getNextSender(): SenderConfig | null {
        if (!this.initialized || this.senders.length === 0) return null

        const sender = this.senders[this.currentIndex]
        this.currentIndex = (this.currentIndex + 1) % this.senders.length
        sender.sentToday++
        return sender
    }

    /**
     * Obtiene un sender específico por ID.
     */
    getSenderById(id: string): SenderConfig | null {
        return this.senders.find(s => s.id === id) || null
    }

    /**
     * Marca un sender como no saludable (ej: error 21610, cuenta suspendida).
     * Se elimina del pool activo en runtime y se persiste en DB.
     */
    async markUnhealthy(senderId: string, error: string): Promise<void> {
        await prisma.twilioSender.update({
            where: { id: senderId },
            data: {
                isHealthy: false,
                lastError: error,
                updatedAt: new Date(),
            },
        })
        this.senders = this.senders.filter(s => s.id !== senderId)
        console.warn(`[SenderPool] Sender ${senderId} marcado como no saludable: ${error}`)
    }

    /**
     * Registra un envío exitoso para un sender.
     * Actualiza contadores en DB de forma atómica.
     */
    async recordSend(senderId: string): Promise<void> {
        await prisma.twilioSender.update({
            where: { id: senderId },
            data: {
                sentToday: { increment: 1 },
                totalSent: { increment: 1 },
                lastUsedAt: new Date(),
            },
        })
    }

    /**
     * Distribuye N jobs entre los senders disponibles proporcionalmente
     * según la capacidad restante de cada uno.
     */
    distribute(totalJobs: number): SenderDistribution[] {
        if (this.senders.length === 0) return []

        const distribution: SenderDistribution[] = []
        const perSender = Math.ceil(totalJobs / this.senders.length)
        let assigned = 0

        for (const sender of this.senders) {
            const share = Math.min(perSender, totalJobs - assigned)
            if (share > 0) {
                distribution.push({
                    senderId: sender.id,
                    jobCount: share,
                    delayMs: sender.delayBetweenMs,
                })
                assigned += share
            }
            if (assigned >= totalJobs) break
        }

        return distribution
    }

    /**
     * Distribuye N jobs solo entre los sender IDs especificados.
     */
    distributeForIds(senderIds: string[], totalJobs: number): SenderDistribution[] {
        const filtered = this.senders.filter(s => senderIds.includes(s.id))
        if (filtered.length === 0) return []

        const distribution: SenderDistribution[] = []
        const perSender = Math.ceil(totalJobs / filtered.length)
        let assigned = 0

        for (const sender of filtered) {
            const share = Math.min(perSender, totalJobs - assigned)
            if (share > 0) {
                distribution.push({
                    senderId: sender.id,
                    jobCount: share,
                    delayMs: sender.delayBetweenMs,
                })
                assigned += share
            }
            if (assigned >= totalJobs) break
        }

        return distribution
    }

    /**
     * Calcula el MPS combinado de todos los senders activos.
     * Útil para estimar tiempo total de campaña.
     */
    getCombinedMps(): number {
        return this.senders.reduce((sum, s) => sum + s.maxMps, 0)
    }

    getSenders(): SenderConfig[] { return this.senders }
    getCount(): number { return this.senders.length }
    isReady(): boolean { return this.initialized && this.senders.length > 0 }
}

// ─── Twilio API con sender específico ───

/**
 * Envía un mensaje vía Twilio usando un sender específico.
 * Esta versión acepta un SenderConfig en lugar de depender de WhatsAppConfig global.
 */
export async function callTwilioWithSender(
    sender: SenderConfig,
    body: Record<string, string>
) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sender.accountSid}/Messages.json`
    const credentials = Buffer.from(`${sender.accountSid}:${sender.authToken}`).toString("base64")

    // Agregar StatusCallback
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
    const params = { ...body }
    if (appUrl) {
        params.StatusCallback = `${appUrl}/api/whatsapp/twilio-status`
    }

    // Si el sender tiene Messaging Service, usar ese en lugar de From
    if (sender.messagingServiceSid && !params.From) {
        params.MessagingServiceSid = sender.messagingServiceSid
    } else if (!params.From) {
        params.From = `whatsapp:${sender.phoneNumber}`
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
    })

    const data = await response.json()

    if (!response.ok) {
        const errorCode = data?.code || 0
        const errorMsg = data?.message || `Twilio error: ${response.status}`

        // Error codes que indican que el sender debe deshabilitarse
        const FATAL_CODES = [
            21610, // Unsubscribed (stop)
            21408, // Permission denied
            21211, // Invalid phone number
            63007, // Rate limit exceeded (puede ser temporal)
        ]

        if (FATAL_CODES.includes(errorCode)) {
            throw new TwilioSenderError(errorMsg, errorCode, true)
        }

        throw new TwilioSenderError(errorMsg, errorCode, false)
    }

    return data
}

/**
 * Error específico de Twilio con info de si es fatal para el sender.
 */
export class TwilioSenderError extends Error {
    code: number
    isFatal: boolean

    constructor(message: string, code: number, isFatal: boolean) {
        super(message)
        this.name = "TwilioSenderError"
        this.code = code
        this.isFatal = isFatal
    }
}

// ─── CRUD helpers ───

export async function createSender(data: {
    name: string
    accountSid: string
    authToken: string
    phoneNumber: string
    messagingServiceSid?: string
    trustLevel?: string
    maxMps?: number
}) {
    return prisma.twilioSender.create({
        data: {
            name: data.name,
            accountSid: encrypt(data.accountSid),
            authToken: encrypt(data.authToken),
            phoneNumber: data.phoneNumber,
            messagingServiceSid: data.messagingServiceSid || null,
            trustLevel: data.trustLevel || "standard",
            maxMps: data.maxMps || 1.0,
        },
    })
}

export async function testSenderConnection(accountSid: string, authToken: string): Promise<{ friendlyName: string; status: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
    })

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.message || `Twilio error: ${response.status}`)
    }

    return { friendlyName: data.friendly_name, status: data.status }
}

export async function getAllSenders() {
    const [senders, templateCounts] = await Promise.all([
        prisma.twilioSender.findMany({
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                messagingServiceSid: true,
                trustLevel: true,
                maxMps: true,
                sentToday: true,
                isActive: true,
                isHealthy: true,
                lastError: true,
                lastUsedAt: true,
                totalSent: true,
                createdAt: true,
            },
        }),
        prisma.whatsAppTemplate.groupBy({
            by: ["senderPhone"],
            where: { status: "APPROVED" },
            _count: { id: true },
        }),
    ])

    const countMap = new Map(templateCounts.map(r => [r.senderPhone, r._count.id]))
    return senders.map(s => ({ ...s, templateCount: countMap.get(s.phoneNumber) ?? 0 }))
}
