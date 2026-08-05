'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
    TrendingUp, CheckCircle2, Clock, DollarSign, ArrowRight,
    Building2, Layers, Download, CheckSquare2, FileText,
    ChevronRight, Sparkles, ExternalLink
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

    // KPIs globales
    const totalActividades = actividadesConResumen.length
    const cumplidas100 = actividadesConResumen.filter((a) => a.resumen.cumplimientoPct >= 100).length
    const enProceso = actividadesConResumen.filter((a) => a.resumen.cumplimientoPct > 0 && a.resumen.cumplimientoPct < 100).length
    const sinAvance = actividadesConResumen.filter((a) => a.resumen.cumplimientoPct === 0).length

    const cumplimientoGlobal = useMemo(() => {
        if (!totalActividades) return 0
        const pcts = actividadesConResumen.map((a) => a.resumen.cumplimientoPct)
        return promedioSimple(pcts)
    }, [actividadesConResumen, totalActividades])

    const totalPresupuestoPlaneado = useMemo(() => {
        return actividadesConResumen.reduce((acc, a) => acc + a.resumen.presupuestoPlaneado, 0)
    }, [actividadesConResumen])

    const totalPresupuestoEjecutado = useMemo(() => {
        return actividadesConResumen.reduce((acc, a) => acc + a.resumen.presupuestoEjecutado, 0)
    }, [actividadesConResumen])

    // Cumplimiento por Política Pública
    const resumenPoliticas = useMemo(() => {
        return politicas.map((pol) => {
            const polActs = actividadesConResumen.filter((a) =>
                a.politicas.some((ap: any) => ap.politicaId === pol.id)
            )
            const pcts = polActs.map((a) => a.resumen.cumplimientoPct)
            const pct = promedioSimple(pcts)
            const completadas = polActs.filter((a) => a.resumen.cumplimientoPct >= 100).length
            return {
                id: pol.id,
                nombre: pol.nombre,
                total: polActs.length,
                completadas,
                pct,
            }
        })
    }, [politicas, actividadesConResumen])

    // Datos para gráfico por Eje
    const resumenPorEje = useMemo(() => {
        const map = new Map<string, { nombre: string; pcts: number[] }>()
        for (const act of actividadesConResumen) {
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
    }, [actividadesConResumen])

    // Cumplimiento por Dependencia (Top 6)
    const resumenDependencias = useMemo(() => {
        const map = new Map<string, { id: string; nombre: string; pcts: number[] }>()
        for (const act of actividadesConResumen) {
            const depId = act.dependenciaId || 'sin-dep'
            const depNombre = act.dependencia?.nombre || 'General'
            const existing = map.get(depId) || { id: depId, nombre: depNombre, pcts: [] as number[] }
            existing.pcts.push(act.resumen.cumplimientoPct)
            map.set(depId, existing)
        }

        return Array.from(map.values())
            .map((item) => ({
                id: item.id,
                nombre: item.nombre,
                pct: promedioSimple(item.pcts),
                total: item.pcts.length,
            }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 6)
    }, [actividadesConResumen])

    // Últimos avances reportados (recientes)
    const ultimosAvances = useMemo(() => {
        return [...avances]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
    }, [avances])

    // Exportar CSV
    const exportarCSV = () => {
        const headers = ['Política', 'Eje', 'Línea', 'Actividad', 'Dependencia', 'Tipo Meta', 'Meta', 'Avance Real', '% Cumplimiento', 'Presupuesto Planeado', 'Presupuesto Ejecutado']
        const rows = actividadesConResumen.map((act) => [
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
        link.setAttribute('download', `resumen_tablero_${municipio.slug}_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-7 w-full">
            {/* Header Limpio Minimalista (Estilo Factory Pets) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Cómo viene la ejecución del Plan de Desarrollo • {municipio.nombre} (2024-2027)
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        href={`/politica/${municipio.slug}/metas`}
                        className="px-4 py-2 rounded-2xl bg-[var(--pol-primary)] hover:opacity-90 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2"
                    >
                        <CheckSquare2 className="w-3.5 h-3.5" />
                        <span>Ver Plan de Metas</span>
                    </Link>

                    <button
                        onClick={exportarCSV}
                        className="px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-xs flex items-center gap-2"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* 4 Tarjetas KPI Claras (Bordes redondeados 24px en fondo blanco como en Factory Pets) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full">
                {/* KPI 1: Avance Global */}
                <div className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Avance global</span>
                        <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{cumplimientoGlobal}%</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {cumplidas100} de {totalActividades} metas completadas
                        </p>
                    </div>
                </div>

                {/* KPI 2: Metas Completadas */}
                <div className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Metas completadas</span>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{cumplidas100}</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {totalActividades ? Math.round((cumplidas100 / totalActividades) * 100) : 0}% del total de compromisos
                        </p>
                    </div>
                </div>

                {/* KPI 3: En Proceso */}
                <div className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">En proceso</span>
                        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{enProceso}</div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                            {sinAvance} compromisos aún sin avance
                        </p>
                    </div>
                </div>

                {/* KPI 4: Presupuesto Ejecutado */}
                <div className="p-5 sm:p-6 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Presupuesto ejecutado</span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                            ${totalPresupuestoEjecutado.toLocaleString('es-CO')}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                            Planeado: ${totalPresupuestoPlaneado.toLocaleString('es-CO')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Fila 1 de Widgets: Políticas Públicas (Izquierda) + Ejes Estratégicos (Derecha) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                {/* Widget 1: Políticas Públicas */}
                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Políticas Públicas</h3>
                            <p className="text-xs text-slate-400 font-medium">Cumplimiento por instrumento de planeación</p>
                        </div>
                        <Link
                            href={`/politica/${municipio.slug}/metas`}
                            className="text-xs font-bold text-[var(--pol-primary-ink)] hover:underline flex items-center gap-1"
                        >
                            Ver todas
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-3.5">
                        {resumenPoliticas.map((pol) => (
                            <Link
                                key={pol.id}
                                href={`/politica/${municipio.slug}/metas`}
                                className="p-4 rounded-2xl bg-white border border-slate-200/70 hover:border-slate-300 transition-all block space-y-2 shadow-xs group"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-[var(--pol-primary-ink)] transition-colors line-clamp-1">
                                        {pol.nombre}
                                    </span>
                                    <span className="text-xs font-extrabold text-emerald-600 min-w-[45px] text-right">
                                        {pol.pct}%
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                    <span>{pol.total} metas • {pol.completadas} cumplidas</span>
                                    <span className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden inline-block ml-2">
                                        <span
                                            className="bg-emerald-500 h-full rounded-full block transition-all duration-500"
                                            style={{ width: `${pol.pct}%` }}
                                        />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Widget 2: Cumplimiento por Eje Estratégico */}
                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Ejes Estratégicos</h3>
                            <p className="text-xs text-slate-400 font-medium">Top 5 ejes con mayor porcentaje de avance</p>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Avance promedio</span>
                    </div>

                    <div className="space-y-4 pt-1">
                        {resumenPorEje.map((eje) => (
                            <div key={eje.nombre} className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs space-y-2">
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="font-bold text-slate-800 line-clamp-1">{eje.nombre}</span>
                                    <span className="font-extrabold text-emerald-600 min-w-[45px] text-right">{eje.pct}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--pol-primary)] rounded-full transition-all duration-500"
                                        style={{ width: `${eje.pct}%` }}
                                    />
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium block">
                                    {eje.total} metas articuladas
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Fila 2 de Widgets: Dependencias Municipales (Izquierda) + Últimos Avances (Derecha) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                {/* Widget 3: Cumplimiento por Dependencia */}
                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Dependencias Responsables</h3>
                            <p className="text-xs text-slate-400 font-medium">Desempeño de secretarías y dependencias</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {resumenDependencias.map((dep) => (
                            <div
                                key={dep.id}
                                className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center space-x-2.5 truncate">
                                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="truncate">
                                        <span className="font-bold text-slate-800 text-xs truncate block">{dep.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{dep.total} metas asignadas</span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <span className="text-xs font-extrabold text-emerald-600">{dep.pct}%</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {dep.pct >= 80 ? 'Alto' : dep.pct >= 40 ? 'Medio' : 'Inicial'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Widget 4: Últimos Reportes Registrados */}
                <div className="p-6 sm:p-7 rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Reportes Recientes</h3>
                            <p className="text-xs text-slate-400 font-medium">Últimos avances cargados al sistema</p>
                        </div>
                        <Link
                            href={`/politica/${municipio.slug}/reportar`}
                            className="text-xs font-bold text-[var(--pol-primary-ink)] hover:underline flex items-center gap-1"
                        >
                            Nuevo reporte
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {ultimosAvances.length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">No hay reportes recientes registrados.</p>
                        ) : (
                            ultimosAvances.map((av) => (
                                <div
                                    key={av.id}
                                    className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs space-y-1.5 text-xs"
                                >
                                    <div className="flex items-center justify-between text-slate-500">
                                        <span className="font-bold text-slate-800">
                                            {av.periodoTexto || 'Período N/A'}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(av.createdAt).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 line-clamp-1 font-medium">
                                        {av.observaciones || 'Reporte de avance registrado'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
