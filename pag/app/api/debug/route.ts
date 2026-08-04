import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/whatsapp"
import { requireAdmin } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // Expone logs de WhatsApp, senders y teléfonos: nunca público.
    const denied = await requireAdmin()
    if (denied) return denied

    const { searchParams } = request.nextUrl
    const mode = searchParams.get("mode")

    // mode=templates — diagnóstico de templates por sender
    if (mode === "templates") {
        const senders = await prisma.twilioSender.findMany({
            where: { isActive: true },
            select: { id: true, name: true, phoneNumber: true, isHealthy: true },
        })

        const allTemplates = await prisma.whatsAppTemplate.findMany({
            select: { id: true, name: true, language: true, senderPhone: true, wabaId: true, status: true },
            orderBy: { senderPhone: "asc" },
        })

        // Agrupar templates por senderPhone
        const templatesBySender: Record<string, any[]> = {}
        for (const t of allTemplates) {
            const key = t.senderPhone || "(global/meta)"
            if (!templatesBySender[key]) templatesBySender[key] = []
            templatesBySender[key].push(t)
        }

        return NextResponse.json({ senders, templatesBySender })
    }

    // mode=campaign — diagnóstico de una campaña específica
    if (mode === "campaign") {
        const campaignId = searchParams.get("id")
        if (!campaignId) return NextResponse.json({ error: "Falta id" }, { status: 400 })

        const campaign = await prisma.whatsAppCampaign.findUnique({
            where: { id: campaignId },
            include: { template: true },
        })
        if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

        const senders = await prisma.twilioSender.findMany({
            where: { isActive: true, isHealthy: true },
            select: { id: true, name: true, phoneNumber: true },
        })

        // Para cada sender activo, verificar si tiene el template en DB
        const lookups = await Promise.all(
            senders.map(async (sender) => {
                const found = await prisma.whatsAppTemplate.findUnique({
                    where: {
                        name_language_senderPhone: {
                            name: campaign.template?.name || "",
                            language: campaign.template?.language || "",
                            senderPhone: sender.phoneNumber,
                        },
                    },
                    select: { wabaId: true, status: true },
                })
                return {
                    sender: sender.name,
                    phoneNumber: sender.phoneNumber,
                    templateFound: !!found,
                    wabaId: found?.wabaId || null,
                    hasHX: found?.wabaId?.startsWith("HX") || false,
                    templateStatus: found?.status || null,
                    willWork: found?.wabaId?.startsWith("HX") || false,
                }
            })
        )

        return NextResponse.json({
            campaign: { id: campaign.id, name: campaign.name, type: campaign.type },
            template: {
                name: campaign.template?.name,
                language: campaign.template?.language,
                wabaId: campaign.template?.wabaId,
            },
            senderLookups: lookups,
        })
    }

    // default — logs recientes
    const logs = await prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
    })
    return NextResponse.json(logs)
}
