import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const config = await prisma.siteConfig.findUnique({
            where: { id: 'default' }
        })

        return NextResponse.json(config)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching config' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()

        const config = await prisma.siteConfig.update({
            where: { id: 'default' },
            data: body
        })

        return NextResponse.json(config)
    } catch (error) {
        return NextResponse.json({ error: 'Error updating config' }, { status: 500 })
    }
}
