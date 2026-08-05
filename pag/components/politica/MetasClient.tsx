'use client'

import React, { useState, useMemo } from 'react'
import {
    Search, ChevronDown, ChevronRight, Download,
    CheckCircle2, Clock, AlertTriangle, Layers, Building2,
    ExternalLink, X, List
} from 'lucide-react'
import { calcularCumplimientoActividad, promedioSimple } from '@/lib/politica/calculo'
import ModernSelect, { OptionItem } from './ModernSelect'
import TablePagination from './TablePagination'

interface MetasClientProps {
    municipio: { slug: string; nombre: string; lema: string }
    politicas: any[]
    dependencias: any[]
    actividades: any[]
    avances: any[]
    sesion: any
}

const PAGE_SIZE = 10

export default function MetasClient({
    municipio,
    politicas,
    dependencias,
    actividades,
    avances,
    sesion,
}: MetasClientProps) {
    // Filtros
    const [search, setSearch] = useState('')
    const [selectedPolitica, setSelectedPolitica] = useState<string>('todas')
    const [selectedDependencia, setSelectedDependencia] = useState<string>('todas')
    const [selectedEstado, setSelectedEstado] = useState<string>('todos')

    // Modo de Vista: 'arbol' vs 'lista'
    const [viewMode, setViewMode] = useState<'arbol' | 'lista'>('arbol')

    // Paginación para vista de lista
    const [currentPage, setCurrentPage] = useState(1)

    // Modal de detalle de actividad
    const [selectedActividadModal, setSelectedActividadModal] = useState<any | null>(null)

    // Filas expandidas en la matriz de árbol
    const [expandedPoliticas, setExpandedPoliticas] = useState<Record<string, boolean>>({})
    const [expandedEjes, setExpandedEjes] = useState<Record<string, boolean>>({})
    const [expandedLineas, setExpandedLineas] = useState<Record<string, boolean>>({})

    const toggleExpand = (setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) => {
        setter((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const expandirTodo = () => {
        const pObj: Record<string, boolean> = {}
        const eObj: Record<string, boolean> = {}
        const lObj: Record<string, boolean> = {}
        for (const p of politicas) {
            pObj[p.id] = true
            for (const e of p.ejes || []) {
                eObj[e.id] = true
                for (const l of e.lineas || []) {
                    lObj[l.id] = true
                }
            }
        }
        setExpandedPoliticas(pObj)
        setExpandedEjes(eObj)
        setExpandedLineas(lObj)
    }

    const colapsarTodo = () => {
        setExpandedPoliticas({})
        setExpandedEjes({})
        setExpandedLineas({})
    }

    // Mapa de avances por actividad
    const avancesPorActividad = useMemo(() => {
        const map = new Map<string, any[]>()
        for (const av of avances) {
            if (av.actividadId) {
                const list = map.get(av.actividadId) || []
                list.push(av)
                map.set(av.actividadId, list)
            }
        }
        return map
    }, [avances])

    // Cálculo de actividades con su resumen
    const actividadesConResumen = useMemo(() => {
        return actividades.map((act) => {
            const listAv = avancesPorActividad.get(act.id) || []
            const resumen = calcularCumplimientoActividad(act, listAv)
            return {
                ...act,
                resumen,
                avancesList: listAv,
            }
        })
    }, [actividades, avancesPorActividad])

    // Opciones para los ModernSelects
    const politicaOptions: OptionItem[] = useMemo(() => [
        { value: 'todas', label: `Todas las Políticas (${politicas.length})` },
        ...politicas.map((p) => ({ value: p.id, label: p.nombre })),
    ], [politicas])

    const dependenciaOptions: OptionItem[] = useMemo(() => [
        { value: 'todas', label: `Todas las Dependencias (${dependencias.length})` },
        ...dependencias.map((d) => ({ value: d.id, label: d.nombre })),
    ], [dependencias])

    const estadoOptions: OptionItem[] = [
        { value: 'todos', label: 'Todos los estados' },
        { value: '100', label: 'Completadas (100%)', badge: '100%' },
        { value: 'proceso', label: 'En proceso (1-99%)', badge: 'En curso' },
        { value: '0', label: 'Sin avance (0%)', badge: '0%' },
    ]

    // Aplicar Filtros
    const actividadesFiltradas = useMemo(() => {
        return actividadesConResumen.filter((act) => {
            if (search.trim()) {
                const q = search.toLowerCase()
                const inNombre = act.nombre.toLowerCase().includes(q)
                const inDep = act.dependencia?.nombre.toLowerCase().includes(q)
                const inCodigo = act.codigo?.toLowerCase().includes(q)
                if (!inNombre && !inDep && !inCodigo) return false
            }

            if (selectedDependencia !== 'todas') {
                if (act.dependenciaId !== selectedDependencia) return false
            }

            if (selectedPolitica !== 'todas') {
                const tienePol = act.politicas.some((ap: any) => ap.politicaId === selectedPolitica)
                if (!tienePol) return false
            }

            if (selectedEstado === '100' && act.resumen.cumplimientoPct < 100) return false
            if (selectedEstado === 'proceso' && (act.resumen.cumplimientoPct === 0 || act.resumen.cumplimientoPct === 100)) return false
            if (selectedEstado === '0' && act.resumen.cumplimientoPct > 0) return false

            return true
        })
    }, [actividadesConResumen, search, selectedDependencia, selectedPolitica, selectedEstado])

    // Paginación calculada de 10 en 10
    const totalPages = Math.ceil(actividadesFiltradas.length / PAGE_SIZE) || 1
    const actividadesPaginadas = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return actividadesFiltradas.slice(start, start + PAGE_SIZE)
    }, [actividadesFiltradas, currentPage])

    const handleFilterChange = (setter: any, val: any) => {
        setter(val)
        setCurrentPage(1)
    }

    // Exportar CSV
    const exportarCSV = () => {
        const headers = ['Política', 'Eje', 'Línea', 'Actividad', 'Dependencia', 'Tipo Meta', 'Meta', 'Avance Real', '% Cumplimiento', 'Presupuesto Planeado', 'Presupuesto Ejecutado']
        const rows = actividadesFiltradas.map((act) => [
            act.politicas.map((p: any) => p.politica.nombre).join(' / '),
            act.linea?.eje?.nombre || '',
            act.linea?.nombre || '',
            `"${act.nombre.replace(/"/g, '""')}"`,
            act.dependencia?.nombre || '',
            act.tipoMeta,
            act.resumen.metaTexto,
            act.resumen.avanceTexto,
            `${act.resumen.cumplimientoPct}%`,
            act.resumen.presupuestoPlaneado,
            act.resumen.presupuestoEjecutado,
        ])

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `plan_metas_${municipio.slug}_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6 w-full">
            {/* Header Limpio Minimalista */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Plan de Metas</h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Matriz jerárquica de seguimiento de las 7 Políticas Públicas de {municipio.nombre}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {viewMode === 'arbol' && (
                        <>
                            <button
                                onClick={expandirTodo}
                                className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-xs cursor-pointer"
                            >
                                Expandir todo
                            </button>
                            <button
                                onClick={colapsarTodo}
                                className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-xs cursor-pointer"
                            >
                                Colapsar todo
                            </button>
                        </>
                    )}

                    <button
                        onClick={exportarCSV}
                        className="px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* Barra de Filtros con ModernSelect */}
            <div className="p-4 sm:p-5 rounded-[24px] bg-[#f8fafc] border border-slate-200/80 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                    {/* Buscador */}
                    <div className="relative w-full min-w-0">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                            placeholder="Buscar por actividad, código..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] font-medium shadow-xs"
                        />
                    </div>

                    {/* Filtro Políticas ModernSelect */}
                    <div className="w-full min-w-0">
                        <ModernSelect
                            value={selectedPolitica}
                            onChange={(val) => handleFilterChange(setSelectedPolitica, val)}
                            options={politicaOptions}
                            placeholder="Seleccionar Política"
                            searchable
                        />
                    </div>

                    {/* Filtro Dependencias ModernSelect */}
                    <div className="w-full min-w-0">
                        <ModernSelect
                            value={selectedDependencia}
                            onChange={(val) => handleFilterChange(setSelectedDependencia, val)}
                            options={dependenciaOptions}
                            placeholder="Seleccionar Dependencia"
                            searchable
                        />
                    </div>

                    {/* Filtro Estados ModernSelect */}
                    <div className="w-full min-w-0">
                        <ModernSelect
                            value={selectedEstado}
                            onChange={(val) => handleFilterChange(setSelectedEstado, val)}
                            options={estadoOptions}
                            placeholder="Estado"
                        />
                    </div>
                </div>

                {/* Alternador de Vista & Contador */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <span className="text-xs text-slate-500 font-medium">
                        Mostrando <strong className="text-slate-900">{actividadesFiltradas.length}</strong> de <strong className="text-slate-900">{actividades.length}</strong> metas totales
                    </span>

                    <div className="flex items-center p-1 rounded-2xl bg-white border border-slate-200 shadow-xs self-stretch sm:self-auto">
                        <button
                            onClick={() => setViewMode('arbol')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'arbol'
                                    ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Jerarquía en Árbol</span>
                        </button>
                        <button
                            onClick={() => setViewMode('lista')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'lista'
                                    ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Lista Paginada (10 por página)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* VISTA 1: Jerarquía por Árbol */}
            {viewMode === 'arbol' && (
                <div className="rounded-[24px] bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {politicas.map((pol) => {
                            const isPolOpen = expandedPoliticas[pol.id] ?? true
                            const polActividades = actividadesFiltradas.filter((a) =>
                                a.politicas.some((ap: any) => ap.politicaId === pol.id)
                            )
                            if (polActividades.length === 0 && (selectedPolitica !== 'todas' || search || selectedDependencia !== 'todas')) {
                                return null
                            }

                            const polPct = promedioSimple(polActividades.map((a) => a.resumen.cumplimientoPct))

                            return (
                                <div key={pol.id} className="bg-white">
                                    {/* Nivel 1: Política */}
                                    <div
                                        onClick={() => toggleExpand(setExpandedPoliticas, pol.id)}
                                        className="px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                                {isPolOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </div>
                                            <div className="truncate">
                                                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight block truncate">
                                                    {pol.nombre}
                                                </span>
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    {polActividades.length} metas registradas
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4 min-w-[120px] justify-end">
                                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${polPct}%` }} />
                                            </div>
                                            <span className="font-extrabold text-emerald-600 text-sm">{polPct}%</span>
                                        </div>
                                    </div>

                                    {/* Nivel 2: Ejes */}
                                    {isPolOpen && (
                                        <div className="pl-4 sm:pl-10 pr-3 sm:pr-6 pb-4 space-y-3">
                                            {pol.ejes.map((eje: any) => {
                                                const isEjeOpen = expandedEjes[eje.id] ?? true
                                                const ejeActividades = polActividades.filter((a) => a.linea?.ejeId === eje.id)
                                                if (ejeActividades.length === 0) return null

                                                const ejePct = promedioSimple(ejeActividades.map((a) => a.resumen.cumplimientoPct))

                                                return (
                                                    <div key={eje.id} className="rounded-2xl bg-slate-50/70 border border-slate-200/80 overflow-hidden">
                                                        <div
                                                            onClick={() => toggleExpand(setExpandedEjes, eje.id)}
                                                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                                                        >
                                                            <div className="flex items-center space-x-2 truncate">
                                                                {isEjeOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">{eje.nombre}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-emerald-600 min-w-[40px] text-right">{ejePct}%</span>
                                                        </div>

                                                        {/* Nivel 3: Líneas */}
                                                        {isEjeOpen && (
                                                            <div className="px-4 pb-3 pt-1 space-y-2">
                                                                {eje.lineas.map((linea: any) => {
                                                                    const isLineaOpen = expandedLineas[linea.id] ?? true
                                                                    const lineaActividades = ejeActividades.filter((a) => a.lineaId === linea.id)
                                                                    if (lineaActividades.length === 0) return null

                                                                    return (
                                                                        <div key={linea.id} className="pl-3 border-l-2 border-slate-200 space-y-2 mt-2">
                                                                            <div
                                                                                onClick={() => toggleExpand(setExpandedLineas, linea.id)}
                                                                                className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer py-1 select-none"
                                                                            >
                                                                                <span className="flex items-center gap-1.5 truncate">
                                                                                    {isLineaOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                                                                    <span className="truncate">{linea.nombre}</span>
                                                                                </span>
                                                                                <span className="text-slate-400 font-semibold min-w-[50px] text-right">{lineaActividades.length} metas</span>
                                                                            </div>

                                                                            {/* Nivel 4: Actividades */}
                                                                            {isLineaOpen && (
                                                                                <div className="space-y-2 mt-1">
                                                                                    {lineaActividades.map((act) => (
                                                                                        <div
                                                                                            key={act.id}
                                                                                            onClick={() => setSelectedActividadModal(act)}
                                                                                            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                                                                                        >
                                                                                            <div className="space-y-1 flex-1">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    {act.codigo && (
                                                                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                                                                                            {act.codigo}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1">
                                                                                                        <Building2 className="w-3 h-3 text-slate-400" />
                                                                                                        {act.dependencia?.nombre || 'General'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                                                                                    {act.nombre}
                                                                                                </p>
                                                                                            </div>

                                                                                            <div className="flex items-center space-x-4 self-end sm:self-center">
                                                                                                <div className="text-right">
                                                                                                    <div className="text-xs font-semibold text-slate-700">
                                                                                                        {act.resumen.avanceTexto} / {act.resumen.metaTexto}
                                                                                                    </div>
                                                                                                    <div className="text-[11px] font-bold text-emerald-600">
                                                                                                        {act.resumen.cumplimientoPct}% ejecutado
                                                                                                    </div>
                                                                                                </div>

                                                                                                {act.resumen.cumplimientoPct >= 100 ? (
                                                                                                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                                                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                                                        Cumplida
                                                                                                    </span>
                                                                                                ) : act.resumen.cumplimientoPct > 0 ? (
                                                                                                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                                                                                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                                                        En proceso
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center gap-1">
                                                                                                        <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                                                                                                        Sin avance
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* VISTA 2: Lista Paginada Rápida de 10 en 10 */}
            {viewMode === 'lista' && (
                <div className="rounded-[24px] bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <List className="w-4 h-4 text-slate-600" />
                            Vista de Lista Paginada (10 por página)
                        </h3>
                    </div>

                    <div className="p-4 space-y-2.5">
                        {actividadesPaginadas.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 font-medium">
                                No se encontraron actividades con los filtros actuales.
                            </div>
                        ) : (
                            actividadesPaginadas.map((act) => (
                                <div
                                    key={act.id}
                                    onClick={() => setSelectedActividadModal(act)}
                                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                                >
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {act.codigo && (
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                                    {act.codigo}
                                                </span>
                                            )}
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                {act.dependencia?.nombre || 'General'}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{act.nombre}</p>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="text-xs font-semibold text-slate-700">
                                                {act.resumen.avanceTexto} / {act.resumen.metaTexto}
                                            </div>
                                            <div className="text-[11px] font-bold text-emerald-600">
                                                {act.resumen.cumplimientoPct}% ejecutado
                                            </div>
                                        </div>

                                        {act.resumen.cumplimientoPct >= 100 ? (
                                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                                Cumplida
                                            </span>
                                        ) : act.resumen.cumplimientoPct > 0 ? (
                                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                                                En proceso
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
                                                Sin avance
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* TablePagination 10 en 10 */}
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={actividadesFiltradas.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        itemName="actividades"
                    />
                </div>
            )}

            {/* Modal de Detalle de Actividad */}
            {selectedActividadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
                    <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-[28px] shadow-xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Detalle del Compromiso
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                                    {selectedActividadModal.nombre}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedActividadModal(null)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                <span className="text-slate-500 font-medium">Dependencia</span>
                                <p className="font-bold text-slate-900">{selectedActividadModal.dependencia?.nombre || 'General'}</p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                <span className="text-slate-500 font-medium">Ejecución</span>
                                <p className="font-bold text-emerald-600">
                                    {selectedActividadModal.resumen.avanceTexto} / {selectedActividadModal.resumen.metaTexto} ({selectedActividadModal.resumen.cumplimientoPct}%)
                                </p>
                            </div>
                        </div>

                        {/* Avances */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Reportes Registrados ({selectedActividadModal.avancesList.length})
                            </h4>

                            {selectedActividadModal.avancesList.length === 0 ? (
                                <p className="text-xs text-slate-400 py-3 text-center">Sin reportes registrados para esta actividad.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {selectedActividadModal.avancesList.map((av: any) => (
                                        <div key={av.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                                            <div className="flex items-center justify-between text-slate-500">
                                                <span className="font-bold text-slate-800">Período: {av.periodoTexto || 'N/A'}</span>
                                                <span>{new Date(av.createdAt).toLocaleDateString('es-CO')}</span>
                                            </div>
                                            {av.observaciones && (
                                                <p className="text-slate-600">{av.observaciones}</p>
                                            )}

                                            {av.evidencias && av.evidencias.length > 0 && (
                                                <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                                                    <span className="text-slate-500 font-semibold">Evidencia:</span>
                                                    {av.evidencias.map((ev: any) => (
                                                        <a
                                                            key={ev.id}
                                                            href={ev.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center text-xs text-[var(--pol-primary-ink)] hover:underline font-bold"
                                                        >
                                                            <ExternalLink className="w-3 h-3 mr-1" />
                                                            {ev.nombre || 'Ver archivo'}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
