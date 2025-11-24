import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const services = await prisma.service.findMany({
            orderBy: { order: 'asc' }
        })

        // Parse JSON strings back to arrays
        const servicesWithArrays = services.map(service => ({
            ...service,
            features: JSON.parse(service.features)
        }))

        return NextResponse.json(servicesWithArrays)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching services' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const service = await prisma.service.create({
            data: {
                ...body,
                features: JSON.stringify(body.features || [])
            }
        })

        return NextResponse.json(service)
    } catch (error) {
        return NextResponse.json({ error: 'Error creating service' }, { status: 500 })
    }
}
