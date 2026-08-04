import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'

// La landing pública no consume esta ruta: lee siteConfig vía Prisma en el
// server component. Acá solo entra /admin.
const url = z.union([z.string().url().max(300), z.literal(''), z.null()])
const text = (max: number) => z.union([z.string().max(max), z.null()])

const configSchema = z
    .object({
        companyName: z.string().trim().min(1).max(150),
        email: z.string().email().max(200),
        phone: text(50),
        whatsappNumber: text(30),
        whatsappMessage: text(500),
        address: text(300),
        city: z.string().max(100),
        country: z.string().max(100),
        linkedinUrl: url,
        instagramUrl: url,
        facebookUrl: url,
        twitterUrl: url,
        heroTitle: z.string().max(200),
        heroSubtitle: z.string().max(600),
        ctaText: z.string().max(120),
    })
    .partial()
    .strict()

export async function GET() {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        const config = await prisma.siteConfig.findUnique({
            where: { id: 'default' },
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('[api/config] GET falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error fetching config' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = configSchema.safeParse(await request.json())
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    try {
        const config = await prisma.siteConfig.update({
            where: { id: 'default' },
            data: parsed.data,
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('[api/config] PUT falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error updating config' }, { status: 500 })
    }
}
