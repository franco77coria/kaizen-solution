import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public route — no auth required (Twilio needs to fetch this URL)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params

        // Detect format from extension and strip it
        const isMp3 = hash.endsWith(".mp3");
        const cleanHash = hash.replace(/\.(ogg|mp3)$/, "")

        const cached = await prisma.audioMessageCache.findUnique({
            where: { hash: cleanHash },
        })

        if (!cached || !cached.mediaUrl) {
            return NextResponse.json({ error: "Audio not found" }, { status: 404 })
        }

        const audioBuffer = Buffer.from(cached.mediaUrl, "base64")

        const contentType = isMp3 ? "audio/mpeg" : "audio/ogg; codecs=opus";
        const filename = isMp3 ? "audio_message.mp3" : "voice_message.ogg";

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": audioBuffer.length.toString(),
                "Content-Disposition": `inline; filename="${filename}"`,
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: "Error serving audio" }, { status: 500 })
    }
}
