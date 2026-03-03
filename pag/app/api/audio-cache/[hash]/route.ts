import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public route — no auth required (Twilio needs to fetch this URL)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params
        const cached = await prisma.audioMessageCache.findUnique({
            where: { hash },
        })

        if (!cached || !cached.mediaUrl) {
            return NextResponse.json({ error: "Audio not found" }, { status: 404 })
        }

        // mediaUrl stores base64-encoded audio data
        const audioBuffer = Buffer.from(cached.mediaUrl, "base64")

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/ogg",
                "Content-Length": audioBuffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: "Error serving audio" }, { status: 500 })
    }
}
