import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getMunicipio } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import { getCachedMunicipioId } from '@/lib/politica/db'
import MetasClient from '@/components/politica/MetasClient'

export const dynamic = 'force-dynamic'

export default async function MetasPage({
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

    const munId = await getCachedMunicipioId(municipio.slug)
    if (!munId) {
        notFound()
    }

    const [politicas, dependencias, actividades, avances] = await Promise.all([
        prisma.polPolitica.findMany({
            where: { municipioId: munId },
            orderBy: { orden: 'asc' },
            select: {
                id: true,
                nombre: true,
                orden: true,
                ejes: {
                    orderBy: { orden: 'asc' },
                    select: {
                        id: true,
                        nombre: true,
                        lineas: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },
        }),
        prisma.polDependencia.findMany({
            where: { municipioId: munId },
            orderBy: { nombre: 'asc' },
            select: {
                id: true,
                nombre: true,
            },
        }),
        prisma.polActividad.findMany({
            where: { municipioId: munId },
            select: {
                id: true,
                nombre: true,
                codigo: true,
                tipoMeta: true,
                metaNumero: true,
                metaBooleana: true,
                presupuestoPlaneado: true,
                dependenciaId: true,
                lineaId: true,
                dependencia: {
                    select: { id: true, nombre: true },
                },
                linea: {
                    select: {
                        id: true,
                        nombre: true,
                        ejeId: true,
                        eje: {
                            select: { id: true, nombre: true },
                        },
                    },
                },
                politicas: {
                    select: {
                        politicaId: true,
                        politica: {
                            select: { id: true, nombre: true },
                        },
                    },
                },
            },
        }),
        prisma.polAvance.findMany({
            where: { municipioId: munId },
            select: {
                id: true,
                actividadId: true,
                valorNumero: true,
                valorBooleano: true,
                presupuestoEjecutado: true,
                periodoTexto: true,
                observaciones: true,
                createdAt: true,
                evidencias: {
                    select: {
                        id: true,
                        url: true,
                        nombre: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
    ])

    return (
        <MetasClient
            municipio={municipio}
            politicas={politicas}
            dependencias={dependencias}
            actividades={actividades}
            avances={avances}
            sesion={sesion}
        />
    )
}
