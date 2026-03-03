import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWhatsAppConfig } from "@/lib/whatsapp"

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const config = await getWhatsAppConfig()
        const isTwilio = config?.provider === "twilio"

        const allTemplates = await prisma.whatsAppTemplate.findMany({
            where: { status: "APPROVED" },
            orderBy: { name: "asc" },
        })
        const templates = isTwilio
            ? allTemplates.filter(t => t.wabaId?.startsWith("HX"))
            : allTemplates.filter(t => !t.wabaId?.startsWith("HX"))
        return NextResponse.json({ success: true, templates })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
