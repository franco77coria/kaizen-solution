import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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
        prisma.whatsAppMessage.count({ where: { direction: "inbound" } }),
        prisma.whatsAppMessage.count({ where: { direction: "outbound" } }),
        prisma.whatsAppContact.count(),
        prisma.whatsAppMessage.count({
            where: { direction: "inbound", timestamp: { gte: today } },
        }),
        prisma.whatsAppMessage.count({
            where: { direction: "outbound", timestamp: { gte: today } },
        }),
        prisma.whatsAppMessage.count({
            where: { direction: "inbound", isRead: false },
        }),
    ])

    // Response rate: contacts we've replied to / total contacts
    const contactsWithReplies = await prisma.whatsAppContact.count({
        where: {
            phone: {
                in: (
                    await prisma.whatsAppMessage.findMany({
                        where: { direction: "outbound" },
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
        where: { direction: "inbound" },
        orderBy: { timestamp: "desc" },
        take: 8,
    })

    return NextResponse.json({
        stats: {
            totalRecibidos,
            totalEnviados,
            totalContactos,
            recibidosHoy,
            enviadosHoy,
            noLeidos,
            tasaRespuesta,
        },
        recentMessages,
    })
}
