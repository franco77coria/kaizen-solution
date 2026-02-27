import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const logs = await prisma.whatsAppLog.findMany({
        where: { type: { startsWith: 'DEBUG_' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
    })
    return NextResponse.json(logs)
}
