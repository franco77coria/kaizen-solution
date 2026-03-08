import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Client } from "@upstash/qstash"

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
})

/**
 * POST /api/whatsapp/campaigns/[id]/retry-sequence
 *
 * Re-encola todos los jobs `failed` de una campaña de secuencia
 * para reenviar el audio. Útil cuando ElevenLabs falla en un batch completo.
 *
 * Flujo:
 * 1. Busca jobs en estado `failed` para la campaña
 * 2. Resetea cada uno a `processing`
 * 3. Encola `sequence_continue` via QStash para cada job
 */
export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const { id: campaignId } = params

    const campaign = await prisma.whatsAppCampaign.findUnique({
        where: { id: campaignId },
        select: { id: true, type: true },
    })

    if (!campaign) {
        return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    }

    if (campaign.type !== "sequence") {
        return NextResponse.json({ error: "Solo aplica a campañas de secuencia" }, { status: 400 })
    }

    // Buscar jobs fallidos
    const failedJobs = await prisma.campaignJob.findMany({
        where: { campaignId, status: "failed" },
        select: { id: true },
    })

    if (failedJobs.length === 0) {
        return NextResponse.json({ success: true, retried: 0, message: "No hay jobs fallidos" })
    }

    // Resetear a "processing" para que handleSequenceContinue los acepte
    await prisma.campaignJob.updateMany({
        where: { id: { in: failedJobs.map(j => j.id) }, status: "failed" },
        data: { status: "processing", errorMessage: null, processedAt: null },
    })

    // Encolar sequence_continue para cada job via QStash
    // Mismo fallback que usa el worker: UPSTASH_WEBHOOK_URL o la URL del worker
    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
    const webhookUrl = process.env.UPSTASH_WEBHOOK_URL || `${appUrl}/api/whatsapp/campaigns/worker`
    if (!webhookUrl || webhookUrl === "/api/whatsapp/campaigns/worker") {
        return NextResponse.json({ error: "No se pudo determinar la URL del webhook" }, { status: 500 })
    }

    let queued = 0
    for (const job of failedJobs) {
        try {
            await qstash.publishJSON({
                url: webhookUrl,
                body: { action: "sequence_continue", jobId: job.id },
            })
            queued++
        } catch (err: any) {
            console.error(`[retry-sequence] Error encolando job ${job.id}:`, err.message)
        }
    }

    return NextResponse.json({
        success: true,
        retried: queued,
        total: failedJobs.length,
        message: `${queued} de ${failedJobs.length} jobs encolados para reintento`,
    })
}
