import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getWhatsAppConfig } from "@/lib/whatsapp"

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    const dateFilterMsg: any = {}
    const dateFilterJob: any = {}

    if (startDateParam || endDateParam) {
        if (startDateParam) {
            dateFilterMsg.timestamp = { ...dateFilterMsg.timestamp, gte: new Date(startDateParam) }
            dateFilterJob.createdAt = { ...dateFilterJob.createdAt, gte: new Date(startDateParam) }
        }
        if (endDateParam) {
            // Añadimos 23:59:59.999 al endDate
            const endD = new Date(endDateParam)
            endD.setHours(23, 59, 59, 999)
            dateFilterMsg.timestamp = { ...dateFilterMsg.timestamp, lte: endD }
            dateFilterJob.createdAt = { ...dateFilterJob.createdAt, lte: endD }
        }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
        totalRecibidos,
        totalEnviados,
        totalContactos,
        recibidosHoy,
        enviadosHoy,
        noLeidos,
    ] = await Promise.all([
        prisma.whatsAppMessage.count({ where: { direction: "inbound", ...dateFilterMsg } }),
        prisma.whatsAppMessage.count({ where: { direction: "outbound", ...dateFilterMsg } }),
        prisma.whatsAppContact.count(),
        prisma.whatsAppMessage.count({
            where: { direction: "inbound", timestamp: { gte: today } },
        }),
        prisma.whatsAppMessage.count({
            where: { direction: "outbound", timestamp: { gte: today } },
        }),
        prisma.whatsAppMessage.count({
            where: { direction: "inbound", isRead: false, ...dateFilterMsg },
        }),
    ])

    // Response rate: contacts we've replied to / total contacts
    const contactsWithReplies = await prisma.whatsAppContact.count({
        where: {
            phone: {
                in: (
                    await prisma.whatsAppMessage.findMany({
                        where: { direction: "outbound", ...dateFilterMsg },
                        select: { phone: true },
                        distinct: ["phone"],
                    })
                ).map((m) => m.phone),
            },
        },
    })

    const tasaRespuesta =
        totalContactos > 0
            ? Math.round((contactsWithReplies / totalContactos) * 100)
            : 0

    // Recent messages
    const recentMessages = await prisma.whatsAppMessage.findMany({
        where: { direction: "inbound", ...dateFilterMsg },
        orderBy: { timestamp: "desc" },
        take: 8,
    })

    // Estadísticas de Campañas Masivas
    const totalCampaignJobs = await prisma.campaignJob.count({ where: dateFilterJob })
    const deliveredCampaignJobs = await prisma.campaignJob.count({ where: { status: 'delivered', ...dateFilterJob } })
    const readCampaignJobs = await prisma.campaignJob.count({ where: { status: 'read', ...dateFilterJob } })
    const failedCampaignJobs = await prisma.campaignJob.count({ where: { status: 'failed', ...dateFilterJob } })

    // Cálculos Financieros (Basado en Jobs Enviados)
    // Asumimos un costo promedio por Template ($0.06 USD para Latam)
    // Asumimos Audio IA: Meta Service Conversation ($0.06) + ElevenLabs ($0.015) = $0.075 USD
    const META_TEMPLATE_COST = 0.06;
    const META_AUDIO_COST = 0.06;
    const ELEVENLABS_AVG_COST = 0.015;

    const templateJobs = await prisma.campaignJob.count({
        where: {
            status: { in: ['delivered', 'read'] },
            campaign: { type: 'template' },
            ...dateFilterJob
        }
    });

    const audioJobs = await prisma.campaignJob.count({
        where: {
            status: { in: ['delivered', 'read'] },
            campaign: { type: 'audio' },
            ...dateFilterJob
        }
    });

    const costMetaTemplates = templateJobs * META_TEMPLATE_COST;
    const costMetaAudios = audioJobs * META_AUDIO_COST;
    const costElevenLabs = audioJobs * ELEVENLABS_AVG_COST;

    const financials = {
        meta: costMetaTemplates + costMetaAudios,
        elevenlabs: costElevenLabs,
        total: costMetaTemplates + costMetaAudios + costElevenLabs,
        templateJobs,
        audioJobs
    };

    // Health / Quality Rating desde Meta
    let accountHealth = { status: "UNKNOWN", qualityRating: "UNKNOWN" };
    try {
        const config = await getWhatsAppConfig();
        if (config?.apiToken && config?.phoneNumberId) {
            const fbRes = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?fields=quality_rating,status`, {
                headers: { Authorization: `Bearer ${config.apiToken}` }
            });
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                accountHealth = {
                    status: fbData.status || "UNKNOWN",
                    qualityRating: fbData.quality_rating || "UNKNOWN"
                };
            }
        }
    } catch (e) {
        console.error("Error fetching WABA Health", e);
    }

    return NextResponse.json({
        stats: {
            totalRecibidos,
            totalEnviados,
            totalContactos,
            recibidosHoy,
            enviadosHoy,
            noLeidos,
            tasaRespuesta,
            campaigns: {
                total: totalCampaignJobs,
                delivered: deliveredCampaignJobs,
                read: readCampaignJobs,
                failed: failedCampaignJobs
            },
            financials,
            health: accountHealth
        },
        recentMessages,
    })
}
