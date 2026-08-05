'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Target, FileText, Shield, LogOut, ChevronLeft, ChevronRight,
    Building2, Menu, X, Landmark, User, HelpCircle, CheckCircle2
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

    if (!sesion) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
                {children}
            </div>
        )
    }

    const navItems = [
        {
            label: 'Dashboard',
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
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased flex flex-col md:flex-row relative">
            {/* Header Mobile */}
            <header className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--pol-primary)] flex items-center justify-center font-bold text-white text-xs shadow-sm">
                        {municipio.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <span className="font-bold text-slate-900 text-sm">{municipio.nombre}</span>
                        <span className="text-[10px] text-slate-500 block">{municipio.lema}</span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex flex-col pt-16 px-4 pb-6 space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                        <p className="text-[11px] text-slate-400 font-semibold uppercase">Usuario</p>
                        <p className="text-sm font-bold text-slate-900">{sesion.nombre}</p>
                        <p className="text-xs text-[var(--pol-primary-ink)] font-semibold">{sesion.rol}</p>
                    </div>

                    <nav className="space-y-1 flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        {navItems.map((item) => {
                            const active = isActive(item)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                                        active
                                            ? 'bg-[var(--pol-primary)] text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
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
                            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-white border border-slate-200 text-red-600 flex items-center justify-center space-x-2 shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Desktop Minimalist Sidebar (Idéntico a la imagen de referencia) */}
            <aside
                className={`hidden md:flex flex-col sticky top-0 h-screen z-40 bg-[#f8fafc] border-r border-slate-200/80 transition-all duration-300 ${
                    collapsed ? 'w-20' : 'w-64'
                }`}
            >
                {/* Brand Logo & Title */}
                <div className="p-5 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-9 h-9 min-w-[36px] rounded-xl bg-[var(--pol-primary)] flex items-center justify-center font-extrabold text-white text-xs shadow-sm">
                            {municipio.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="truncate">
                                <h2 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">{municipio.nombre}</h2>
                                <p className="text-[11px] text-slate-500 font-medium truncate">{municipio.lema}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                        title={collapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center ${
                                    collapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'
                                } py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                                    active
                                        ? 'bg-[var(--pol-primary)] text-white font-semibold shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className={`w-4 h-4 min-w-[16px] ${active ? 'text-white' : 'text-slate-500'}`} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {!collapsed && item.badge && (
                                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Pill Footer */}
                <div className="p-3 border-t border-slate-200/80">
                    {!collapsed ? (
                        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-200">
                                    {sesion.nombre.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-bold text-slate-900 truncate">{sesion.nombre}</p>
                                    <p className="text-[10px] text-slate-500 font-medium capitalize">{sesion.rol.toLowerCase()}</p>
                                </div>
                            </div>

                            <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                                <button
                                    type="submit"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Salir"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <form action={`/api/politica/${municipio.slug}/logout`} method="POST" className="flex justify-center">
                            <button
                                type="submit"
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Salir"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    )
}
