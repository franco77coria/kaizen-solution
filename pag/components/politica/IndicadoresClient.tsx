'use client'

import React, { useState } from 'react'
import { Search, Target } from 'lucide-react'
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Indicadores KPI</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Evaluación multianual de metas vs. ejecución real por año (2024-2027)
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar indicador por código o nombre..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>
                <select
                    value={selectedPolitica}
                    onChange={(e) => setSelectedPolitica(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                >
                    <option value="todas">Todas las Políticas Públicas</option>
                    {politicas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Lista de Indicadores en Tarjetas Blancas */}
            <div className="grid grid-cols-1 gap-4">
                {filtrados.map((ind) => (
                    <div key={ind.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {ind.codigo}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">
                                        {ind.politica?.nombre || 'General'}
                                    </span>
                                    {ind.menorEsMejor && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            Menor es mejor
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 leading-snug">{ind.nombre}</h3>
                                {ind.fuente && (
                                    <p className="text-xs text-slate-400 font-medium">Fuente: {ind.fuente}</p>
                                )}
                            </div>

                            <div className="text-right">
                                <span className="text-xs text-slate-400 font-medium block">Cumplimiento promedio</span>
                                <span className="text-2xl font-extrabold text-emerald-600">
                                    {ind.resumen.cumplimientoPromedio != null ? `${ind.resumen.cumplimientoPromedio}%` : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Metas multianuales */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                            {[2024, 2025, 2026].map((anio) => {
                                const metaObj = ind.metas.find((m: any) => m.anio === anio)
                                const pct = ind.resumen.cumplimientoPorAnio[anio]

                                return (
                                    <div key={anio} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
                                        <span className="text-xs font-bold text-slate-500">{anio}</span>
                                        <div className="text-xs text-slate-700">
                                            Real: <span className="font-bold text-slate-900">{metaObj?.real != null ? metaObj.real : '-'}</span> / Meta: <span className="font-semibold text-slate-500">{metaObj?.meta != null ? metaObj.meta : '-'}</span>
                                        </div>
                                        <div>
                                            {pct != null ? (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                                                    {pct}%
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400">Pendiente</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
