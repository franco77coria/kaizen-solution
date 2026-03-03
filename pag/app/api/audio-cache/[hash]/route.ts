import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public route — no auth required (Twilio needs to fetch this URL)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params

        // Strip .ogg extension if present (URL can be /api/audio-cache/abc123.ogg)
        const cleanHash = hash.replace(/\.ogg$/, "")

        const cached = await prisma.audioMessageCache.findUnique({
            where: { hash: cleanHash },
        })

        if (!cached || !cached.mediaUrl) {
            return NextResponse.json({ error: "Audio not found" }, { status: 404 })
        }

        // mediaUrl stores base64-encoded OGG Opus audio data
        const audioBuffer = Buffer.from(cached.mediaUrl, "base64")

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/ogg; codecs=opus",
                "Content-Length": audioBuffer.length.toString(),
                "Content-Disposition": 'inline; filename="voice_message.ogg"',
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: "Error serving audio" }, { status: 500 })
    }
}
