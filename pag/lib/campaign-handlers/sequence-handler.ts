/**
 * sequence-handler.ts — Handler para campañas de tipo "sequence"
 *
 * Envía un template primero, luego espera la respuesta del contacto.
 * Cuando el contacto responde, se dispara la continuación (audio + imagen).
 * El estado del job es "awaiting_reply" mientras espera.
 */

import { CampaignHandler, CampaignContext, JobResult, resolveContactField } from "./index"
import { SenderConfig, callTwilioWithSender } from "@/lib/sender-pool"

const handler: CampaignHandler = {
    async prepareBatch(_ctx, _jobs, _contactMap) {
        // Sequences: la primera fase solo envía templates, sin pre-procesamiento especial
    },

    async sendMessage(ctx, job, contact, sender): Promise<JobResult> {
        const { campaign, mapping, isTwilio } = ctx

        // La primera fase de sequence es enviar el template
        // (la continuación con audio se maneja en handleSequenceContinue)
        if (isTwilio) {
            return sendTwilioSequenceTemplate(ctx, job, contact, sender)
        } else {
            return sendMetaSequenceTemplate(ctx, job, contact)
        }
    },

    getMessageType() {
        return "sequence"
    },
}

async function sendTwilioSequenceTemplate(
    ctx: CampaignContext,
    job: any,
    contact: any,
    sender: SenderConfig
): Promise<JobResult> {
    const { campaign, mapping } = ctx
    const templateWabaId = campaign.template?.wabaId
    const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b))

    if (templateWabaId?.startsWith("HX")) {
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
    }

    // Fallback text
    const parsedComponents = campaign.template?.components
        ? JSON.parse(campaign.template.components) : []
    const templateBodyText = parsedComponents.find((c: any) => c.type === "BODY")?.text || ""

    let text = templateBodyText || campaign.template?.name || ""
    const bodyParams: string[] = sortedEntries.map(
        ([, col]) => resolveContactField(contact, col as string) || "Usuario"
    )
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

async function sendMetaSequenceTemplate(
    ctx: CampaignContext,
    job: any,
    contact: any
): Promise<JobResult> {
    const { campaign, mapping } = ctx
    const { getWhatsAppConfig } = require("@/lib/whatsapp")
    const config = await getWhatsAppConfig()

    const parsedComponents = campaign.template?.components
        ? JSON.parse(campaign.template.components) : []

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
    const bodyParams: any[] = []
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

    const componentsParam: any[] = []
    const headerParams = bodyParams.filter((_: any, i: number) => allNamedParams[i]?.componentType === "HEADER")
    const realBodyParams = bodyParams.filter((_: any, i: number) => allNamedParams[i]?.componentType === "BODY" || !allNamedParams[i])
    if (headerParams.length > 0) componentsParam.push({ type: "header", parameters: headerParams })
    if (realBodyParams.length > 0) componentsParam.push({ type: "body", parameters: realBodyParams })

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
