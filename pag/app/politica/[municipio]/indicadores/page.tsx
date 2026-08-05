import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import IndicadoresClient from '@/components/politica/IndicadoresClient'

export default async function PoliticaIndicadoresPage({
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

    const [indicadores, politicas] = await Promise.all([
        prisma.polIndicador.findMany({
            where: { municipioId: munRecord.id },
            include: {
                metas: true,
                politica: true,
            },
            orderBy: { codigo: 'asc' },
        }),
        prisma.polPolitica.findMany({
            where: { municipioId: munRecord.id },
            orderBy: { orden: 'asc' },
        }),
    ])

    return (
        <IndicadoresClient
            municipio={municipio}
            indicadores={indicadores}
            politicas={politicas}
        />
    )
}
