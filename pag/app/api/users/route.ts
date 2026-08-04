import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api-auth'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'] as const

const createUserSchema = z.object({
    email: z.string().email('Email inválido').max(200),
    name: z.string().trim().max(120).optional(),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
    role: z.enum(ROLES).default('VIEWER'),
})

const publicUserFields = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    createdAt: true,
} as const

export async function GET() {
    const denied = await requireAdmin()
    if (denied) return denied

    try {
        const users = await prisma.user.findMany({
            select: publicUserFields,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error('[api/users] GET falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const denied = await requireAdmin()
    if (denied) return denied

    let parsed
    try {
        parsed = createUserSchema.safeParse(await request.json())
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    const { email, name, password, role } = parsed.data

    try {
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name,
                password: hashedPassword,
                role,
                isActive: true,
            },
            select: publicUserFields,
        })

        return NextResponse.json(user)
    } catch (error) {
        // P2002 = unique constraint. No confirmamos qué email existe.
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 409 })
        }
        console.error('[api/users] POST falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
    }
}
