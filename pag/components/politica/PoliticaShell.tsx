'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Target, FileText, Shield, LogOut, ChevronLeft, ChevronRight,
    Building2, Menu, X, Landmark, Sparkles
} from 'lucide-react'

interface PoliticaShellProps {
    municipio: {
        slug: string
        nombre: string
        lema: string
        plan: string
        periodoInicio: number
        periodoFin: number
    }
    sesion: any
    children: React.ReactNode
}

export default function PoliticaShell({
    municipio,
    sesion,
    children,
}: PoliticaShellProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Si no hay sesión (pantalla de login), renderizamos directo sin sidebar
    if (!sesion) {
        return (
            <div className="min-h-screen bg-[#060a12] text-slate-100 font-sans antialiased">
                {children}
            </div>
        )
    }

    const navItems = [
        {
            label: 'Tablero General',
            href: `/politica/${municipio.slug}`,
            icon: LayoutDashboard,
            exact: true,
        },
        {
            label: 'Indicadores KPI',
            href: `/politica/${municipio.slug}/indicadores`,
            icon: Target,
            exact: false,
        },
        {
            label: 'Reportar Avance',
            href: `/politica/${municipio.slug}/reportar`,
            icon: FileText,
            exact: false,
        },
        ...(sesion.rol === 'SUPERADMIN'
            ? [
                  {
                      label: 'Administración',
                      href: `/politica/${municipio.slug}/admin`,
                      icon: Shield,
                      exact: false,
                      badge: 'Admin',
                  },
              ]
            : []),
    ]

    const isActive = (item: typeof navItems[0]) => {
        if (item.exact) return pathname === item.href
        return pathname?.startsWith(item.href)
    }

    return (
        <div className="min-h-screen bg-[#060a12] text-slate-100 font-sans antialiased flex flex-col md:flex-row relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
            {/* Ambient Lighting Background */}
            <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-orange-600/10 via-amber-500/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-50 bg-[#090d16]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center font-black text-white text-xs border border-orange-400/40">
                        {municipio.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-extrabold text-slate-100 text-sm tracking-tight">{municipio.nombre}</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* Mobile Navigation Drawer Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col pt-16 px-4 pb-6 space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Usuario Conectado</p>
                        <p className="text-sm font-bold text-slate-100">{sesion.nombre}</p>
                        <p className="text-xs text-orange-400 font-semibold">{sesion.rol}</p>
                    </div>

                    <nav className="space-y-1 flex-1">
                        {navItems.map((item) => {
                            const active = isActive(item)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                        active
                                            ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/20'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                        <button
                            type="submit"
                            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-red-950/40 border border-red-800/60 text-red-300 flex items-center justify-center space-x-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Desktop Left Sidebar */}
            <aside
                className={`hidden md:flex flex-col sticky top-0 h-screen z-40 bg-[#090d16]/95 backdrop-blur-2xl border-r border-slate-800/80 transition-all duration-300 ${
                    collapsed ? 'w-20' : 'w-64'
                }`}
            >
                {/* Brand & Emblem */}
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 flex items-center justify-center font-black text-white shadow-lg shadow-orange-600/30 border border-orange-400/30">
                            <span className="text-sm font-black tracking-wider text-white">
                                {municipio.nombre.slice(0, 2).toUpperCase()}
                            </span>
                        </div>
                        {!collapsed && (
                            <div className="truncate">
                                <h2 className="font-black text-slate-100 text-sm tracking-tight truncate">{municipio.nombre}</h2>
                                <p className="text-[11px] text-orange-400 font-semibold truncate">{municipio.periodoInicio}-{municipio.periodoFin}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
                        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center ${
                                    collapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'
                                } py-3 rounded-xl font-bold text-sm transition-all duration-200 group active:scale-[0.98] ${
                                    active
                                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25 border border-orange-400/30'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                                }`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 min-w-[20px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'}`} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {!collapsed && item.badge && (
                                    <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
                    {!collapsed ? (
                        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Usuario</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                    {sesion.rol}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-100 truncate">{sesion.nombre}</p>

                            <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                                <button
                                    type="submit"
                                    className="w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 transition-colors border border-slate-700 hover:border-red-800/80 flex items-center justify-center space-x-1.5"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Salir</span>
                                </button>
                            </form>
                        </div>
                    ) : (
                        <form action={`/api/politica/${municipio.slug}/logout`} method="POST" className="flex justify-center">
                            <button
                                type="submit"
                                className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 transition-colors border border-slate-800"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </aside>

            {/* Main Content Viewport */}
            <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 relative z-10 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    )
}
