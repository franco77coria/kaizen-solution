import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public route — no auth required (Twilio needs to fetch this URL)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params

        // Strip extension if present (e.g. /api/media-cache/abc123.jpg)
        const cleanHash = hash.replace(/\.[^.]+$/, "")

        const cached = await (prisma as any).mediaCache.findUnique({
            where: { hash: cleanHash },
        })

        if (!cached || !cached.data) {
            return NextResponse.json({ error: "Media not found" }, { status: 404 })
        }

        const buffer = Buffer.from(cached.data, "base64")

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": cached.mimeType,
                "Content-Length": buffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: "Error serving media" }, { status: 500 })
    }
}
