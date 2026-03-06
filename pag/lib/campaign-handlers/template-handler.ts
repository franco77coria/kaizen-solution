/**
 * template-handler.ts — Handler para campañas de tipo "template"
 *
 * Envía mensajes con templates de WhatsApp (Twilio ContentSid o Meta native).
 */

import { CampaignHandler, CampaignContext, JobResult, resolveContactField } from "./index"
import { SenderConfig, callTwilioWithSender } from "@/lib/sender-pool"
import { prisma } from "@/lib/prisma"

const handler: CampaignHandler = {
    async prepareBatch(_ctx, _jobs, _contactMap) {
        // Templates no requieren pre-procesamiento
    },

    async sendMessage(ctx, job, contact, sender): Promise<JobResult> {
        const { campaign, mapping, isTwilio } = ctx

        if (isTwilio) {
            return sendTwilioTemplate(ctx, job, contact, sender)
        } else {
            return sendMetaTemplate(ctx, job, contact)
        }
    },

    getMessageType() {
        return "template"
    },
}

// ─── Twilio Template ───

async function sendTwilioTemplate(
    ctx: CampaignContext,
    job: any,
    contact: any,
    sender: SenderConfig
): Promise<JobResult> {
    const { campaign, mapping } = ctx
    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b))

    // Look up the ContentSid (HX...) for this specific sender's account.
    // Each Twilio account has its own ContentSids, so we must use the one
    // that belongs to the sender currently processing this job.
    let templateWabaId = campaign.template?.wabaId
    const templateName = campaign.template?.name
    const templateLanguage = campaign.template?.language

    if (templateName && templateLanguage && sender.phoneNumber) {
        const senderTemplate = await prisma.whatsAppTemplate.findUnique({
            where: {
                name_language_senderPhone: {
                    name: templateName,
                    language: templateLanguage,
                    senderPhone: sender.phoneNumber,
                },
            },
            select: { wabaId: true },
        })
        if (senderTemplate?.wabaId) {
            templateWabaId = senderTemplate.wabaId
        }
    }

    if (templateWabaId?.startsWith("HX")) {
        // ContentSid — funciona fuera de la ventana de 24h
        const vars: Record<string, string> = {}
        sortedEntries.forEach(([, col], i) => {
            vars[String(i + 1)] = resolveContactField(contact, col as string) || "Usuario"
        })

        const apiBody: Record<string, string> = {
            To: `whatsapp:${job.phone}`,
            ContentSid: templateWabaId,
        }
        if (Object.keys(vars).length > 0) {
            apiBody.ContentVariables = JSON.stringify(vars)
        }

        const data = await callTwilioWithSender(sender, apiBody)
        return {
            success: true,
            messageId: data.sid || "",
            cost: Math.abs(parseFloat(data.price || "0")),
        }
    } else {
        // Fallback: texto plano con sustitución de variables.
        // WARNING: esto fallará con 63016 si el contacto está fuera de la ventana de 24h.
        // Para evitarlo, sincroniza los templates desde la cuenta Twilio de cada sender.
        console.warn(`[TemplateHandler] Sender ${sender.phoneNumber} no tiene ContentSid (HX...) para template "${templateName}". Enviando texto plano — puede fallar con 63016.`)
        const parsedComponents = campaign.template?.components
            ? JSON.parse(campaign.template.components) : []
        const templateBodyText = parsedComponents.find((c: any) => c.type === "BODY")?.text || ""

        let text = templateBodyText || campaign.template?.name || ""
        const bodyParams: string[] = sortedEntries.map(
            ([, col]) => resolveContactField(contact, col as string) || "Usuario"
        )
        const requiredVarsCount = new Set(templateBodyText.match(/\{\{\d+\}\}/g) || []).size
        while (bodyParams.length < requiredVarsCount) bodyParams.push("...")
        bodyParams.forEach((val, i) => {
            text = text.replace(`{{${i + 1}}}`, val)
        })

        const data = await callTwilioWithSender(sender, {
            To: `whatsapp:${job.phone}`,
            Body: text,
        })

        return {
            success: true,
            messageId: data.sid || "",
            cost: Math.abs(parseFloat(data.price || "0")),
        }
    }
}

// ─── Meta Template ───

async function sendMetaTemplate(
    ctx: CampaignContext,
    job: any,
    contact: any
): Promise<JobResult> {
    const { campaign, mapping } = ctx

    const parsedComponents = campaign.template?.components
        ? JSON.parse(campaign.template.components) : []
    const templateBodyText = parsedComponents.find((c: any) => c.type === "BODY")?.text || ""

    const componentsParam: any[] = []
    const bodyParams: any[] = []

    // Extract named params from template components
    const allNamedParams: { componentType: string; param_name: string }[] = []
    for (const comp of parsedComponents) {
        const namedParams = comp.example?.header_text_named_params
            || comp.example?.body_text_named_params || []
        for (const p of namedParams) {
            if (p.param_name) {
                allNamedParams.push({ componentType: comp.type, param_name: p.param_name })
            }
        }
    }

    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b))
    let paramIdx = 0
    for (const [, columnMapped] of sortedEntries) {
        const val = resolveContactField(contact, columnMapped as string)
        const paramInfo = allNamedParams[paramIdx]
        bodyParams.push({
            type: "text",
            parameter_name: paramInfo?.param_name || String(paramIdx + 1),
            text: val || "Usuario",
        })
        paramIdx++
    }

    // Pad missing params
    while (bodyParams.length < allNamedParams.length) {
        const paramInfo = allNamedParams[bodyParams.length]
        bodyParams.push({
            type: "text",
            parameter_name: paramInfo?.param_name || String(bodyParams.length + 1),
            text: "...",
        })
    }

    const headerParams = bodyParams.filter(
        (_: any, i: number) => allNamedParams[i]?.componentType === "HEADER"
    )
    const realBodyParams = bodyParams.filter(
        (_: any, i: number) => allNamedParams[i]?.componentType === "BODY" || !allNamedParams[i]
    )

    if (headerParams.length > 0) componentsParam.push({ type: "header", parameters: headerParams })
    if (realBodyParams.length > 0) componentsParam.push({ type: "body", parameters: realBodyParams })

    // Buttons
    for (const comp of parsedComponents) {
        if (comp.type === "BUTTONS" && comp.buttons) {
            comp.buttons.forEach((btn: any, idx: number) => {
                if (btn.type === "FLOW") {
                    componentsParam.push({
                        type: "button",
                        sub_type: "flow",
                        index: String(idx),
                        parameters: [],
                    })
                }
            })
        }
    }

    // Load config for Meta API call
    const { getWhatsAppConfig } = require("@/lib/whatsapp")
    const config = await getWhatsAppConfig()

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: job.phone,
        type: "template",
        template: {
            name: campaign.template?.name,
            language: { code: campaign.template?.language || "es" },
            ...(componentsParam.length > 0 && { components: componentsParam }),
        },
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (res.ok && data.messages) {
        return {
            success: true,
            messageId: data.messages[0].id,
        }
    }

    throw new Error(data.error?.message || "Meta API Error")
}

export default handler
