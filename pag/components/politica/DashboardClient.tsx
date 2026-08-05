'use client'

import React, { useState, useMemo } from 'react'
import {
    Search, Filter, ChevronDown, ChevronRight, FileSpreadsheet, Download,
    CheckCircle2, Clock, AlertTriangle, Layers, Building2, TrendingUp,
    ExternalLink, DollarSign, Calendar, X, Eye, Sparkles, PieChart, BarChart3
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

    // Modal de detalle de actividad
    const [selectedActividadModal, setSelectedActividadModal] = useState<any | null>(null)

    // Filas expandidas en la matriz
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
            .slice(0, 6) // Top 6 ejes
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
        <div className="space-y-8">
            {/* Header del Tablero */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
                        <span>Tablero de Control de Políticas Públicas</span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                            En Tiempo Real
                        </span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 font-medium">
                        Monitoreo de cumplimiento del Plan de Desarrollo Municipal • {municipio.nombre}
                    </p>
                </div>

                <button
                    onClick={exportarCSV}
                    className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm border border-slate-800 transition-all duration-200 active:scale-[0.98] flex items-center shadow-lg shadow-black/40"
                >
                    <Download className="w-4 h-4 mr-2 text-[var(--pol-primary-light)]" />
                    Exportar reporte CSV
                </button>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Cumplimiento Global */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Avance Global</span>
                        <TrendingUp className="w-5 h-5 text-[var(--pol-primary-light)]" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">{cumplimientoGlobal}%</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {cumplidas100} / {totalActividades} metas
                        </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800/80 mt-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--pol-primary)] to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${cumplimientoGlobal}%` }}
                        />
                    </div>
                </div>

                {/* KPI 2: Actividades Cumplidas */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Metas Completadas</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-400">{cumplidas100}</span>
                        <span className="text-xs text-slate-400 font-bold">
                            {totalActividades ? Math.round((cumplidas100 / totalActividades) * 100) : 0}% del total
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">Actividades con 100% de ejecución</p>
                </div>

                {/* KPI 3: En Proceso */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">En Proceso</span>
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-3xl sm:text-4xl font-black text-amber-400">{enProceso}</span>
                        <span className="text-xs text-slate-400 font-bold">{sinAvance} sin avance</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">Compromisos con reporte activo</p>
                </div>

                {/* KPI 4: Presupuesto Exec */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl hover:border-slate-700 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Presupuesto Ejecutado</span>
                        <DollarSign className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl sm:text-3xl font-black text-slate-100">
                            ${totalPresupuestoEjecutado.toLocaleString('es-CO')}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Planeado: ${totalPresupuestoPlaneado.toLocaleString('es-CO')}
                    </p>
                </div>
            </div>

            {/* Gráfico SVG por Ejes Estratégicos */}
            {resumenPorEje.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[var(--pol-primary-light)]" />
                            Cumplimiento por Eje Estratégico
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">Top ejes por avance</span>
                    </div>
                    <div className="space-y-3 pt-2">
                        {resumenPorEje.map((eje) => (
                            <div key={eje.nombre} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-200">{eje.nombre} ({eje.total} metas)</span>
                                    <span className="font-bold text-emerald-400">{eje.pct}%</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--pol-primary)] to-emerald-400 rounded-full transition-all duration-700"
                                        style={{ width: `${eje.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Barra de Filtros */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por actividad, código o dependencia..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                        />
                    </div>

                    <select
                        value={selectedPolitica}
                        onChange={(e) => setSelectedPolitica(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] font-medium"
                    >
                        <option value="todas">Todas las Políticas Públicas ({politicas.length})</option>
                        {politicas.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>

                    <select
                        value={selectedDependencia}
                        onChange={(e) => setSelectedDependencia(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] font-medium"
                    >
                        <option value="todas">Todas las Dependencias ({dependencias.length})</option>
                        {dependencias.map((d) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                    </select>

                    <select
                        value={selectedEstado}
                        onChange={(e) => setSelectedEstado(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] font-medium"
                    >
                        <option value="todos">Todos los Estados</option>
                        <option value="100">Completadas (100%)</option>
                        <option value="proceso">En Proceso (1-99%)</option>
                        <option value="0">Sin Avance (0%)</option>
                    </select>
                </div>
            </div>

            {/* Matriz Colapsable de 4 Niveles */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-[var(--pol-primary-light)]" />
                        Matriz de Seguimiento por Estructura
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">
                        Mostrando {actividadesFiltradas.length} actividades
                    </span>
                </div>

                <div className="divide-y divide-slate-800/80">
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
                            <div key={pol.id} className="bg-slate-900/50">
                                {/* Nivel 1: Política */}
                                <div
                                    onClick={() => toggleExpand(setExpandedPoliticas, pol.id)}
                                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-colors select-none"
                                >
                                    <div className="flex items-center space-x-3">
                                        <button className="text-slate-400 hover:text-white transition-transform active:scale-95">
                                            {isPolOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </button>
                                        <span className="font-black text-slate-100 text-base sm:text-lg tracking-tight">{pol.nombre}</span>
                                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                            {polActividades.length} actividades
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden hidden sm:block">
                                            <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${polPct}%` }} />
                                        </div>
                                        <span className="font-black text-emerald-400 text-base min-w-[50px] text-right">{polPct}%</span>
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
                                                <div key={eje.id} className="rounded-xl bg-slate-950/70 border border-slate-800/90 overflow-hidden">
                                                    <div
                                                        onClick={() => toggleExpand(setExpandedEjes, eje.id)}
                                                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {isEjeOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                            <span className="font-bold text-slate-200 text-sm">{eje.nombre}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-emerald-400">{ejePct}%</span>
                                                    </div>

                                                    {/* Nivel 3: Líneas */}
                                                    {isEjeOpen && (
                                                        <div className="px-4 pb-3 pt-1 space-y-2">
                                                            {eje.lineas.map((linea: any) => {
                                                                const isLineaOpen = expandedLineas[linea.id] ?? true
                                                                const lineaActividades = ejeActividades.filter((a) => a.lineaId === linea.id)
                                                                if (lineaActividades.length === 0) return null

                                                                return (
                                                                    <div key={linea.id} className="pl-3 border-l-2 border-slate-700/60 space-y-2 mt-2">
                                                                        <div
                                                                            onClick={() => toggleExpand(setExpandedLineas, linea.id)}
                                                                            className="flex items-center justify-between text-xs font-bold text-slate-300 cursor-pointer py-1 select-none"
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
                                                                                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer active:scale-[0.99] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                                                                                    >
                                                                                        <div className="space-y-1.5 flex-1">
                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                {act.codigo && (
                                                                                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                                                                                        {act.codigo}
                                                                                                    </span>
                                                                                                )}
                                                                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                                                                                                    <Building2 className="w-3 h-3 text-[var(--pol-primary-light)]" />
                                                                                                    {act.dependencia?.nombre || 'General'}
                                                                                                </span>
                                                                                                {act.avancesList.length > 0 && (
                                                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                                                                                        <Eye className="w-3 h-3" />
                                                                                                        {act.avancesList.length} reportes
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <p className="text-sm font-semibold text-slate-100 leading-snug">
                                                                                                {act.nombre}
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="flex items-center space-x-4 self-end sm:self-center">
                                                                                            <div className="text-right">
                                                                                                <div className="text-xs font-bold text-slate-200">
                                                                                                    {act.resumen.avanceTexto} / {act.resumen.metaTexto}
                                                                                                </div>
                                                                                                <div className="text-[11px] font-black text-emerald-400">
                                                                                                    {act.resumen.cumplimientoPct}% ejecutado
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex items-center">
                                                                                                {act.resumen.cumplimientoPct >= 100 ? (
                                                                                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                                                        Cumplida
                                                                                                    </span>
                                                                                                ) : act.resumen.cumplimientoPct > 0 ? (
                                                                                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                                                                                        <Clock className="w-3.5 h-3.5" />
                                                                                                        En Proceso
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                                                                                                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                                                                                                        Pendiente
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
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

            {/* Modal de Detalle de Actividad y Evidencias */}
            {selectedActividadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-xs font-bold text-[var(--pol-primary-light)] uppercase tracking-wider">
                                    Detalle del Compromiso
                                </span>
                                <h3 className="text-lg font-bold text-slate-100 mt-1">
                                    {selectedActividadModal.nombre}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedActividadModal(null)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-slate-400">Dependencia</span>
                                <p className="font-bold text-slate-200">{selectedActividadModal.dependencia?.nombre || 'General'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-slate-400">Avance / Meta</span>
                                <p className="font-bold text-emerald-400">
                                    {selectedActividadModal.resumen.avanceTexto} / {selectedActividadModal.resumen.metaTexto} ({selectedActividadModal.resumen.cumplimientoPct}%)
                                </p>
                            </div>
                        </div>

                        {/* Lista de Avances Reportados */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Historial de Avances y Evidencias ({selectedActividadModal.avancesList.length})
                            </h4>

                            {selectedActividadModal.avancesList.length === 0 ? (
                                <p className="text-xs text-slate-500 py-4 text-center">No hay reportes de avance registrados aún para esta actividad.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedActividadModal.avancesList.map((av: any) => (
                                        <div key={av.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                                            <div className="flex items-center justify-between text-slate-400">
                                                <span className="font-semibold text-slate-300">Período: {av.periodoTexto || 'N/A'}</span>
                                                <span>{new Date(av.createdAt).toLocaleDateString('es-CO')}</span>
                                            </div>
                                            {av.observaciones && (
                                                <p className="text-slate-300">{av.observaciones}</p>
                                            )}

                                            {/* Evidencias */}
                                            {av.evidencias && av.evidencias.length > 0 && (
                                                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                                                    <span className="text-slate-400 font-semibold">Evidencia:</span>
                                                    {av.evidencias.map((ev: any) => (
                                                        <a
                                                            key={ev.id}
                                                            href={ev.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center text-xs text-[var(--pol-primary-light)] hover:underline font-bold"
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
