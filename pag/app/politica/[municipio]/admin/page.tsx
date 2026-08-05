import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import { PolRol } from '@prisma/client'
import AdminClient from '@/components/politica/AdminClient'

export default async function PoliticaAdminPage({
    params,
}: {
    params: { municipio: string }
}) {
    const municipio = getMunicipio(params.municipio)
    if (!municipio) notFound()

    const sesion = await obtenerSesionPol()
    if (!sesion || sesion.rol !== PolRol.SUPERADMIN) {
        redirect(`/politica/${municipio.slug}`)
    }

    const munRecord = await prisma.polMunicipio.findUnique({
        where: { slug: municipio.slug },
    })
    if (!munRecord) notFound()

    const [usuarios, auditoria, avancesNoConciliados, actividades] = await Promise.all([
        prisma.polUsuario.findMany({
            where: { municipioId: munRecord.id },
            include: { dependencia: true },
            orderBy: { nombre: 'asc' },
        }),
        prisma.polAuditoria.findMany({
            where: { municipioId: munRecord.id },
            include: { usuario: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
        prisma.polAvance.findMany({
            where: { municipioId: munRecord.id, conciliado: false },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.polActividad.findMany({
            where: { municipioId: munRecord.id },
            select: { id: true, nombre: true, codigo: true },
        }),
    ])

    return (
        <AdminClient
            municipio={municipio}
            usuarios={usuarios}
            auditoria={auditoria}
            avancesNoConciliados={avancesNoConciliados}
            actividades={actividades}
        />
    )
}
