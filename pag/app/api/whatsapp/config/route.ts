import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
    getWhatsAppConfig,
    saveWhatsAppConfig,
    maskToken,
    callWhatsAppAPI,
    testTwilioConnection,
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
            provider: "meta",
            apiToken: "",
            phoneNumberId: "",
            wabaId: "",
            verifyToken: "kaizen_whatsapp_2026",
            apiVersion: "v21.0",
            twilioAccountSid: "",
            twilioAuthToken: "",
            twilioNumber: "",
        })
    }

    return NextResponse.json({
        isConfigured: config.isConfigured,
        provider: config.provider,
        apiToken: maskToken(config.apiToken),
        phoneNumberId: config.phoneNumberId,
        wabaId: config.wabaId || "",
        verifyToken: config.verifyToken,
        apiVersion: config.apiVersion,
        twilioAccountSid: config.twilioAccountSid ? maskToken(config.twilioAccountSid) : "",
        twilioAuthToken: config.twilioAuthToken ? maskToken(config.twilioAuthToken) : "",
        twilioNumber: config.twilioNumber || "",
    })
}

export async function PUT(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const {
            provider = "meta",
            apiToken,
            phoneNumberId,
            wabaId,
            verifyToken,
            apiVersion,
            twilioAccountSid,
            twilioAuthToken,
            twilioNumber,
        } = body

        if (provider === "meta") {
            if (!apiToken || !phoneNumberId) {
                return NextResponse.json(
                    { error: "Token y Phone ID son requeridos" },
                    { status: 400 }
                )
            }
        } else if (provider === "twilio") {
            const existingConfig = await getWhatsAppConfig()
            const hasSid = twilioAccountSid && !twilioAccountSid.includes("****")
            const hasToken = twilioAuthToken && !twilioAuthToken.includes("****")
            const alreadyConfigured = existingConfig?.twilioAccountSid && existingConfig?.twilioAuthToken

            if (!alreadyConfigured && (!hasSid || !hasToken || !twilioNumber)) {
                return NextResponse.json(
                    { error: "Account SID, Auth Token y número son requeridos para Twilio" },
                    { status: 400 }
                )
            }
        }

        await saveWhatsAppConfig({
            provider,
            apiToken: apiToken || "",
            phoneNumberId: phoneNumberId || "",
            wabaId,
            verifyToken,
            apiVersion,
            twilioAccountSid,
            twilioAuthToken,
            twilioNumber,
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
export async function POST() {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const config = await getWhatsAppConfig()
        if (!config || !config.isConfigured) {
            return NextResponse.json({ success: false, error: "No configurado" })
        }

        if (config.provider === "twilio") {
            const result = await testTwilioConnection(config)
            return NextResponse.json({
                success: true,
                phoneNumber: config.twilioNumber || "",
                name: result.friendlyName || "Cuenta Twilio",
            })
        }

        // Meta
        const data = await callWhatsAppAPI(config.phoneNumberId)
        return NextResponse.json({
            success: true,
            phoneNumber: data.display_phone_number || data.verified_name || "Conectado",
            name: data.verified_name || "",
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}
