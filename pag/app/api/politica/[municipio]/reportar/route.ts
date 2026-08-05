import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import { getClientIp } from '@/lib/rate-limit'
import { PolOrigenEvidencia } from '@prisma/client'

export async function POST(
    req: NextRequest,
    { params }: { params: { municipio: string } }
) {
    const municipio = getMunicipio(params.municipio)
    if (!municipio) {
        return NextResponse.json({ error: 'Municipio no encontrado' }, { status: 404 })
    }

    const sesion = await obtenerSesionPol()
    if (!sesion) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { actividadId, periodoTexto, valorNumero, valorBooleano, observaciones, presupuestoEjecutado, evidenciaUrl } = body

        if (!actividadId) {
            return NextResponse.json({ error: 'Falta la actividad' }, { status: 400 })
        }

        const munRecord = await prisma.polMunicipio.findUnique({
            where: { slug: municipio.slug },
        })
        if (!munRecord) return NextResponse.json({ error: 'Municipio no registrado en DB' }, { status: 404 })

        const avance = await prisma.polAvance.create({
            data: {
                municipioId: munRecord.id,
                actividadId,
                usuarioId: sesion.sub,
                periodoTexto: periodoTexto || '2026',
                valorNumero: valorNumero != null ? valorNumero : null,
                valorBooleano: valorBooleano != null ? valorBooleano : null,
                valorRaw: valorNumero != null ? String(valorNumero) : valorBooleano ? 'Realizado' : 'Pendiente',
                observaciones: observaciones || null,
                presupuestoEjecutado: presupuestoEjecutado != null ? presupuestoEjecutado : null,
                conciliado: true,
            },
        })

        if (evidenciaUrl && typeof evidenciaUrl === 'string' && evidenciaUrl.startsWith('http')) {
            await prisma.polEvidencia.create({
                data: {
                    avanceId: avance.id,
                    url: evidenciaUrl,
                    origen: PolOrigenEvidencia.DRIVE,
                    nombre: 'Evidencia adjunta',
                },
            })
        }

        // Auditoría
        await prisma.polAuditoria.create({
            data: {
                municipioId: munRecord.id,
                usuarioId: sesion.sub,
                accion: 'Modificacion',
                detalle: `Reporte de avance para actividad ${actividadId}`,
                usuarioText: sesion.nombre,
                ip: getClientIp(req),
                userAgent: req.headers.get('user-agent') || '',
            },
        })

        return NextResponse.json({ success: true, avanceId: avance.id })
    } catch (err: any) {
        console.error('Error al guardar avance:', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
