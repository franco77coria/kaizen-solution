'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, CheckSquare2, Target, FileText, Menu, Shield
} from 'lucide-react'

interface MobileBottomIslandProps {
    municipio: {
        slug: string
        nombre: string
    }
    sesion?: any
    onOpenMenu?: () => void
}

export default function MobileBottomIsland({
    municipio,
    sesion,
    onOpenMenu,
}: MobileBottomIslandProps) {
    const pathname = usePathname()

    const navItems = [
        {
            label: 'INICIO',
            href: `/politica/${municipio.slug}`,
            icon: LayoutDashboard,
            exact: true,
        },
        {
            label: 'METAS',
            href: `/politica/${municipio.slug}/metas`,
            icon: CheckSquare2,
            exact: false,
        },
        {
            label: 'KPIS',
            href: `/politica/${municipio.slug}/indicadores`,
            icon: Target,
            exact: false,
        },
        {
            label: 'REPORTAR',
            href: `/politica/${municipio.slug}/reportar`,
            icon: FileText,
            exact: false,
        },
    ]

    const isItemActive = (item: typeof navItems[0]) => {
        if (item.exact) return pathname === item.href
        return pathname?.startsWith(item.href)
    }

    return (
        <nav
            aria-label="Navegación móvil inferior"
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-1.5rem)] max-w-sm"
        >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 rounded-[32px] px-2.5 py-1.5 flex items-center justify-around gap-1">
                {navItems.map((item) => {
                    const active = isItemActive(item)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
                                active
                                    ? 'bg-[var(--pol-primary-ink)]/10 text-[var(--pol-primary-ink)] rounded-2xl px-3 py-1 shadow-xs'
                                    : 'text-slate-400 hover:text-slate-700 px-2 py-1'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${active ? 'text-[var(--pol-primary-ink)] stroke-[2.5]' : 'stroke-2'}`} />
                            <span className={`text-[9px] font-black tracking-wider uppercase mt-0.5 ${
                                active ? 'text-[var(--pol-primary-ink)]' : 'text-slate-400'
                            }`}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}

                {/* Botón MÁS para menú o Admin */}
                <button
                    onClick={onOpenMenu}
                    className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-700 px-2 py-1 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                    <Menu className="w-4 h-4 stroke-2" />
                    <span className="text-[9px] font-black tracking-wider uppercase mt-0.5 text-slate-400">
                        MÁS
                    </span>
                </button>
            </div>
        </nav>
    )
}
