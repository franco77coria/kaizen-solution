import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTemplatesFromMeta } from "@/lib/whatsapp"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const templates = await getTemplatesFromMeta()
        return NextResponse.json({ success: true, templates })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
