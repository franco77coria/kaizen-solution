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
    provider: string
    apiToken: string
    phoneNumberId: string
    wabaId: string | null
    verifyToken: string
    apiVersion: string
    isConfigured: boolean
    twilioAccountSid: string | null
    twilioAuthToken: string | null
    twilioNumber: string | null
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
    const config = await prisma.whatsAppConfig.findFirst()
    if (!config) return null

    return {
        provider: config.provider,
        apiToken: decrypt(config.apiToken),
        phoneNumberId: config.phoneNumberId,
        wabaId: config.wabaId,
        verifyToken: config.verifyToken,
        apiVersion: config.apiVersion?.replace('v21.0', 'v22.0') || 'v22.0',
        isConfigured: config.isConfigured,
        twilioAccountSid: config.twilioAccountSid ? decrypt(config.twilioAccountSid) : null,
        twilioAuthToken: config.twilioAuthToken ? decrypt(config.twilioAuthToken) : null,
        twilioNumber: config.twilioNumber,
    }
}

export async function saveWhatsAppConfig(data: {
    provider?: string
    apiToken: string
    phoneNumberId: string
    wabaId?: string
    verifyToken?: string
    apiVersion?: string
    twilioAccountSid?: string
    twilioAuthToken?: string
    twilioNumber?: string
}): Promise<void> {
    const existing = await prisma.whatsAppConfig.findFirst()

    const provider = data.provider || "meta"

    // Para cada campo sensible: si viene con **** mantenemos el existente, si no lo encriptamos
    const encryptIfNew = (newVal: string | undefined, existing: string | null): string | null => {
        if (!newVal) return existing
        if (newVal.includes('****') || newVal.includes('...')) return existing
        return encrypt(newVal)
    }

    if (existing) {
        let finalApiToken = existing.apiToken
        if (data.apiToken && !data.apiToken.includes('****')) {
            finalApiToken = encrypt(data.apiToken)
        }

        await prisma.whatsAppConfig.update({
            where: { id: existing.id },
            data: {
                provider,
                apiToken: finalApiToken,
                phoneNumberId: data.phoneNumberId,
                wabaId: data.wabaId || null,
                verifyToken: data.verifyToken || "kaizen_whatsapp_2026",
                apiVersion: data.apiVersion || "v22.0",
                isConfigured: true,
                twilioAccountSid: encryptIfNew(data.twilioAccountSid, existing.twilioAccountSid),
                twilioAuthToken: encryptIfNew(data.twilioAuthToken, existing.twilioAuthToken),
                twilioNumber: data.twilioNumber || existing.twilioNumber,
            },
        })
    } else {
        await prisma.whatsAppConfig.create({
            data: {
                provider,
                apiToken: encrypt(data.apiToken),
                phoneNumberId: data.phoneNumberId,
                wabaId: data.wabaId || null,
                verifyToken: data.verifyToken || "kaizen_whatsapp_2026",
                apiVersion: data.apiVersion || "v22.0",
                isConfigured: true,
                twilioAccountSid: data.twilioAccountSid ? encrypt(data.twilioAccountSid) : null,
                twilioAuthToken: data.twilioAuthToken ? encrypt(data.twilioAuthToken) : null,
                twilioNumber: data.twilioNumber || null,
            },
        })
    }
}

// ─── Twilio API helpers ───

export async function callTwilioAPI(
    config: WhatsAppConfig,
    body: Record<string, string>
) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
        throw new Error("Twilio no está configurado. Agregá las credenciales en Configuración.")
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`
    const credentials = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")

    // Agregar StatusCallback para recibir actualizaciones de entrega
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    const params = { ...body }
    if (appUrl) {
        params.StatusCallback = `${appUrl}/api/whatsapp/twilio-status`
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
        throw new Error(data?.message || `Twilio error: ${response.status}`)
    }

    return data
}

export async function testTwilioConnection(config: WhatsAppConfig) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
        throw new Error("Credenciales Twilio no configuradas")
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}.json`
    const credentials = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")

    const response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
    })

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.message || `Twilio error: ${response.status}`)
    }

    return { friendlyName: data.friendly_name, status: data.status }
}

export async function getTwilioTemplates(config: WhatsAppConfig) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
        throw new Error("Credenciales Twilio no configuradas")
    }

    const credentials = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")
    const response = await fetch("https://content.twilio.com/v1/Content?PageSize=50", {
        headers: { Authorization: `Basic ${credentials}` },
    })

    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.message || `Twilio Content API error: ${response.status}`)
    }

    return (data.contents || []) as any[]
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
    languageCode: string,
    components: any[] = [],
    templateBodyText?: string
) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    if (config.provider === "twilio") {
        if (!config.twilioNumber) throw new Error("Número Twilio no configurado")

        // Look up template to get ContentSid (HX...)
        const dbTemplate = await prisma.whatsAppTemplate.findFirst({
            where: { name: templateName, language: languageCode },
            select: { wabaId: true },
        })

        if (dbTemplate?.wabaId?.startsWith("HX")) {
            // Use ContentSid — works outside 24h window
            const vars: Record<string, string> = {}
            if (components.length > 0) {
                const bodyComp = components.find((c: any) => c.type === "body")
                const params: string[] = bodyComp?.parameters?.map((p: any) => p.text || "") || []
                params.forEach((val, i) => { vars[String(i + 1)] = val })
            }
            const apiBody: Record<string, string> = {
                From: `whatsapp:${config.twilioNumber}`,
                To: `whatsapp:${phone}`,
                ContentSid: dbTemplate.wabaId,
            }
            if (Object.keys(vars).length > 0) {
                apiBody.ContentVariables = JSON.stringify(vars)
            }
            return callTwilioAPI(config, apiBody)
        }

        // Fallback: plain text substitution (within 24h window only)
        let text = templateBodyText || templateName
        if (components.length > 0) {
            const bodyComp = components.find((c: any) => c.type === "body")
            const params: string[] = bodyComp?.parameters?.map((p: any) => p.text || "") || []
            params.forEach((val, i) => { text = text.replace(`{{${i + 1}}}`, val) })
        }
        return callTwilioAPI(config, {
            From: `whatsapp:${config.twilioNumber}`,
            To: `whatsapp:${phone}`,
            Body: text,
        })
    }

    const body: any = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
        },
    }

    if (components && components.length > 0) {
        body.template.components = components
    }

    return callWhatsAppAPI(`${config.phoneNumberId}/messages`, "POST", body)
}

export async function sendWhatsAppText(phone: string, message: string) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    if (config.provider === "twilio") {
        if (!config.twilioNumber) throw new Error("Número Twilio no configurado")
        return callTwilioAPI(config, {
            From: `whatsapp:${config.twilioNumber}`,
            To: `whatsapp:${phone}`,
            Body: message,
        })
    }

    const body = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
    }

    return callWhatsAppAPI(`${config.phoneNumberId}/messages`, "POST", body)
}

export async function sendWhatsAppImage(phone: string, imageUrl: string, caption?: string) {
    const config = await getWhatsAppConfig()
    if (!config) throw new Error("WhatsApp no configurado")

    const body: any = {
        messaging_product: "whatsapp",
        to: phone,
        type: "image",
        image: { link: imageUrl },
    }
    if (caption) body.image.caption = caption

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
