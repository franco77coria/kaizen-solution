/**
 * senders/route.ts — API CRUD para gestión de Twilio Senders
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createSender, getAllSenders, testSenderConnection } from "@/lib/sender-pool"
import { decrypt } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

// ─── GET: Listar todos los senders ───

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const senders = await getAllSenders()
        return NextResponse.json(senders)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ─── POST: Crear nuevo sender ───

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await req.json()
        const {
            name, accountSid, authToken, phoneNumber,
            messagingServiceSid, trustLevel, maxMps,
        } = body

        if (!name || !accountSid || !authToken || !phoneNumber) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios: name, accountSid, authToken, phoneNumber" },
                { status: 400 }
            )
        }

        // Verificar conexión antes de guardar
        try {
            await testSenderConnection(accountSid, authToken)
        } catch (testErr: any) {
            return NextResponse.json(
                { error: `Error al verificar credenciales: ${testErr.message}` },
                { status: 400 }
            )
        }

        const sender = await createSender({
            name,
            accountSid,
            authToken,
            phoneNumber,
            messagingServiceSid,
            trustLevel,
            maxMps,
        })

        return NextResponse.json({
            success: true,
            sender: {
                id: sender.id,
                name: sender.name,
                phoneNumber: sender.phoneNumber,
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
