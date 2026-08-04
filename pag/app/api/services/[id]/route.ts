import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { serviceSchema } from '@/lib/content-schemas'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = serviceSchema.partial().safeParse(await request.json())
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    const { features, ...rest } = parsed.data

    try {
        const service = await prisma.service.update({
            where: { id: params.id },
            data: {
                ...rest,
                ...(features !== undefined && { features: JSON.stringify(features.filter(Boolean)) }),
            },
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error('[api/services/:id] PUT falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error updating service' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        await prisma.service.delete({ where: { id: params.id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/services/:id] DELETE falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error deleting service' }, { status: 500 })
    }
}
