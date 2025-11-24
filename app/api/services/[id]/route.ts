import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const service = await prisma.service.update({
            where: { id: params.id },
            data: {
                ...body,
                features: JSON.stringify(body.features || [])
            }
        })

        return NextResponse.json(service)
    } catch (error) {
        return NextResponse.json({ error: 'Error updating service' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.service.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting service' }, { status: 500 })
    }
}
