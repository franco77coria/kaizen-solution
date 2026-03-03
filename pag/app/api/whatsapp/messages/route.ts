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
        const searchParams = request.nextUrl.searchParams
        const phone = searchParams.get("phone")
        const direction = searchParams.get("direction")
        const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 500)

        const where: any = {}
        if (phone) where.phone = phone
        if (direction) where.direction = direction

        const messages = await prisma.whatsAppMessage.findMany({
            where,
            orderBy: { timestamp: "desc" },
            take: limit,
        })

        return NextResponse.json(messages)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Error al obtener mensajes" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { phone } = body

        if (phone) {
            await prisma.whatsAppMessage.updateMany({
                where: { phone, direction: "inbound", isRead: false },
                data: { isRead: true },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Error al marcar como leído" }, { status: 500 })
    }
}
