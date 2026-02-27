import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        await prisma.whatsAppContact.delete({
            where: { id: params.id }
        })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const body = await request.json()
        const { name, phone } = body

        if (!phone || !phone.trim()) {
            return NextResponse.json({ success: false, error: "El teléfono es obligatorio" }, { status: 400 })
        }

        const existing = await prisma.whatsAppContact.findUnique({ where: { phone } })
        if (existing && existing.id !== params.id) {
            return NextResponse.json({ success: false, error: "Ya existe un contacto con ese teléfono" }, { status: 409 })
        }

        await prisma.whatsAppContact.update({
            where: { id: params.id },
            data: { name: name || null, phone: phone.trim() }
        })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        const msg = e.code === 'P2002'
            ? "Ya existe un contacto con ese teléfono"
            : e.code === 'P2025'
            ? "Contacto no encontrado"
            : e.message
        return NextResponse.json({ success: false, error: msg }, { status: 500 })
    }
}
