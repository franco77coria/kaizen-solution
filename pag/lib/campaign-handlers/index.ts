/**
 * campaign-handlers/index.ts — Factory para handlers de campañas
 *
 * Cada tipo de campaña (template, audio, image, sequence) tiene su propio handler
 * que implementa la interfaz CampaignHandler. Esto reemplaza el monolito de 929 líneas
 * del processor actual.
 */

import { SenderConfig } from "@/lib/sender-pool"

// ─── Types ───

export interface CampaignContext {
    campaign: any          // WhatsAppCampaign con includes
    mapping: Record<string, string>
    audioConfig?: any
    isTwilio: boolean
    appUrl: string
}

export interface JobResult {
    success: boolean
    messageId?: string
    cost?: number
    error?: string
}

export interface CampaignHandler {
    /**
     * Pre-procesamiento del batch (ej: pre-warm de audio, cache de imágenes).
     * Se ejecuta UNA VEZ antes de procesar los jobs del batch.
     */
    prepareBatch(ctx: CampaignContext, jobs: any[], contactMap: Map<string, any>): Promise<void>

    /**
     * Envía un mensaje individual.
     * Retorna el resultado del envío.
     */
    sendMessage(ctx: CampaignContext, job: any, contact: any, sender: SenderConfig): Promise<JobResult>

    /**
     * Tipo de mensaje para logging.
     */
    getMessageType(): string
}

// ─── Contact Field Resolver ───

/**
 * Resuelve un campo de contacto basado en el mapping de la campaña.
 * Centralizado para evitar duplicación entre handlers.
 */
export function resolveContactField(contact: any, columnMapped: string): string {
    if (!contact) return ""
    switch (columnMapped) {
        case "name": return contact.name || ""
        case "phone": return contact.phone || ""
        case "tags": {
            try { return JSON.parse(contact.tags || "[]").join(", ") } catch { return "" }
        }
        case "source": return contact.source || ""
        case "externalId": return contact.externalId || ""
        default: return ""
    }
}

/**
 * Reemplaza todas las variables {key} en un texto usando el mapping y contacto.
 */
export function resolveVariables(
    text: string,
    mapping: Record<string, string>,
    contact: any
): string {
    let result = text
    for (const [varKey, col] of Object.entries(mapping)) {
        const val = resolveContactField(contact, col)
        result = result.replace(new RegExp(`\\{${varKey}\\}`, "g"), val)
    }
    return result
}

// ─── Handler Factory ───

export function getHandler(campaignType: string): CampaignHandler {
    switch (campaignType) {
        case "template":
            // Lazy import para evitar circular dependencies
            return require("./template-handler").default
        case "audio":
            return require("./audio-handler").default
        case "image":
            return require("./image-handler").default
        case "sequence":
            return require("./sequence-handler").default
        default:
            throw new Error(`Tipo de campaña desconocido: ${campaignType}`)
    }
}
