import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getVoicesList } from "@/lib/elevenlabs"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const voices = await getVoicesList()
        return NextResponse.json({ success: true, voices })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
