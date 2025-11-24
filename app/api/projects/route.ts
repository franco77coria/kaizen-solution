import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { order: 'asc' }
        })

        // Parse JSON strings back to arrays
        const projectsWithArrays = projects.map(project => ({
            ...project,
            tags: JSON.parse(project.tags)
        }))

        return NextResponse.json(projectsWithArrays)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const project = await prisma.project.create({
            data: {
                ...body,
                tags: JSON.stringify(body.tags || [])
            }
        })

        return NextResponse.json(project)
    } catch (error) {
        return NextResponse.json({ error: 'Error creating project' }, { status: 500 })
    }
}
