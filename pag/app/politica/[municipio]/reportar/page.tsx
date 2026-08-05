import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import ReportarClient from '@/components/politica/ReportarClient'

export default async function PoliticaReportarPage({
    params,
}: {
    params: { municipio: string }
}) {
    const municipio = getMunicipio(params.municipio)
    if (!municipio) notFound()

    const sesion = await obtenerSesionPol()
    if (!sesion) {
        redirect(`/politica/${municipio.slug}/login`)
    }

    const munRecord = await prisma.polMunicipio.findUnique({
        where: { slug: municipio.slug },
    })
    if (!munRecord) notFound()

    // Cargar actividades filtradas si el usuario es de dependencia específica
    const actividades = await prisma.polActividad.findMany({
        where: {
            municipioId: munRecord.id,
            ...(sesion.dependenciaId ? { dependenciaId: sesion.dependenciaId } : {}),
        },
        include: {
            dependencia: true,
        },
        orderBy: { nombre: 'asc' },
    })

    return (
        <ReportarClient
            municipio={municipio}
            actividades={actividades}
            usuario={sesion}
        />
    )
}
