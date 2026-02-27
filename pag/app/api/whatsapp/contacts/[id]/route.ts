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

        // #region agent log
        try { await prisma.whatsAppLog.create({ data: { type: 'DEBUG_CONTACT_UPDATE', payload: JSON.stringify({ id: params.id, name, phone }) } }); } catch(le) {}
        // #endregion

        await prisma.whatsAppContact.update({
            where: { id: params.id },
            data: { name, phone }
        })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        // #region agent log
        try { await prisma.whatsAppLog.create({ data: { type: 'DEBUG_CONTACT_UPDATE_ERROR', payload: JSON.stringify({ id: params.id, error: e.message, code: e.code }) } }); } catch(le) {}
        // #endregion
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
