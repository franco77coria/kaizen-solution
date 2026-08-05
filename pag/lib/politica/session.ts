import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { PolRol } from '@prisma/client'

const COOKIE_NAME = 'pol_session'
const SECRET_KEY = new TextEncoder().encode(
    process.env.POLITICA_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'kaizen_politica_secret_key_2026_anapoima'
)

export interface PolSessionPayload {
    sub: string // usuarioId
    municipioSlug: string
    nombre: string
    telefono?: string | null
    rol: PolRol
    dependenciaId?: string | null
}

export async function crearSesionPol(payload: PolSessionPayload): Promise<string> {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(SECRET_KEY)

    const cookieStore = cookies()
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 días
        path: '/',
    })

    return token
}

export async function obtenerSesionPol(): Promise<PolSessionPayload | null> {
    try {
        const cookieStore = cookies()
        const token = cookieStore.get(COOKIE_NAME)?.value
        if (!token) return null

        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as unknown as PolSessionPayload
    } catch {
        return null
    }
}

export async function cerrarSesionPol(): Promise<void> {
    const cookieStore = cookies()
    cookieStore.delete(COOKIE_NAME)
}
