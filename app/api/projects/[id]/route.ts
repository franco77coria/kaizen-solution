import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const project = await prisma.project.update({
            where: { id: params.id },
            data: {
                ...body,
                tags: JSON.stringify(body.tags || [])
            }
        })

        return NextResponse.json(project)
    } catch (error) {
        return NextResponse.json({ error: 'Error updating project' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.project.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting project' }, { status: 500 })
    }
}
