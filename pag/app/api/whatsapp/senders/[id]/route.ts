/**
 * senders/[id]/route.ts — API para gestión individual de Twilio Senders
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { encrypt } from "@/lib/whatsapp"
import { testSenderConnection } from "@/lib/sender-pool"

export const dynamic = "force-dynamic"

// ─── GET: Obtener sender por ID ───

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const sender = await prisma.twilioSender.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                messagingServiceSid: true,
                trustLevel: true,
                maxMps: true,
                dailyLimit: true,
                sentToday: true,
                isActive: true,
                isHealthy: true,
                lastError: true,
                lastUsedAt: true,
                totalSent: true,
                createdAt: true,
                _count: { select: { campaignJobs: true } },
            },
        })

        if (!sender) {
            return NextResponse.json({ error: "Sender no encontrado" }, { status: 404 })
        }

        return NextResponse.json(sender)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ─── PATCH: Actualizar sender ───

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await req.json()
        const updateData: any = {}

        // Campos editables
        if (body.name !== undefined) updateData.name = body.name
        if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber
        if (body.messagingServiceSid !== undefined) updateData.messagingServiceSid = body.messagingServiceSid || null
        if (body.trustLevel !== undefined) updateData.trustLevel = body.trustLevel
        if (body.maxMps !== undefined) updateData.maxMps = body.maxMps
        if (body.dailyLimit !== undefined) updateData.dailyLimit = body.dailyLimit
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        // Re-habilitar sender (reset health)
        if (body.isHealthy === true) {
            updateData.isHealthy = true
            updateData.lastError = null
        }

        // Solo encriptar credenciales si son nuevas (no contienen ****)
        if (body.accountSid && !body.accountSid.includes("****")) {
            updateData.accountSid = encrypt(body.accountSid)
        }
        if (body.authToken && !body.authToken.includes("****")) {
            updateData.authToken = encrypt(body.authToken)
        }

        const sender = await prisma.twilioSender.update({
            where: { id: params.id },
            data: updateData,
        })

        return NextResponse.json({ success: true, sender: { id: sender.id, name: sender.name } })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ─── DELETE: Eliminar sender ───

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        // Verificar que no haya jobs activos con este sender
        const activeJobs = await prisma.campaignJob.count({
            where: {
                senderId: params.id,
                status: { in: ["pending", "processing"] },
            },
        })

        if (activeJobs > 0) {
            return NextResponse.json(
                { error: `No se puede eliminar: ${activeJobs} jobs activos` },
                { status: 400 }
            )
        }

        await prisma.twilioSender.delete({ where: { id: params.id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
