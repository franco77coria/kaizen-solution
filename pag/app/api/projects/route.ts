import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { projectSchema } from '@/lib/content-schemas'
import { parseJsonArray } from '@/lib/json-array'


export async function GET() {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        const projects = await prisma.project.findMany({
            orderBy: { order: 'asc' },
        })

        return NextResponse.json(
            projects.map((project) => ({
                ...project,
                tags: parseJsonArray(project.tags),
            }))
        )
    } catch (error) {
        console.error('[api/projects] GET falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = projectSchema.safeParse(await request.json())
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
        const project = await prisma.project.create({
            data: { ...rest, tags: JSON.stringify(tags.filter(Boolean)) },
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error('[api/projects] POST falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error creating project' }, { status: 500 })
    }
}
