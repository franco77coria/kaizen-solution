'use client'

import React, { useState } from 'react'
import { Search, TrendingUp, Target, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react'
import { calcularCumplimientoIndicador } from '@/lib/politica/calculo'

interface IndicadoresClientProps {
    municipio: any
    indicadores: any[]
    politicas: any[]
}

export default function IndicadoresClient({
    municipio,
    indicadores,
    politicas,
}: IndicadoresClientProps) {
    const [search, setSearch] = useState('')
    const [selectedPolitica, setSelectedPolitica] = useState('todas')

    // Calcular cumplimiento de cada indicador
    const indicadoresCalculados = indicadores.map((ind) => {
        const resumen = calcularCumplimientoIndicador(ind, ind.metas)
        return {
            ...ind,
            resumen,
        }
    })

    const filtrados = indicadoresCalculados.filter((ind) => {
        if (search.trim()) {
            const q = search.toLowerCase()
            const inNombre = ind.nombre.toLowerCase().includes(q)
            const inCodigo = ind.codigo.toLowerCase().includes(q)
            if (!inNombre && !inCodigo) return false
        }
        if (selectedPolitica !== 'todas') {
            if (ind.politicaId !== selectedPolitica) return false
        }
        return true
    })

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                    <Target className="w-7 h-7 text-[var(--pol-primary-light)]" />
                    Seguimiento de Indicadores KPI
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Evaluación multianual de metas vs. ejecución real por año (2024-2027)
                </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar indicador por código o nombre..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>
                <select
                    value={selectedPolitica}
                    onChange={(e) => setSelectedPolitica(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                >
                    <option value="todas">Todas las Políticas Públicas</option>
                    {politicas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Lista de Indicadores */}
            <div className="grid grid-cols-1 gap-4">
                {filtrados.map((ind) => {
                    const metas2024 = ind.metas.find((m: any) => m.anio === 2024)
                    const metas2025 = ind.metas.find((m: any) => m.anio === 2025)
                    const metas2026 = ind.metas.find((m: any) => m.anio === 2026)

                    return (
                        <div key={ind.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                            {ind.codigo}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                            {ind.politica?.nombre || 'General'}
                                        </span>
                                        {ind.menorEsMejor && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                Menor es mejor
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-100">{ind.nombre}</h3>
                                    {ind.fuente && (
                                        <p className="text-xs text-slate-400">Fuente: {ind.fuente}</p>
                                    )}
                                </div>

                                <div className="text-right flex items-center gap-3">
                                    <div>
                                        <span className="text-xs text-slate-400 font-medium block">Cumplimiento Promedio</span>
                                        <span className="text-2xl font-black text-emerald-400">
                                            {ind.resumen.cumplimientoPromedio != null ? `${ind.resumen.cumplimientoPromedio}%` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla Multianual 2024 - 2026 */}
                            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
                                {[2024, 2025, 2026].map((anio) => {
                                    const metaObj = ind.metas.find((m: any) => m.anio === anio)
                                    const pct = ind.resumen.cumplimientoPorAnio[anio]

                                    return (
                                        <div key={anio} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                                            <span className="text-xs font-bold text-slate-400">{anio}</span>
                                            <div className="text-xs text-slate-300">
                                                Real: <span className="font-semibold text-white">{metaObj?.real != null ? metaObj.real : '-'}</span> / Meta: <span className="font-semibold text-slate-400">{metaObj?.meta != null ? metaObj.meta : '-'}</span>
                                            </div>
                                            <div className="mt-1">
                                                {pct != null ? (
                                                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        {pct}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-500">Pendiente</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
