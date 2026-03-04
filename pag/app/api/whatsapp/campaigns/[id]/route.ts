import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = request.nextUrl
    const statusFilter = searchParams.get("status") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = 50

    try {
        const campaign = await prisma.whatsAppCampaign.findUnique({
            where: { id: params.id },
            include: {
                list: true,
                template: true,
                _count: { select: { jobs: true } },
            },
        })

        if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

        const whereJobs = {
            campaignId: params.id,
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        }

        const [jobs, totalJobs] = await Promise.all([
            prisma.campaignJob.findMany({
                where: whereJobs,
                orderBy: { createdAt: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.campaignJob.count({ where: whereJobs }),
        ])

        // Conteos por estado
        const statusCounts = await prisma.campaignJob.groupBy({
            by: ["status"],
            where: { campaignId: params.id },
            _count: { status: true },
        })

        const counts: Record<string, number> = {}
        for (const s of statusCounts) {
            counts[s.status] = s._count.status
        }

        return NextResponse.json({
            campaign: {
                ...campaign,
                stats: JSON.parse(campaign.stats || "{}"),
            },
            jobs,
            pagination: {
                page,
                pageSize,
                total: totalJobs,
                totalPages: Math.ceil(totalJobs / pageSize),
            },
            counts: {
                all: campaign._count.jobs,
                pending: counts.pending || 0,
                sent: counts.sent || 0,
                delivered: counts.delivered || 0,
                read: counts.read || 0,
                failed: counts.failed || 0,
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {
        await prisma.whatsAppCampaign.delete({ where: { id: params.id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
