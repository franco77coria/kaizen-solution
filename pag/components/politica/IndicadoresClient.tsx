'use client'

import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { calcularCumplimientoIndicador } from '@/lib/politica/calculo'
import ModernSelect, { OptionItem } from './ModernSelect'
import TablePagination from './TablePagination'

interface IndicadoresClientProps {
    municipio: any
    indicadores: any[]
    politicas: any[]
}

const PAGE_SIZE = 10

export default function IndicadoresClient({
    municipio,
    indicadores,
    politicas,
}: IndicadoresClientProps) {
    const [search, setSearch] = useState('')
    const [selectedPolitica, setSelectedPolitica] = useState('todas')
    const [currentPage, setCurrentPage] = useState(1)

    const politicaOptions: OptionItem[] = useMemo(() => [
        { value: 'todas', label: `Todas las Políticas Públicas (${politicas.length})` },
        ...politicas.map((p) => ({ value: p.id, label: p.nombre })),
    ], [politicas])

    const indicadoresCalculados = useMemo(() => {
        return indicadores.map((ind) => {
            const resumen = calcularCumplimientoIndicador(ind, ind.metas)
            return {
                ...ind,
                resumen,
            }
        })
    }, [indicadores])

    const filtrados = useMemo(() => {
        return indicadoresCalculados.filter((ind) => {
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
    }, [indicadoresCalculados, search, selectedPolitica])

    // Paginación 10 en 10
    const totalPages = Math.ceil(filtrados.length / PAGE_SIZE) || 1
    const indicadoresPaginados = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filtrados.slice(start, start + PAGE_SIZE)
    }, [filtrados, currentPage])

    const handleSearchChange = (val: string) => {
        setSearch(val)
        setCurrentPage(1)
    }

    const handlePoliticaChange = (val: string) => {
        setSelectedPolitica(val)
        setCurrentPage(1)
    }

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Indicadores KPI</h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Evaluación multianual de metas vs. ejecución real por año (2024-2027) • {municipio.nombre}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs">
                <div className="relative w-full min-w-0">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Buscar indicador por código o nombre..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />
                </div>
                <div className="w-full min-w-0">
                    <ModernSelect
                        value={selectedPolitica}
                        onChange={handlePoliticaChange}
                        options={politicaOptions}
                        placeholder="Seleccionar Política"
                        searchable
                    />
                </div>
            </div>

            {/* Lista de Indicadores en Tarjetas Blancas Redondeadas 24px */}
            <div className="space-y-4 w-full">
                <div className="grid grid-cols-1 gap-4 w-full">
                    {indicadoresPaginados.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-[24px] border border-slate-200 text-xs text-slate-400 font-medium">
                            No se encontraron indicadores con los filtros seleccionados.
                        </div>
                    ) : (
                        indicadoresPaginados.map((ind) => (
                            <div key={ind.id} className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                                {ind.codigo}
                                            </span>
                                            <span className="text-xs font-medium text-slate-500">
                                                {ind.politica?.nombre || 'General'}
                                            </span>
                                            {ind.menorEsMejor && (
                                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    Menor es mejor
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{ind.nombre}</h3>
                                        {ind.fuente && (
                                            <p className="text-xs text-slate-400 font-medium">Fuente: {ind.fuente}</p>
                                        )}
                                    </div>

                                    <div className="sm:text-right min-w-[120px]">
                                        <span className="text-[11px] text-slate-400 font-medium block">Cumplimiento promedio</span>
                                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                                            {ind.resumen.cumplimientoPromedio != null ? `${ind.resumen.cumplimientoPromedio}%` : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* Metas multianuales */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                                    {[2024, 2025, 2026].map((anio) => {
                                        const metaObj = ind.metas.find((m: any) => m.anio === anio)
                                        const pct = ind.resumen.cumplimientoPorAnio[anio]

                                        return (
                                            <div key={anio} className="p-3.5 rounded-2xl bg-white sm:bg-slate-50 border border-slate-200/70 text-center space-y-1.5 shadow-xs">
                                                <span className="text-xs font-bold text-slate-500 block">{anio}</span>
                                                <div className="text-xs text-slate-700">
                                                    Real: <strong className="text-slate-900">{metaObj?.real != null ? metaObj.real : '-'}</strong> / Meta: <span className="font-semibold text-slate-500">{metaObj?.meta != null ? metaObj.meta : '-'}</span>
                                                </div>
                                                <div>
                                                    {pct != null ? (
                                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 inline-block">
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
                        ))
                    )}
                </div>

                {/* Barra de Paginación 10 en 10 */}
                {filtrados.length > 0 && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-white">
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filtrados.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setCurrentPage}
                            itemName="indicadores"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
