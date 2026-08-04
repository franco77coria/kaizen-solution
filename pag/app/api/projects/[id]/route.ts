import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { projectSchema } from '@/lib/content-schemas'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = projectSchema.partial().safeParse(await request.json())
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    const { tags, ...rest } = parsed.data

    try {
        const project = await prisma.project.update({
            where: { id: params.id },
            data: {
                ...rest,
                ...(tags !== undefined && { tags: JSON.stringify(tags.filter(Boolean)) }),
            },
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error('[api/projects/:id] PUT falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error updating project' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        await prisma.project.delete({ where: { id: params.id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/projects/:id] DELETE falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error deleting project' }, { status: 500 })
    }
}
