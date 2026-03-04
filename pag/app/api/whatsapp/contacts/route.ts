import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const listId = searchParams.get("list")
        const search = searchParams.get("search") || ""
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50")))

        const whereClause: any = {}
        if (listId) {
            whereClause.listSubscriptions = {
                some: { listId }
            }
        }
        if (search) {
            whereClause.OR = [
                { phone: { contains: search } },
                { name: { contains: search, mode: "insensitive" } },
            ]
        }

        const [total, contacts] = await Promise.all([
            prisma.whatsAppContact.count({ where: whereClause }),
            prisma.whatsAppContact.findMany({
                where: whereClause,
                orderBy: { lastMessageAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ])

        const now = new Date()
        const phones = contacts.map(c => c.phone)

        if (phones.length === 0) {
            return NextResponse.json({
                contacts: [],
                pagination: { page, pageSize, total, totalPages: 0 },
            })
        }

        const unreadCounts = await prisma.whatsAppMessage.groupBy({
            by: ['phone'],
            where: {
                phone: { in: phones },
                direction: 'inbound',
                isRead: false,
            },
            _count: { id: true },
        })
        const unreadMap = new Map(unreadCounts.map(u => [u.phone, u._count.id]))

        const lastMessagesRaw = await prisma.whatsAppMessage.findMany({
            where: { phone: { in: phones } },
            orderBy: { timestamp: 'desc' },
            select: { phone: true, content: true, direction: true, timestamp: true },
        })
        const lastMsgMap = new Map<string, { content: string, direction: string }>()
        for (const m of lastMessagesRaw) {
            if (!lastMsgMap.has(m.phone)) {
                lastMsgMap.set(m.phone, { content: m.content, direction: m.direction })
            }
        }

        const contactsWithMeta = contacts.map((c) => {
            const lastMsg = c.lastMessageAt ? new Date(c.lastMessageAt) : null
            const windowEnd = lastMsg
                ? new Date(lastMsg.getTime() + 24 * 60 * 60 * 1000)
                : null
            const hasWindow = windowEnd ? windowEnd > now : false

            const lastMessage = lastMsgMap.get(c.phone)
            let preview = lastMessage?.content || ""
            if (preview.length > 50) preview = preview.substring(0, 50) + "..."

            return {
                ...c,
                hasWindow,
                windowEnd: windowEnd?.toISOString() || null,
                unreadCount: unreadMap.get(c.phone) || 0,
                lastMessage: preview,
                lastMessageDirection: lastMessage?.direction || null,
            }
        })

        return NextResponse.json({
            contacts: contactsWithMeta,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Error al obtener contactos" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { phone, notes } = body

        if (!phone) {
            return NextResponse.json({ error: "Phone requerido" }, { status: 400 })
        }

        await prisma.whatsAppContact.update({
            where: { phone },
            data: { notes },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Error al actualizar contacto" }, { status: 500 })
    }
}
