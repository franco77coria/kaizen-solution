'use client'

import React, { useState, useMemo } from 'react'
import {
    Search, Filter, ChevronDown, ChevronRight, Download,
    CheckCircle2, Clock, AlertTriangle, Layers, Building2, TrendingUp,
    ExternalLink, DollarSign, Calendar, X, Eye, BarChart3,
    ChevronLeft, List, RefreshCw
} from 'lucide-react'
import { calcularCumplimientoActividad, promedioSimple } from '@/lib/politica/calculo'

interface DashboardClientProps {
    municipio: { slug: string; nombre: string; lema: string }
    politicas: any[]
    dependencias: any[]
    actividades: any[]
    avances: any[]
    sesion: any
}

export default function DashboardClient({
    municipio,
    politicas,
    dependencias,
    actividades,
    avances,
    sesion,
}: DashboardClientProps) {
    // Filtros
    const [search, setSearch] = useState('')
    const [selectedPolitica, setSelectedPolitica] = useState<string>('todas')
    const [selectedDependencia, setSelectedDependencia] = useState<string>('todas')
    const [selectedEstado, setSelectedEstado] = useState<string>('todos')

    // Modo de Vista: 'arbol' vs 'lista'
    const [viewMode, setViewMode] = useState<'arbol' | 'lista'>('arbol')

    // Paginación para vista de lista
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // Modal de detalle de actividad
    const [selectedActividadModal, setSelectedActividadModal] = useState<any | null>(null)

    // Filas expandidas en la matriz de árbol
    const [expandedPoliticas, setExpandedPoliticas] = useState<Record<string, boolean>>({})
    const [expandedEjes, setExpandedEjes] = useState<Record<string, boolean>>({})
    const [expandedLineas, setExpandedLineas] = useState<Record<string, boolean>>({})

    const toggleExpand = (setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) => {
        setter((prev) => ({ ...prev, [id]: !prev[id] }))
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

    // Paginación calculada
    const totalPages = Math.ceil(actividadesFiltradas.length / pageSize) || 1
    const actividadesPaginadas = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return actividadesFiltradas.slice(start, start + pageSize)
    }, [actividadesFiltradas, currentPage, pageSize])

    const handleFilterChange = (setter: any, val: any) => {
        setter(val)
        setCurrentPage(1)
    }

    // KPIs globales
    const totalActividades = actividadesFiltradas.length
    const cumplidas100 = actividadesFiltradas.filter((a) => a.resumen.cumplimientoPct >= 100).length
    const enProceso = actividadesFiltradas.filter((a) => a.resumen.cumplimientoPct > 0 && a.resumen.cumplimientoPct < 100).length
    const sinAvance = actividadesFiltradas.filter((a) => a.resumen.cumplimientoPct === 0).length

    const cumplimientoGlobal = useMemo(() => {
        if (!totalActividades) return 0
        const pcts = actividadesFiltradas.map((a) => a.resumen.cumplimientoPct)
        return promedioSimple(pcts)
    }, [actividadesFiltradas, totalActividades])

    const totalPresupuestoPlaneado = useMemo(() => {
        return actividadesFiltradas.reduce((acc, a) => acc + a.resumen.presupuestoPlaneado, 0)
    }, [actividadesFiltradas])

    const totalPresupuestoEjecutado = useMemo(() => {
        return actividadesFiltradas.reduce((acc, a) => acc + a.resumen.presupuestoEjecutado, 0)
    }, [actividadesFiltradas])

    // Datos para gráfico por Eje
    const resumenPorEje = useMemo(() => {
        const map = new Map<string, { nombre: string; pcts: number[] }>()
        for (const act of actividadesFiltradas) {
            const ejeNombre = act.linea?.eje?.nombre || 'General'
            const existing = map.get(ejeNombre) || { nombre: ejeNombre, pcts: [] as number[] }
            existing.pcts.push(act.resumen.cumplimientoPct)
            map.set(ejeNombre, existing)
        }

        return Array.from(map.values())
            .map((item) => ({
                nombre: item.nombre,
                pct: promedioSimple(item.pcts),
                total: item.pcts.length,
            }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 5)
    }, [actividadesFiltradas])

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
        link.setAttribute('download', `politicas_publicas_${municipio.slug}_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            {/* Header Limpio Minimalista (Igual a la imagen de referencia) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Monitoreo de cumplimiento del Plan de Desarrollo • {municipio.nombre}
                    </p>
                </div>

                <button
                    onClick={exportarCSV}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Exportar reporte CSV</span>
                </button>
            </div>

            {/* 4 Tarjetas KPI Claras en Fondo Blanco (Exactamente idénticas a la imagen de referencia) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Avance Global */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Avance global</span>
                        <div className="w-7 h-7 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{cumplimientoGlobal}%</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {cumplidas100} de {totalActividades} metas completadas
                        </p>
                    </div>
                </div>

                {/* KPI 2: Metas Completadas */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Metas completadas</span>
                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{cumplidas100}</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {totalActividades ? Math.round((cumplidas100 / totalActividades) * 100) : 0}% del total de compromisos
                        </p>
                    </div>
                </div>

                {/* KPI 3: En Proceso */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">En proceso</span>
                        <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{enProceso}</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {sinAvance} compromisos aún sin avance
                        </p>
                    </div>
                </div>

                {/* KPI 4: Presupuesto Ejecutado */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Presupuesto ejecutado</span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            ${totalPresupuestoEjecutado.toLocaleString('es-CO')}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Planeado: ${totalPresupuestoPlaneado.toLocaleString('es-CO')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Barra de Progreso por Ejes (Card Limpia) */}
            {resumenPorEje.length > 0 && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-900">Cumplimiento por Eje Estratégico</h3>
                        <span className="text-xs text-slate-400 font-medium">Principales ejes</span>
                    </div>
                    <div className="space-y-3 pt-1">
                        {resumenPorEje.map((eje) => (
                            <div key={eje.nombre} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700">{eje.nombre} ({eje.total} metas)</span>
                                    <span className="font-bold text-[var(--pol-primary-ink)]">{eje.pct}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--pol-primary)] rounded-full transition-all duration-500"
                                        style={{ width: `${eje.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Barra de Filtros Minimalista */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                        placeholder="Buscar por actividad, código o dependencia..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] font-medium"
                    />
                </div>

                <select
                    value={selectedPolitica}
                    onChange={(e) => handleFilterChange(setSelectedPolitica, e.target.value)}
                    className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                >
                    <option value="todas">Todas las Políticas ({politicas.length})</option>
                    {politicas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                </select>

                <select
                    value={selectedDependencia}
                    onChange={(e) => handleFilterChange(setSelectedDependencia, e.target.value)}
                    className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                >
                    <option value="todas">Todas las Dependencias ({dependencias.length})</option>
                    {dependencias.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                </select>

                <select
                    value={selectedEstado}
                    onChange={(e) => handleFilterChange(setSelectedEstado, e.target.value)}
                    className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                >
                    <option value="todos">Todos los estados</option>
                    <option value="100">Completadas (100%)</option>
                    <option value="proceso">En proceso (1-99%)</option>
                    <option value="0">Sin avance (0%)</option>
                </select>

                {/* Modos de Vista */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-stretch md:self-auto">
                    <button
                        onClick={() => setViewMode('arbol')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            viewMode === 'arbol'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Jerarquía</span>
                    </button>
                    <button
                        onClick={() => setViewMode('lista')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            viewMode === 'lista'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Lista Paginada</span>
                    </button>
                </div>
            </div>

            {/* VISTA 1: Jerarquía por Árbol */}
            {viewMode === 'arbol' && (
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-600" />
                            Estructura de Compromisos
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                            {actividadesFiltradas.length} actividades
                        </span>
                    </div>

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
                                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <button className="text-slate-400 hover:text-slate-700">
                                                {isPolOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <span className="font-extrabold text-slate-900 text-base tracking-tight">{pol.nombre}</span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                                {polActividades.length} actividades
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${polPct}%` }} />
                                            </div>
                                            <span className="font-extrabold text-emerald-600 text-sm min-w-[45px] text-right">{polPct}%</span>
                                        </div>
                                    </div>

                                    {/* Nivel 2: Ejes */}
                                    {isPolOpen && (
                                        <div className="pl-6 sm:pl-10 pr-4 pb-3 space-y-3">
                                            {pol.ejes.map((eje: any) => {
                                                const isEjeOpen = expandedEjes[eje.id] ?? true
                                                const ejeActividades = polActividades.filter((a) => a.linea?.ejeId === eje.id)
                                                if (ejeActividades.length === 0) return null

                                                const ejePct = promedioSimple(ejeActividades.map((a) => a.resumen.cumplimientoPct))

                                                return (
                                                    <div key={eje.id} className="rounded-xl bg-slate-50/70 border border-slate-200/80 overflow-hidden">
                                                        <div
                                                            onClick={() => toggleExpand(setExpandedEjes, eje.id)}
                                                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                {isEjeOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                <span className="font-bold text-slate-800 text-sm">{eje.nombre}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-emerald-600">{ejePct}%</span>
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
                                                                                <span className="flex items-center gap-1.5">
                                                                                    {isLineaOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                                                                    {linea.nombre}
                                                                                </span>
                                                                                <span className="text-slate-400 font-semibold">{lineaActividades.length} metas</span>
                                                                            </div>

                                                                            {/* Nivel 4: Actividades */}
                                                                            {isLineaOpen && (
                                                                                <div className="space-y-2 mt-1">
                                                                                    {lineaActividades.map((act) => (
                                                                                        <div
                                                                                            key={act.id}
                                                                                            onClick={() => setSelectedActividadModal(act)}
                                                                                            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                                                                                        >
                                                                                            <div className="space-y-1 flex-1">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    {act.codigo && (
                                                                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                                                                            {act.codigo}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                                                                                                        <Building2 className="w-3 h-3 text-slate-400" />
                                                                                                        {act.dependencia?.nombre || 'General'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-sm font-semibold text-slate-900 leading-snug">
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

                                                                                                {/* Pasteles de estado idénticos a la imagen de referencia */}
                                                                                                {act.resumen.cumplimientoPct >= 100 ? (
                                                                                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                                                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                                                        Cumplida
                                                                                                    </span>
                                                                                                ) : act.resumen.cumplimientoPct > 0 ? (
                                                                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1">
                                                                                                        <Clock className="w-3 h-3 text-amber-600" />
                                                                                                        En proceso
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1">
                                                                                                        <AlertTriangle className="w-3 h-3 text-slate-400" />
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

            {/* VISTA 2: Lista Paginada Rápida */}
            {viewMode === 'lista' && (
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-3">
                    <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <List className="w-4 h-4 text-slate-600" />
                            Vista de Lista Paginada
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span>Mostrar</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                            >
                                <option value={10}>10 por pág.</option>
                                <option value={25}>25 por pág.</option>
                                <option value={50}>50 por pág.</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                        {actividadesPaginadas.map((act) => (
                            <div
                                key={act.id}
                                onClick={() => setSelectedActividadModal(act)}
                                className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                            >
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {act.codigo && (
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                {act.codigo}
                                            </span>
                                        )}
                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                                            <Building2 className="w-3 h-3 text-slate-400" />
                                            {act.dependencia?.nombre || 'General'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-900 leading-snug">{act.nombre}</p>
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
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                                            Cumplida
                                        </span>
                                    ) : act.resumen.cumplimientoPct > 0 ? (
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                                            En proceso
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                                            Sin avance
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Controles de Paginación */}
                    <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>
                            Página <strong className="text-slate-900">{currentPage}</strong> de <strong className="text-slate-900">{totalPages}</strong> ({actividadesFiltradas.length} actividades)
                        </span>

                        <div className="flex items-center space-x-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold transition-all flex items-center gap-1 shadow-xs"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>

                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold transition-all flex items-center gap-1 shadow-xs"
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Actividad */}
            {selectedActividadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
                    <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Detalle del Compromiso
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                                    {selectedActividadModal.nombre}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedActividadModal(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                                <span className="text-slate-500 font-medium">Dependencia</span>
                                <p className="font-bold text-slate-900">{selectedActividadModal.dependencia?.nombre || 'General'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
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
                                        <div key={av.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-slate-500">
                                                <span className="font-semibold text-slate-800">Período: {av.periodoTexto || 'N/A'}</span>
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
