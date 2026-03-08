/**
 * worker/route.ts — Worker distribuido para procesamiento de campañas
 *
 * Este es el NUEVO procesador que reemplaza al monolito de 929 líneas.
 * 
 * Características:
 * - Multi-sender: cada invocación procesa jobs con un sender específico
 * - Rate limiting adaptativo: ajusta velocidad según errores
 * - Handlers modulares: delega a template/audio/image/sequence handlers
 * - Retry automático con backoff exponencial
 * - Health tracking: deshabilita senders que fallan consistentemente
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Client } from "@upstash/qstash"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { getWhatsAppConfig } from "@/lib/whatsapp"
import { logApiUsage } from "@/lib/elevenlabs"
import { SenderPool, TwilioSenderError } from "@/lib/sender-pool"
import { AdaptiveRateLimiter, sleep } from "@/lib/rate-limiter"
import { getHandler, CampaignContext } from "@/lib/campaign-handlers"

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
})

const MAX_MPS_CAP = 50 // Límite global de mensajes por segundo

// ─── Worker Entry Point ───

export const POST = verifySignatureAppRouter(async (req: Request) => {
    try {
        const body = await req.json()
        const { campaignId, senderId, batchSize = 50, action, jobId } = body

        // Ruta legacy: sequence continuation
        if (action === "sequence_continue" && jobId) {
            return handleSequenceContinue(jobId)
        }

        // Ruta legacy: process_batch sin senderId (compatibilidad con el processor viejo)
        if (action === "process_batch" || !senderId) {
            return processBatchWithPool(campaignId, batchSize)
        }

        // Ruta nueva: batch con sender específico
        return processBatchWithSender(campaignId, senderId, batchSize)

    } catch (error: any) {
        console.error("[Worker] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// ─── Process Batch con Pool automático ───

async function processBatchWithPool(campaignId: string, batchSize: number): Promise<Response> {
    if (!campaignId) {
        return NextResponse.json({ error: "Missing campaignId" }, { status: 400 })
    }

    const campaign = await prisma.whatsAppCampaign.findUnique({
        where: { id: campaignId },
        include: { template: true },
    })

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (campaign.status !== "running") {
        return NextResponse.json({ success: true, message: `Abortado por estado ${campaign.status}` })
    }

    // Verificar si hay jobs pendientes
    const pendingCount = await prisma.campaignJob.count({
        where: { campaignId, status: "pending" },
    })

    if (pendingCount === 0) {
        // Verificar sequence awaiting_reply
        if (campaign.type === "sequence") {
            const awaitingCount = await prisma.campaignJob.count({
                where: { campaignId, status: { in: ["awaiting_reply", "processing"] } },
            })
            if (awaitingCount > 0) {
                return NextResponse.json({ success: true, message: `Sequence: ${awaitingCount} esperando respuesta` })
            }
        }

        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { status: "completed" },
        })
        return NextResponse.json({ success: true, message: "Campaña completada" })
    }

    // Inicializar sender pool
    const pool = new SenderPool()
    await pool.initialize()

    const config = await getWhatsAppConfig()
    if (!config?.isConfigured) {
        throw new Error("WhatsApp config faltante")
    }

    const isTwilio = config.provider === "twilio"

    if (isTwilio && pool.isReady()) {
        // Multi-sender: distribuir jobs entre senders
        const distribution = pool.distribute(Math.min(pendingCount, batchSize))

        if (distribution.length === 0) {
            return NextResponse.json({ error: "Todos los senders agotados" }, { status: 429 })
        }

        // Encolar un batch por sender
        const webhookUrl = getWorkerUrl()
        for (const { senderId, jobCount } of distribution) {
            await qstash.publishJSON({
                url: webhookUrl,
                body: { campaignId, senderId, batchSize: jobCount },
            })
        }

        return NextResponse.json({
            success: true,
            message: `Distributed ${Math.min(pendingCount, batchSize)} jobs across ${distribution.length} senders`,
        })
    } else {
        // Fallback: procesar con config global (sin multi-sender)
        return processFallbackBatch(campaign, config, batchSize)
    }
}

// ─── Process Batch con Sender Específico ───

async function processBatchWithSender(
    campaignId: string,
    senderId: string,
    batchSize: number
): Promise<Response> {
    const campaign = await prisma.whatsAppCampaign.findUnique({
        where: { id: campaignId },
        include: { template: true },
    })

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (campaign.status !== "running") {
        return NextResponse.json({ success: true, message: `Abortado por estado ${campaign.status}` })
    }

    // Cargar sender
    const pool = new SenderPool()
    await pool.initialize()
    const sender = pool.getSenderById(senderId)
    if (!sender) {
        return NextResponse.json({ error: `Sender ${senderId} not available` }, { status: 400 })
    }

    // Config
    const config = await getWhatsAppConfig()
    if (!config?.isConfigured) throw new Error("WhatsApp config faltante")

    const isTwilio = config.provider === "twilio"
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")

    // Claim jobs atómicamente usando SKIP LOCKED para evitar race conditions
    // entre múltiples senders corriendo en paralelo.
    const claimedRows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE "CampaignJob"
        SET status = 'processing'
        WHERE id IN (
            SELECT id FROM "CampaignJob"
            WHERE "campaignId" = ${campaignId} AND status = 'pending'
            ORDER BY "createdAt" ASC
            LIMIT ${batchSize}
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id
    `

    if (claimedRows.length === 0) {
        return NextResponse.json({ success: true, message: "No pending jobs to claim" })
    }

    const claimedIds = claimedRows.map(r => r.id)
    const pendingJobs = await prisma.campaignJob.findMany({
        where: { id: { in: claimedIds } },
        orderBy: { createdAt: "asc" },
    })

    // Resolver contactos
    const phones = pendingJobs.map(j => j.phone)
    const contacts = await prisma.whatsAppContact.findMany({
        where: { phone: { in: phones } },
    })
    const contactMap = new Map(contacts.map(c => [c.phone, c]))

    // Contexto de campaña
    const mapping = JSON.parse(campaign.mapping || "{}")
    const audioConfig = campaign.audioConfig ? JSON.parse(campaign.audioConfig) : null

    const ctx: CampaignContext = {
        campaign,
        mapping,
        audioConfig,
        isTwilio,
        appUrl,
    }

    // Obtener handler según tipo
    const handler = getHandler(campaign.type)

    // Pre-procesamiento del batch
    // Si prepareBatch falla, resetear los jobs a "pending" para que QStash pueda reintentar
    try {
        await handler.prepareBatch(ctx, pendingJobs, contactMap)
    } catch (prepareErr: any) {
        await prisma.campaignJob.updateMany({
            where: { id: { in: claimedIds }, status: "processing" },
            data: { status: "pending" },
        })
        throw prepareErr
    }

    // Rate limiter adaptativo para este sender (con cap global de MAX_MPS_CAP)
    const rateLimiter = new AdaptiveRateLimiter(Math.min(sender.maxMps, MAX_MPS_CAP))

    let successCount = 0
    let failCount = 0

    // Procesar jobs
    for (let i = 0; i < pendingJobs.length; i++) {
        const job = pendingJobs[i]
        const contact = contactMap.get(job.phone) || null

        try {
            // Esperar token del rate limiter
            await rateLimiter.waitForToken()

            // Enviar
            const result = await handler.sendMessage(ctx, job, contact, sender)

            // Actualizar job
            const jobStatus = campaign.type === "sequence" ? "awaiting_reply" : "sent"
            await prisma.campaignJob.update({
                where: { id: job.id },
                data: {
                    status: jobStatus,
                    messageId: result.messageId || undefined,
                    senderId: sender.id,
                    cost: result.cost || 0,
                    processedAt: new Date(),
                },
            })

            // Registrar envío en sender
            await pool.recordSend(sender.id)

            // Registrar mensaje
            const msgType = handler.getMessageType()
            try {
                await prisma.whatsAppMessage.create({
                    data: {
                        messageId: result.messageId || undefined,
                        direction: "outbound",
                        phone: job.phone,
                        content: `[${msgType} - ${campaign.name}]`,
                        type: msgType,
                        status: "sent",
                        timestamp: new Date(),
                    },
                })
            } catch (_) { /* duplicate messageId */ }

            // Log de uso
            const templateCategory = (campaign.template?.category || "UTILITY").toUpperCase()
            const estimatedCost = templateCategory === "MARKETING" ? 0.0615
                : templateCategory === "AUTHENTICATION" ? 0.0325
                    : templateCategory === "UTILITY" ? 0.0200
                        : 0.0085

            await logApiUsage(
                isTwilio ? "twilio" : "whatsapp",
                `${campaign.type}_send`,
                1,
                result.cost || estimatedCost,
                {
                    phone: job.phone,
                    campaignId,
                    messageId: result.messageId,
                    senderId: sender.id,
                    senderName: sender.name,
                }
            )

            rateLimiter.onSuccess()
            successCount++

        } catch (err: any) {
            // Manejar error fatal del sender
            if (err instanceof TwilioSenderError && err.isFatal) {
                await pool.markUnhealthy(sender.id, err.message)
                console.error(`[Worker] Sender ${sender.id} marcado como no saludable: ${err.message}`)
                // No seguir procesando con este sender
                break
            }

            // Rate limit → backoff
            if (err.message?.includes("429")) {
                rateLimiter.onRateLimit()
            }

            await prisma.campaignJob.update({
                where: { id: job.id },
                data: {
                    status: "failed",
                    errorMessage: err.message,
                    senderId: sender.id,
                    processedAt: new Date(),
                },
            })
            failCount++
        }
    }

    // Actualizar stats de la campaña
    const prevStats = JSON.parse(campaign.stats || "{}")
    prevStats.sent = (prevStats.sent || 0) + successCount
    prevStats.failed = (prevStats.failed || 0) + failCount

    await prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { stats: JSON.stringify(prevStats) },
    })

    // Encolar siguiente batch si hay más pendientes
    const remainingPending = await prisma.campaignJob.count({
        where: { campaignId, status: "pending" },
    })

    if (remainingPending > 0) {
        const webhookUrl = getWorkerUrl()
        // Continuar con el mismo sender y batchSize fijo para evitar degradación
        await qstash.publishJSON({
            url: webhookUrl,
            body: { campaignId, senderId, batchSize: 50 },
        })
    } else {
        // Verificar si la campaña está completa
        const stillProcessing = await prisma.campaignJob.count({
            where: { campaignId, status: { in: ["pending", "awaiting_reply", "processing"] } },
        })
        if (stillProcessing === 0) {
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: { status: "completed" },
            })
        }
    }

    return NextResponse.json({
        success: true,
        sender: sender.name,
        processed: successCount + failCount,
        sent: successCount,
        failed: failCount,
        remaining: remainingPending,
    })
}

// ─── Fallback: sin multi-sender (compatibilidad) ───

async function processFallbackBatch(campaign: any, config: any, batchSize: number): Promise<Response> {
    // Importar el procesador legacy si no hay multi-sender configurado
    // Esto mantiene compatibilidad con el sistema actual
    const webhookUrl = process.env.UPSTASH_WEBHOOK_URL || getWorkerUrl()

    await qstash.publishJSON({
        url: webhookUrl,
        body: {
            action: "process_batch",
            campaignId: campaign.id,
            batchSize,
        },
    })

    return NextResponse.json({
        success: true,
        message: "Fallback: routed to legacy processor (no multi-sender configured)",
    })
}

// ─── Sequence Continuation (legacy support) ───

async function handleSequenceContinue(jobId: string): Promise<Response> {
    // Redirigir al processor legacy para sequence continuation
    // TODO: migrar esta lógica también cuando estabilicemos los handlers
    const webhookUrl = process.env.UPSTASH_WEBHOOK_URL
    if (webhookUrl) {
        await qstash.publishJSON({
            url: webhookUrl,
            body: { action: "sequence_continue", jobId },
        })
    }
    return NextResponse.json({ success: true, message: "Sequence continue queued" })
}

// ─── Helpers ───

function getWorkerUrl(): string {
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
    return `${appUrl}/api/whatsapp/campaigns/worker`
}
