import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

// Accepts an image file, stores it in MediaCache, and returns a public URL
export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "Falta el archivo" }, { status: 400 })
        }

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Formato no soportado. Usá JPG, PNG, WEBP o GIF." }, { status: 400 })
        }

        // 5 MB limit
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "La imagen supera el límite de 5 MB" }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const hash = crypto.createHash("sha256").update(buffer).digest("hex")
        const db = prisma as any

        await db.mediaCache.upsert({
            where: { hash },
            update: {},
            create: {
                hash,
                mimeType: file.type,
                data: buffer.toString("base64"),
            },
        })

        const baseUrl = process.env.NEXTAUTH_URL || ""
        const url = `${baseUrl}/api/media-cache/${hash}`

        return NextResponse.json({ success: true, url, hash, mimeType: file.type })
    } catch (e: any) {
        console.error("Media upload error:", e)
        return NextResponse.json({ error: e.message || "Error al subir el archivo" }, { status: 500 })
    }
}
