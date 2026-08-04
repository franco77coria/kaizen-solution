import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Guard de sesión para route handlers.
 *
 * El middleware solo cubre /admin/:path*, así que las rutas de /api que
 * exponen o modifican datos tienen que validar la sesión por su cuenta.
 *
 * Uso:
 *   const denied = await requireAdmin()
 *   if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
    const session = await auth()

    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    return null
}

/**
 * Variante que además devuelve la sesión, para rutas que necesitan saber
 * quién está operando (auditoría, ownership).
 */
export async function requireAdminWithSession() {
    const session = await auth()

    if (!session?.user) {
        return { denied: NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session: null }
    }

    const role = (session.user as { role?: string }).role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return { denied: NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 }), session: null }
    }

    return { denied: null, session }
}
