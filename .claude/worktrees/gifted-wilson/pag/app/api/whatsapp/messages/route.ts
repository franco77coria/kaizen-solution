import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get("phone")
    const direction = searchParams.get("direction")
    const limit = parseInt(searchParams.get("limit") || "100")

    const where: any = {}
    if (phone) where.phone = phone
    if (direction) where.direction = direction

    const messages = await prisma.whatsAppMessage.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
    })

    return NextResponse.json(messages)
}

// Mark messages as read
export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { phone } = body

    if (phone) {
        await prisma.whatsAppMessage.updateMany({
            where: { phone, direction: "inbound", isRead: false },
            data: { isRead: true },
        })
    }

    return NextResponse.json({ success: true })
}
