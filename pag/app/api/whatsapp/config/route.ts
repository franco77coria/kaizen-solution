import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
    getWhatsAppConfig,
    saveWhatsAppConfig,
    maskToken,
    callWhatsAppAPI,
} from "@/lib/whatsapp"

export async function GET() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const config = await getWhatsAppConfig()

    if (!config) {
        return NextResponse.json({
            isConfigured: false,
            apiToken: "",
            phoneNumberId: "",
            wabaId: "",
            verifyToken: "kaizen_whatsapp_2026",
            apiVersion: "v21.0",
        })
    }

    return NextResponse.json({
        isConfigured: config.isConfigured,
        apiToken: maskToken(config.apiToken),
        phoneNumberId: config.phoneNumberId,
        wabaId: config.wabaId || "",
        verifyToken: config.verifyToken,
        apiVersion: config.apiVersion,
    })
}

export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { apiToken, phoneNumberId, wabaId, verifyToken, apiVersion } = body

        if (!apiToken || !phoneNumberId) {
            return NextResponse.json(
                { error: "Token y Phone ID son requeridos" },
                { status: 400 }
            )
        }

        await saveWhatsAppConfig({
            apiToken,
            phoneNumberId,
            wabaId,
            verifyToken,
            apiVersion,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

// Test connection
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const config = await getWhatsAppConfig()
        if (!config || !config.isConfigured) {
            return NextResponse.json({
                success: false,
                error: "No configurado",
            })
        }

        // Test by getting phone number info
        const data = await callWhatsAppAPI(config.phoneNumberId)

        return NextResponse.json({
            success: true,
            phoneNumber: data.display_phone_number || data.verified_name || "Conectado",
            name: data.verified_name || "",
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
        })
    }
}
