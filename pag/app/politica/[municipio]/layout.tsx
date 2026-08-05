import React from 'react'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getMunicipio, temaCssVars, monograma } from '@/lib/politica/municipios'
import { obtenerSesionPol } from '@/lib/politica/session'
import Link from 'next/link'
import Image from 'next/image'
import { PolRol } from '@prisma/client'

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

    // El layout es la guarda server-side (patrón #43)
    // Permite acceso sin sesión SOLO a la página de login
    const isLoginPage = false // Las páginas secundarias heredan este layout; la login/page.tsx maneja su propia interfaz

    const cssVars = temaCssVars(municipio)

    return (
        <div style={cssVars} className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white">
            {/* Header / Navegación */}
            {sesion && (
                <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo & Municipio */}
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--pol-primary)] via-orange-600 to-amber-700 text-white font-black shadow-lg shadow-[var(--pol-primary)]/30 border border-orange-400/30">
                                    <span className="text-sm font-black tracking-wider text-white">{monograma(municipio)}</span>
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-100 tracking-tight">{municipio.nombre}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--pol-primary)]/20 text-[var(--pol-primary-light)] font-medium border border-[var(--pol-primary)]/30">
                                            {municipio.periodoInicio}-{municipio.periodoFin}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">{municipio.lema}</p>
                                </div>
                            </div>

                            {/* Navegación por pestañas */}
                            <nav className="hidden md:flex items-center space-x-1">
                                <Link
                                    href={`/politica/${municipio.slug}`}
                                    className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:text-white hover:bg-slate-800/60"
                                >
                                    Tablero General
                                </Link>
                                <Link
                                    href={`/politica/${municipio.slug}/indicadores`}
                                    className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:text-white hover:bg-slate-800/60"
                                >
                                    Indicadores KPI
                                </Link>
                                <Link
                                    href={`/politica/${municipio.slug}/reportar`}
                                    className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:text-white hover:bg-slate-800/60"
                                >
                                    Reportar Avance
                                </Link>
                                {sesion.rol === PolRol.SUPERADMIN && (
                                    <Link
                                        href={`/politica/${municipio.slug}/admin`}
                                        className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
                                    >
                                        Administración
                                    </Link>
                                )}
                            </nav>

                            {/* Usuario & Logout */}
                            <div className="flex items-center space-x-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-slate-200">{sesion.nombre}</p>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold text-[var(--pol-primary-light)]">
                                        {sesion.rol}
                                    </p>
                                </div>
                                <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
                                    >
                                        Salir
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Navegación Mobile */}
                        <div className="flex md:hidden border-t border-slate-800/80 py-2 space-x-1 overflow-x-auto text-xs">
                            <Link href={`/politica/${municipio.slug}`} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 font-medium whitespace-nowrap">
                                Tablero
                            </Link>
                            <Link href={`/politica/${municipio.slug}/indicadores`} className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-slate-800 whitespace-nowrap">
                                Indicadores
                            </Link>
                            <Link href={`/politica/${municipio.slug}/reportar`} className="px-3 py-1.5 rounded-md text-slate-300 hover:bg-slate-800 whitespace-nowrap">
                                Reportar
                            </Link>
                            {sesion.rol === PolRol.SUPERADMIN && (
                                <Link href={`/politica/${municipio.slug}/admin`} className="px-3 py-1.5 rounded-md text-amber-400 bg-amber-500/10 whitespace-nowrap">
                                    Admin
                                </Link>
                            )}
                        </div>
                    </div>
                </header>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    )
}
