import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMunicipio, temaCssVars } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import PoliticaShell from '@/components/politica/PoliticaShell'

export const metadata: Metadata = {
    title: 'Tablero de Políticas Públicas Municipales',
    robots: {
        index: false,
        follow: false,
    },
}

export default async function PoliticaLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: { municipio: string }
}) {
    const municipio = getMunicipio(params.municipio)
    if (!municipio) {
        notFound()
    }

    const sesion = await obtenerSesionPol()
    const cssVars = temaCssVars(municipio)

    return (
        <div style={cssVars} className="bg-[#f8fafc] text-slate-900 min-h-screen font-sans antialiased">
            <PoliticaShell municipio={municipio} sesion={sesion}>
                {children}
            </PoliticaShell>
        </div>
    )
}
