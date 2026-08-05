'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, CheckSquare2, Target, FileText, Shield,
    ChevronDown, Sparkles, Activity, Layers, ArrowUpRight, X
} from 'lucide-react'

interface DynamicIslandProps {
    municipio: {
        slug: string
        nombre: string
        lema: string
    }
    sesion?: any
}

export default function DynamicIsland({ municipio, sesion }: DynamicIslandProps) {
    const pathname = usePathname()
    const [expanded, setExpanded] = useState(false)
    const [isPulsing, setIsPulsing] = useState(false)
    const islandRef = useRef<HTMLDivElement>(null)

    // Detectar sección activa
    const getCurrentSection = () => {
        if (pathname?.includes('/metas')) return { label: 'Metas', icon: CheckSquare2, color: 'text-sky-400' }
        if (pathname?.includes('/indicadores')) return { label: 'KPIs', icon: Target, color: 'text-emerald-400' }
        if (pathname?.includes('/reportar')) return { label: 'Reportar', icon: FileText, color: 'text-amber-400' }
        if (pathname?.includes('/admin')) return { label: 'Admin', icon: Shield, color: 'text-purple-400' }
        return { label: 'Dashboard', icon: LayoutDashboard, color: 'text-emerald-400' }
    }

    const currentSection = getCurrentSection()
    const CurrentIcon = currentSection.icon

    // Cerrar al cambiar de ruta
    useEffect(() => {
        setExpanded(false)
        setIsPulsing(true)
        const timer = setTimeout(() => setIsPulsing(false), 800)
        return () => clearTimeout(timer)
    }, [pathname])

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
                setExpanded(false)
            }
        }
        if (expanded) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [expanded])

    const quickLinks = [
        { label: 'Dashboard', href: `/politica/${municipio.slug}`, icon: LayoutDashboard },
        { label: 'Metas', href: `/politica/${municipio.slug}/metas`, icon: CheckSquare2 },
        { label: 'KPIs', href: `/politica/${municipio.slug}/indicadores`, icon: Target },
        { label: 'Reportar', href: `/politica/${municipio.slug}/reportar`, icon: FileText },
        ...(sesion?.rol === 'SUPERADMIN'
            ? [{ label: 'Admin', href: `/politica/${municipio.slug}/admin`, icon: Shield }]
            : []),
    ]

    return (
        <aside
            ref={islandRef}
            aria-label="Isla dinámica móvil"
            className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 md:hidden pointer-events-auto select-none"
            style={{
                perspective: '1000px',
                width: expanded ? 'calc(100vw - 1.5rem)' : 'auto',
                maxWidth: expanded ? '390px' : '320px',
            }}
        >
            <div
                onClick={() => !expanded && setExpanded(true)}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-slate-950/95 text-white backdrop-blur-2xl border border-white/15 shadow-2xl shadow-slate-950/60 ring-1 ring-white/10 ${
                    expanded
                        ? 'rounded-[32px] p-5 shadow-black/80'
                        : 'rounded-full px-3.5 py-1.5 flex items-center justify-between gap-2.5 cursor-pointer active:scale-95'
                } ${isPulsing ? 'ring-2 ring-emerald-400/50' : ''}`}
            >
                {/* ── ESTADO COMPACTO (Pill) ── */}
                {!expanded ? (
                    <div className="flex items-center justify-between w-full min-w-[240px] max-w-[310px] gap-2">
                        {/* Izquierda: Live dot + Nombre Municipio */}
                        <div className="flex items-center space-x-2 truncate">
                            <div className="relative flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/30 animate-ping" />
                            </div>
                            <span className="text-xs font-extrabold tracking-tight text-slate-100 truncate">
                                {municipio.nombre}
                            </span>
                        </div>

                        {/* Derecha: Sección activa con icono */}
                        <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
                            <CurrentIcon className={`w-3 h-3 ${currentSection.color}`} />
                            <span className="text-[11px] font-bold text-slate-200">
                                {currentSection.label}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                        </div>
                    </div>
                ) : (
                    /* ── ESTADO EXPANDIDO (HUD Completo) ── */
                    <div className="space-y-4 animate-fadeIn">
                        {/* Cabecera del HUD */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-2xl bg-[var(--pol-primary)] flex items-center justify-center font-extrabold text-white text-xs shadow-xs">
                                    {municipio.nombre.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-white tracking-tight">
                                            {municipio.nombre}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-400/30 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                            En vivo
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 block font-medium">
                                        {municipio.lema}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setExpanded(false)
                                }}
                                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                                aria-label="Cerrar isla"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Métricas Rápidas en Cápsulas */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Políticas</span>
                                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                                </div>
                                <p className="text-base font-extrabold text-white">7 Políticas</p>
                                <p className="text-[10px] text-slate-400">Poblacionales y sectoriales</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compromisos</span>
                                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <p className="text-base font-extrabold text-emerald-400">306 Metas</p>
                                <p className="text-[10px] text-slate-400">Monitoreo continuo</p>
                            </div>
                        </div>

                        {/* Accesos Rápidos de Navegación */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                Accesos Rápidos
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {quickLinks.map((link) => {
                                    const Icon = link.icon
                                    const active = pathname === link.href || (link.href.includes('/metas') && pathname?.includes('/metas'))
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setExpanded(false)}
                                            className={`p-2.5 rounded-2xl flex items-center space-x-2 text-xs font-bold transition-all border ${
                                                active
                                                    ? 'bg-[var(--pol-primary)] text-white border-[var(--pol-primary)] shadow-sm'
                                                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/5'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{link.label}</span>
                                            {active && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto shrink-0" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* CTA Directo Reportar Avance */}
                        <Link
                            href={`/politica/${municipio.slug}/reportar`}
                            onClick={() => setExpanded(false)}
                            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Registrar Nuevo Reporte</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    )
}
