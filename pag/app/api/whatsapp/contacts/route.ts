import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const listId = searchParams.get("list")

        const whereClause: any = {}
        if (listId) {
            whereClause.listSubscriptions = {
                some: {
                    listId: listId
                }
            }
        }

        const contacts = await prisma.whatsAppContact.findMany({
            where: whereClause,
            orderBy: { lastMessageAt: "desc" },
        })

        const now = new Date()
        const contactsWithWindow = contacts.map((c) => {
            const lastMsg = c.lastMessageAt ? new Date(c.lastMessageAt) : null
            const windowEnd = lastMsg
                ? new Date(lastMsg.getTime() + 24 * 60 * 60 * 1000)
                : null
            const hasWindow = windowEnd ? windowEnd > now : false

            return {
                ...c,
                hasWindow,
                windowEnd: windowEnd?.toISOString() || null,
            }
        })

        return NextResponse.json(contactsWithWindow)
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
