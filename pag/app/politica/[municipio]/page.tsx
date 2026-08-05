import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import DashboardClient from '@/components/politica/DashboardClient'

export default async function PoliticaDashboardPage({
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

    if (!munRecord) {
        notFound()
    }

    // Carga de datos optimizada en paralelo
    const [politicas, dependencias, actividades, avances] = await Promise.all([
        prisma.polPolitica.findMany({
            where: { municipioId: munRecord.id },
            orderBy: { orden: 'asc' },
            include: {
                ejes: {
                    orderBy: { orden: 'asc' },
                    include: {
                        lineas: true,
                    },
                },
            },
        }),
        prisma.polDependencia.findMany({
            where: { municipioId: munRecord.id },
            orderBy: { nombre: 'asc' },
        }),
        prisma.polActividad.findMany({
            where: { municipioId: munRecord.id },
            include: {
                dependencia: true,
                indicador: true,
                linea: {
                    include: {
                        eje: true,
                    },
                },
                politicas: {
                    include: {
                        politica: true,
                    },
                },
            },
        }),
        prisma.polAvance.findMany({
            where: { municipioId: munRecord.id },
            include: {
                evidencias: true,
            },
        }),
    ])

    return (
        <DashboardClient
            municipio={municipio}
            politicas={politicas}
            dependencias={dependencias}
            actividades={actividades}
            avances={avances}
            sesion={sesion}
        />
    )
}
