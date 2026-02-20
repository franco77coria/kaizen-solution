import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// ─── Encryption helpers (uses NEXTAUTH_SECRET as key) ───

const ALGORITHM = "aes-256-gcm"

function getEncryptionKey(): Buffer {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-me"
    return crypto.scryptSync(secret, "whatsapp-salt", 32)
}

export function encrypt(text: string): string {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")
    return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
    try {
        const key = getEncryptionKey()
        const [ivHex, authTagHex, encrypted] = encryptedText.split(":")
        const iv = Buffer.from(ivHex, "hex")
        const authTag = Buffer.from(authTagHex, "hex")
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(encrypted, "hex", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    } catch {
        return ""
    }
}

// ─── Config helpers ───

export interface WhatsAppConfig {
    apiToken: string
    phoneNumberId: string
    wabaId: string | null
    verifyToken: string
    apiVersion: string
    isConfigured: boolean
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
    const config = await prisma.whatsAppConfig.findFirst()
    if (!config) return null

    return {
        apiToken: decrypt(config.apiToken),
        phoneNumberId: config.phoneNumberId,
        wabaId: config.wabaId,
        verifyToken: config.verifyToken,
        apiVersion: config.apiVersion,
        isConfigured: config.isConfigured,
    }
}

export async function saveWhatsAppConfig(data: {
    apiToken: string
    phoneNumberId: string
    wabaId?: string
    verifyToken?: string
    apiVersion?: string
}): Promise<void> {
    const existing = await prisma.whatsAppConfig.findFirst()
    const encrypted = encrypt(data.apiToken)

    if (existing) {
        await prisma.whatsAppConfig.update({
            where: { id: existing.id },
            data: {
                apiToken: encrypted,
                phoneNumberId: data.phoneNumberId,
                wabaId: data.wabaId || null,
                verifyToken: data.verifyToken || "kaizen_whatsapp_2026",
                apiVersion: data.apiVersion || "v21.0",
                isConfigured: true,
            },
        })
    } else {
        await prisma.whatsAppConfig.create({
            data: {
                apiToken: encrypted,
                phoneNumberId: data.phoneNumberId,
                wabaId: data.wabaId || null,
                verifyToken: data.verifyToken || "kaizen_whatsapp_2026",
                apiVersion: data.apiVersion || "v21.0",
                isConfigured: true,
            },
        })
    }
}

// ─── WhatsApp API helpers ───

export async function callWhatsAppAPI(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: object
) {
    const config = await getWhatsAppConfig()
    if (!config || !config.isConfigured) {
        throw new Error("WhatsApp no está configurado. Ve a Configuración para agregar tus credenciales.")
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${endpoint}`

    const options: RequestInit = {
        method,
        headers: {
            Authorization: `Bearer ${config.apiToken}`,
            "Content-Type": "application/json",
        },
    }

    if (body && method === "POST") {
        options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data?.error?.message || `API error: ${response.status}`)
    }

    return data
}

export async function sendWhatsAppTemplate(
    phone: string,
    templateName: string,
    languageCode: string
) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    const body = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
        },
    }

    return callWhatsAppAPI(`${config.phoneNumberId}/messages`, "POST", body)
}

export async function sendWhatsAppText(phone: string, message: string) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    const body = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
    }

    return callWhatsAppAPI(`${config.phoneNumberId}/messages`, "POST", body)
}

export async function getTemplatesFromMeta() {
    const config = await getWhatsAppConfig()
    if (!config || !config.wabaId) {
        throw new Error("WABA ID no configurado")
    }

    const data = await callWhatsAppAPI(
        `${config.wabaId}/message_templates?limit=100`
    )

    return (data.data || [])
        .filter((t: any) => t.status === "APPROVED")
        .map((t: any) => ({
            name: t.name,
            language: t.language,
            category: t.category,
            status: t.status,
        }))
}

// ─── Log helper ───

export async function logWhatsApp(type: string, payload: any) {
    try {
        await prisma.whatsAppLog.create({
            data: {
                type,
                payload: typeof payload === "string" ? payload : JSON.stringify(payload),
            },
        })
    } catch (e) {
        console.error("Failed to log WhatsApp event:", e)
    }
}

// ─── Contact helper ───

export async function upsertContact(phone: string, name?: string) {
    const existing = await prisma.whatsAppContact.findUnique({
        where: { phone },
    })

    if (existing) {
        await prisma.whatsAppContact.update({
            where: { phone },
            data: {
                name: name || existing.name,
                lastMessageAt: new Date(),
                totalMessages: { increment: 1 },
            },
        })
    } else {
        await prisma.whatsAppContact.create({
            data: {
                phone,
                name: name || null,
                lastMessageAt: new Date(),
                totalMessages: 1,
            },
        })
    }
}

export function maskToken(token: string): string {
    if (!token || token.length < 10) return "****"
    return token.substring(0, 6) + "..." + token.substring(token.length - 4)
}
