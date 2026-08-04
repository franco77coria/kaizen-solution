import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminWithSession } from '@/lib/api-auth'

const publicUserFields = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    createdAt: true,
} as const

const updateUserSchema = z
    .object({
        name: z.string().trim().max(120).nullish(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VIEWER']),
        isActive: z.boolean(),
    })
    .partial()
    .strict()

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { denied, session } = await requireAdminWithSession()
    if (denied) return denied

    let parsed
    try {
        parsed = updateUserSchema.safeParse(await request.json())
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    // Nadie se degrada ni se desactiva a sí mismo: es la forma más común de
    // quedarse afuera del panel sin manera de volver a entrar.
    const selfId = (session!.user as { id?: string }).id
    if (selfId === params.id && (parsed.data.role !== undefined || parsed.data.isActive === false)) {
        return NextResponse.json(
            { error: 'No podés cambiar tu propio rol ni desactivar tu cuenta' },
            { status: 400 }
        )
    }

    try {
        const user = await prisma.user.update({
            where: { id: params.id },
            data: parsed.data,
            select: publicUserFields,
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error('[api/users/:id] PUT falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error updating user' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { denied, session } = await requireAdminWithSession()
    if (denied) return denied

    const selfId = (session!.user as { id?: string }).id
    if (selfId === params.id) {
        return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
    }

    try {
        const target = await prisma.user.findUnique({
            where: { id: params.id },
            select: { role: true },
        })

        if (!target) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // No dejar el sistema sin ningún SUPER_ADMIN activo
        if (target.role === 'SUPER_ADMIN') {
            const remaining = await prisma.user.count({
                where: { role: 'SUPER_ADMIN', isActive: true, id: { not: params.id } },
            })
            if (remaining === 0) {
                return NextResponse.json(
                    { error: 'No se puede eliminar el último SUPER_ADMIN activo' },
                    { status: 409 }
                )
            }
        }

        await prisma.user.delete({ where: { id: params.id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[api/users/:id] DELETE falló:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Error deleting user' }, { status: 500 })
    }
}
