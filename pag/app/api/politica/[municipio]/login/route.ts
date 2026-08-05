import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { crearSesionPol } from '@/lib/politica/session'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(
    req: NextRequest,
    { params }: { params: { municipio: string } }
) {
    // 1. Rate limiting: máx 10 intentos por minuto por IP
    const rateLimitError = checkRateLimit(req, {
        name: `politica-login:${params.municipio}`,
        limit: 10,
        windowMs: 60 * 1000,
    })
    if (rateLimitError) return rateLimitError

    const municipio = getMunicipio(params.municipio)
    if (!municipio) {
        return NextResponse.json({ error: 'Municipio no encontrado' }, { status: 404 })
    }

    try {
        const body = await req.json()
        const input = (body.input || '').trim()

        if (!input) {
            return NextResponse.json({ error: 'Ingresá tu nombre o número de teléfono' }, { status: 400 })
        }

        // Buscar por teléfono (sólo dígitos) o por nombre (case-insensitive)
        const inputDigits = input.replace(/\D/g, '')

        const munRecord = await prisma.polMunicipio.findUnique({
            where: { slug: municipio.slug },
        })

        if (!munRecord) {
            return NextResponse.json({ error: 'El municipio no está configurado en la base de datos' }, { status: 404 })
        }

        // Buscar coincidencias
        const usuarios = await prisma.polUsuario.findMany({
            where: {
                municipioId: munRecord.id,
                activo: true,
                OR: [
                    ...(inputDigits ? [{ telefono: inputDigits }] : []),
                    { nombre: { equals: input, mode: 'insensitive' } },
                    { nombre: { contains: input, mode: 'insensitive' } },
                ],
            },
            include: {
                dependencia: true,
            },
        })

        if (!usuarios || usuarios.length === 0) {
            return NextResponse.json(
                { error: 'Usuario no encontrado. Verificá tu nombre o teléfono.' },
                { status: 401 }
            )
        }

        // Si hay varios (ej. nombre parcial), priorizamos coincidencia exacta de teléfono o nombre
        let usuario = usuarios.find((u) => u.telefono === inputDigits)
        if (!usuario) {
            usuario = usuarios.find((u) => u.nombre.toLowerCase() === input.toLowerCase())
        }
        if (!usuario) {
            usuario = usuarios[0] // Fallback al primero
        }

        // Actualizar último ingreso
        await prisma.polUsuario.update({
            where: { id: usuario.id },
            data: { ultimoIngreso: new Date() },
        })

        // Registro de auditoría
        const clientIp = getClientIp(req)
        const userAgent = req.headers.get('user-agent') || ''

        await prisma.polAuditoria.create({
            data: {
                municipioId: munRecord.id,
                usuarioId: usuario.id,
                accion: 'Login',
                detalle: `Ingreso con input: "${input}"`,
                usuarioText: usuario.nombre,
                ip: clientIp,
                userAgent,
            },
        })

        // Crear la sesión en cookie httpOnly
        await crearSesionPol({
            sub: usuario.id,
            municipioSlug: municipio.slug,
            nombre: usuario.nombre,
            telefono: usuario.telefono,
            rol: usuario.rol,
            dependenciaId: usuario.dependenciaId,
        })

        return NextResponse.json({
            success: true,
            redirect: `/politica/${municipio.slug}`,
        })
    } catch (err: any) {
        console.error('Error en login política:', err)
        return NextResponse.json({ error: 'Ocurrió un error al procesar el ingreso' }, { status: 500 })
    }
}
