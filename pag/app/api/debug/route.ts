import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const logs = await prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
    })
    return NextResponse.json(logs)
}
