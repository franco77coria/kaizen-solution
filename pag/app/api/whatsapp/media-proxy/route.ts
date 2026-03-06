import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWhatsAppConfig } from "@/lib/whatsapp"

export const dynamic = 'force-dynamic'

// Proxy para servir media de Twilio (requiere auth Basic con credenciales de la cuenta)
export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) return new NextResponse("No autorizado", { status: 401 })

    const url = request.nextUrl.searchParams.get("url")
    if (!url) return new NextResponse("URL requerida", { status: 400 })

    // Solo permitir URLs de Twilio
    if (!url.startsWith("https://api.twilio.com/")) {
        return new NextResponse("URL no permitida", { status: 403 })
    }

    try {
        const config = await getWhatsAppConfig()
        if (!config?.twilioAccountSid || !config?.twilioAuthToken) {
            return new NextResponse("Credenciales Twilio no configuradas", { status: 500 })
        }

        const credentials = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")

        const res = await fetch(url, {
            headers: { "Authorization": `Basic ${credentials}` },
        })

        if (!res.ok) return new NextResponse("Media no encontrada", { status: 404 })

        const buffer = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || "application/octet-stream"

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=3600",
            },
        })
    } catch (error: any) {
        return new NextResponse(error.message || "Error al obtener media", { status: 500 })
    }
}
