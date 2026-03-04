import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const service = searchParams.get("service") // "whatsapp" | "elevenlabs" | null (all)
        const days = parseInt(searchParams.get("days") || "30")

        const since = new Date()
        since.setDate(since.getDate() - days)

        const where: any = { createdAt: { gte: since } }
        if (service) where.service = service

        // Get recent logs
        const logs = await prisma.apiUsageLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        })

        // Get today's stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayWhere = { createdAt: { gte: today } }

        const [waToday, elToday, waMonth, elMonth] = await Promise.all([
            prisma.apiUsageLog.aggregate({
                where: { ...todayWhere, service: "whatsapp" },
                _sum: { units: true, cost: true },
                _count: true,
            }),
            prisma.apiUsageLog.aggregate({
                where: { ...todayWhere, service: "elevenlabs" },
                _sum: { units: true, cost: true },
                _count: true,
            }),
            prisma.apiUsageLog.aggregate({
                where: { ...where, service: "whatsapp" },
                _sum: { units: true, cost: true },
                _count: true,
            }),
            prisma.apiUsageLog.aggregate({
                where: { ...where, service: "elevenlabs" },
                _sum: { units: true, cost: true },
                _count: true,
            }),
        ])

        // Daily breakdown for chart (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const dailyLogs = await prisma.apiUsageLog.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { service: true, units: true, cost: true, createdAt: true },
        })

        // Group by day
        const dailyMap: Record<string, { whatsapp: number; elevenlabs: number }> = {}
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().split("T")[0]
            dailyMap[key] = { whatsapp: 0, elevenlabs: 0 }
        }

        for (const log of dailyLogs) {
            const key = log.createdAt.toISOString().split("T")[0]
            if (dailyMap[key]) {
                dailyMap[key][log.service as "whatsapp" | "elevenlabs"] += log.units
            }
        }

        const dailyChart = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
                date,
                label: new Date(date + "T12:00:00").toLocaleDateString("es", { weekday: "short", day: "numeric" }),
                ...data,
            }))

        return NextResponse.json({
            stats: {
                whatsapp: {
                    today: { messages: waToday._sum.units || 0, cost: waToday._sum.cost || 0, calls: waToday._count },
                    period: { messages: waMonth._sum.units || 0, cost: waMonth._sum.cost || 0, calls: waMonth._count },
                },
                elevenlabs: {
                    today: { chars: elToday._sum.units || 0, cost: elToday._sum.cost || 0, calls: elToday._count },
                    period: { chars: elMonth._sum.units || 0, cost: elMonth._sum.cost || 0, calls: elMonth._count },
                },
            },
            dailyChart,
            logs: logs.map((l) => ({
                id: l.id,
                service: l.service,
                operation: l.operation,
                units: l.units,
                cost: l.cost,
                metadata: l.metadata,
                createdAt: l.createdAt,
            })),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
