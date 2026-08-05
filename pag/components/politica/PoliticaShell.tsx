'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, CheckSquare2, Target, FileText, Shield, LogOut, ChevronLeft, ChevronRight,
    Menu, X, Sparkles
} from 'lucide-react'
import DynamicIsland from './DynamicIsland'
import MobileBottomIsland from './MobileBottomIsland'

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
            <div className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans antialiased p-3 sm:p-6">
                <div className="w-full min-h-[calc(100vh-1.5rem)] rounded-[28px] sm:rounded-[32px] bg-white border border-slate-200/80 p-6 sm:p-10 shadow-xs">
                    {children}
                </div>
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
            label: 'Plan de Metas',
            href: `/politica/${municipio.slug}/metas`,
            icon: CheckSquare2,
            exact: false,
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
        <div className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans antialiased flex flex-col md:flex-row relative">
            {/* Isla Flotante de Navegación Móvil Inferior (Estilo exacto de la referencia) */}
            <MobileBottomIsland
                municipio={municipio}
                sesion={sesion}
                onOpenMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            />

            {/* Header Mobile Minimalista */}
            <header className="md:hidden sticky top-0 z-40 bg-[#f0f2f5]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
                <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-2xl bg-[var(--pol-primary)] flex items-center justify-center font-extrabold text-white text-xs shadow-xs">
                        {municipio.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <span className="font-extrabold text-slate-900 text-sm tracking-tight">{municipio.nombre}</span>
                        <span className="text-[10px] text-slate-500 block font-medium">{municipio.lema}</span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                    aria-label="Abrir menú"
                >
                    {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
            </header>

            {/* Mobile Navigation Drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex flex-col pt-16 px-4 pb-6 space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Usuario conectado</p>
                        <p className="text-sm font-extrabold text-slate-900">{sesion.nombre}</p>
                        <p className="text-xs text-[var(--pol-primary-ink)] font-semibold">{sesion.rol}</p>
                    </div>

                    <nav className="space-y-1.5 flex-1 bg-white p-3 rounded-3xl border border-slate-200/80 shadow-sm overflow-y-auto">
                        {navItems.map((item) => {
                            const active = isActive(item)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                                        active
                                            ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                        <button
                            type="submit"
                            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs bg-white border border-slate-200 text-red-600 flex items-center justify-center space-x-2 shadow-xs"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Desktop Minimalist Sidebar (Idéntico a la imagen de referencia de Factory Pets) */}
            <aside
                className={`hidden md:flex flex-col sticky top-0 h-screen z-40 bg-[#f0f2f5] transition-all duration-300 ${
                    collapsed ? 'w-20' : 'w-64'
                }`}
            >
                {/* Brand Header */}
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-[var(--pol-primary)] flex items-center justify-center font-extrabold text-white text-xs shadow-xs">
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
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                        aria-label={collapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-3.5 py-2 space-y-1.5">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center ${
                                    collapsed ? 'justify-center px-2' : 'space-x-3 px-4'
                                } py-3 rounded-2xl font-bold text-xs transition-all duration-150 ${
                                    active
                                        ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                }`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className={`w-4 h-4 min-w-[16px] ${active ? 'text-white' : 'text-slate-500'}`} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {!collapsed && item.badge && (
                                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Pill Footer (Capsule Rounded-Full como en la imagen) */}
                <div className="p-3.5">
                    {!collapsed ? (
                        <div className="p-2.5 pl-3 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                                <div className="w-8 h-8 min-w-[32px] rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center font-bold text-cyan-700 text-xs">
                                    {sesion.nombre.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-bold text-slate-900 truncate">{sesion.nombre}</p>
                                    <p className="text-[10px] text-slate-500 font-semibold capitalize">{sesion.rol.toLowerCase()}</p>
                                </div>
                            </div>

                            <form action={`/api/politica/${municipio.slug}/logout`} method="POST">
                                <button
                                    type="submit"
                                    className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Cerrar sesión"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <form action={`/api/politica/${municipio.slug}/logout`} method="POST" className="flex justify-center">
                            <button
                                type="submit"
                                className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shadow-xs"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>
            </aside>

            {/* Main Content Area (Gran contenedor redondeado blanco idéntico a la imagen de referencia) */}
            <main className="flex-1 min-w-0 p-2 sm:p-3 lg:p-4 pb-24 md:pb-4">
                <div className="w-full min-h-[calc(100vh-1.5rem)] rounded-[28px] sm:rounded-[32px] bg-white border border-slate-200/80 shadow-xs p-5 sm:p-8 lg:p-9">
                    {children}
                </div>
            </main>
        </div>
    )
}
