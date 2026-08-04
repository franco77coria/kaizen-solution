import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { serviceSchema } from '@/lib/content-schemas'
import { parseJsonArray } from '@/lib/json-array'


export async function GET() {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        const services = await prisma.service.findMany({
            orderBy: { order: 'asc' },
        })

        return NextResponse.json(
            services.map((service) => ({
                ...service,
                features: parseJsonArray(service.features),
            }))
        )
    } catch (error) {
        console.error('[api/services] GET falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error fetching services' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = serviceSchema.safeParse(await request.json())
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
        const service = await prisma.service.create({
            data: { ...rest, features: JSON.stringify(features.filter(Boolean)) },
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error('[api/services] POST falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error creating service' }, { status: 500 })
    }
}
