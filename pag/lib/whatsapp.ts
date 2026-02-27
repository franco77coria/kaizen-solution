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

    if (existing) {
        // Si el frontend envía el token enmascarado (con asteriscos), mantenemos el existente.
        // Si envía uno nuevo limpio, lo encriptamos.
        let finalApiToken = existing.apiToken;
        if (data.apiToken && !data.apiToken.includes('****')) {
            finalApiToken = encrypt(data.apiToken);
        }

        await prisma.whatsAppConfig.update({
            where: { id: existing.id },
            data: {
                apiToken: finalApiToken,
                phoneNumberId: data.phoneNumberId,
                wabaId: data.wabaId || null,
                verifyToken: data.verifyToken || "kaizen_whatsapp_2026",
                apiVersion: data.apiVersion || "v21.0",
                isConfigured: true,
            },
        })
    } else {
        const encrypted = encrypt(data.apiToken)
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
        // #region agent log
        try { await prisma.whatsAppLog.create({ data: { type: 'DEBUG_API_ERROR', payload: JSON.stringify({ url, method, requestBody: body, responseStatus: response.status, responseData: data }) } }); } catch(e) {}
        // #endregion
        throw new Error(data?.error?.message || `API error: ${response.status}`)
    }

    return data
}

export async function sendWhatsAppTemplate(
    phone: string,
    templateName: string,
    languageCode: string,
    components?: Array<{ type: string; parameters: Array<{ type: string; text: string }> }>
) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    const templatePayload: any = {
        name: templateName,
        language: { code: languageCode },
    }

    if (components && components.length > 0) {
        templatePayload.components = components
    }

    const body = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: templatePayload,
    }

    // #region agent log
    try { await prisma.whatsAppLog.create({ data: { type: 'DEBUG_SEND_TEMPLATE', payload: JSON.stringify({ phone, templateName, languageCode, components, fullPayload: body }) } }); } catch(e) {}
    // #endregion

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

// ─── Native Audio (Voice Message) helpers ───

/**
 * Uploads a media buffer (e.g. an Ogg Opus file) to Meta's servers.
 * Returns the media ID required to send it.
 */
export async function uploadMediaToWhatsApp(buffer: Buffer, mimeType: string): Promise<string> {
    const config = await getWhatsAppConfig()
    if (!config || !config.isConfigured) {
        throw new Error("WhatsApp no está configurado")
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`

    // We must use FormData for multipart/form-data upload
    const formData = new FormData()
    formData.append("messaging_product", "whatsapp")

    // Create a Blob from the Node.js Buffer
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
    formData.append("file", blob, "voice_message.ogg")

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiToken}`,
        },
        body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.error?.message || `Error subiendo media: ${response.status}`)
    }

    return data.id // Returns the media ID (valid for 30 days)
}

/**
 * Sends a previously uploaded audio using its media ID.
 */
export async function sendWhatsAppAudio(phone: string, mediaId: string) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    const body = {
        messaging_product: "whatsapp",
        to: phone,
        type: "audio",
        audio: { id: mediaId },
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

    // #region agent log
    const debugTemplates = (data.data || []).filter((t: any) => t.status === "APPROVED").slice(0, 8).map((t: any) => ({ name: t.name, components: t.components }));
    try { await prisma.whatsAppLog.create({ data: { type: 'DEBUG_META_RAW_TEMPLATES', payload: JSON.stringify(debugTemplates) } }); } catch(e) {}
    // #endregion

    return (data.data || [])
        .filter((t: any) => t.status === "APPROVED")
        .map((t: any) => {
            const bodyComponent = t.components?.find((c: any) => c.type === "BODY")
            return {
                id: t.id,
                name: t.name,
                language: t.language,
                category: t.category,
                status: t.status,
                bodyText: bodyComponent?.text || "",
                components: t.components || [],
            }
        })
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
    await prisma.whatsAppContact.upsert({
        where: { phone },
        update: {
            name: name || undefined,
            lastMessageAt: new Date(),
            totalMessages: { increment: 1 },
        },
        create: {
            phone,
            name: name || null,
            lastMessageAt: new Date(),
            totalMessages: 1,
        },
    })
}

export function maskToken(token: string): string {
    if (!token || token.length < 10) return "****"
    return token.substring(0, 6) + "..." + token.substring(token.length - 4)
}
