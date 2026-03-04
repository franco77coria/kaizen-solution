import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// TEMPORAL - borrar después de debug
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true }
        })
        return NextResponse.json({
            dbConnected: true,
            userCount: users.length,
            users: users.map(u => ({ email: u.email, role: u.role }))
        })
    } catch (error: any) {
        return NextResponse.json({
            dbConnected: false,
            error: error.message
        }, { status: 500 })
    }
}
