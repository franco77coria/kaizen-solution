'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import ModernSelect, { OptionItem } from './ModernSelect'

interface ReportarClientProps {
    municipio: any
    actividades: any[]
    usuario: any
}

export default function ReportarClient({
    municipio,
    actividades,
    usuario,
}: ReportarClientProps) {
    const router = useRouter()

    const [actividadId, setActividadId] = useState('')
    const [periodoTexto, setPeriodoTexto] = useState('2026')
    const [valorNumero, setValorNumero] = useState('')
    const [valorBooleano, setValorBooleano] = useState(true)
    const [observaciones, setObservaciones] = useState('')
    const [presupuestoEjecutado, setPresupuestoEjecutado] = useState('')
    const [evidenciaUrl, setEvidenciaUrl] = useState('')

    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const actividadOptions: OptionItem[] = useMemo(() => {
        return actividades.map((a) => ({
            value: a.id,
            label: a.nombre,
            sublabel: a.codigo ? `Código: ${a.codigo}` : undefined,
            badge: a.dependencia?.nombre || 'General',
        }))
    }, [actividades])

    const actSeleccionada = actividades.find((a) => a.id === actividadId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!actividadId) {
            setErrorMsg('Seleccioná una actividad')
            return
        }

        setSubmitting(true)
        setErrorMsg(null)
        setSuccessMsg(null)

        try {
            const res = await fetch(`/api/politica/${municipio.slug}/reportar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actividadId,
                    periodoTexto,
                    valorNumero: valorNumero ? parseFloat(valorNumero) : null,
                    valorBooleano: actSeleccionada?.tipoMeta === 'BOOLEANO' ? valorBooleano : null,
                    observaciones,
                    presupuestoEjecutado: presupuestoEjecutado ? parseFloat(presupuestoEjecutado) : null,
                    evidenciaUrl,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setErrorMsg(data.error || 'Error al guardar el avance')
                setSubmitting(false)
                return
            }

            setSuccessMsg('¡Avance reportado correctamente!')
            setActividadId('')
            setObservaciones('')
            setValorNumero('')
            setPresupuestoEjecutado('')
            setEvidenciaUrl('')
            setSubmitting(false)

            setTimeout(() => {
                router.push(`/politica/${municipio.slug}`)
                router.refresh()
            }, 1500)
        } catch {
            setErrorMsg('Error de conexión al enviar reporte')
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 w-full">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Reportar Avance</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                    Registrá los logros, ejecuciones presupuestales y evidencias de tu dependencia
                </p>
            </div>

            {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-[28px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs space-y-5">
                <div className="space-y-1.5 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                        Actividad / Compromiso *
                    </label>
                    <ModernSelect
                        value={actividadId}
                        onChange={setActividadId}
                        options={actividadOptions}
                        placeholder="Buscar y seleccionar actividad o compromiso..."
                        searchable
                    />
                </div>

                {actSeleccionada && (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-xs space-y-1.5 shadow-xs">
                        <div className="text-slate-500 font-medium">
                            Meta configurada: <strong className="text-slate-900">{actSeleccionada.tipoMeta}</strong>
                            {actSeleccionada.metaNumero != null && ` (${actSeleccionada.metaNumero})`}
                        </div>
                        <div className="text-slate-500 font-medium">
                            Dependencia: <strong className="text-slate-900">{actSeleccionada.dependencia?.nombre || 'General'}</strong>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                        Período / Año *
                    </label>
                    <input
                        type="text"
                        required
                        value={periodoTexto}
                        onChange={(e) => setPeriodoTexto(e.target.value)}
                        placeholder="Ej: 2026 o I Trimestre 2026"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />
                </div>

                {actSeleccionada?.tipoMeta === 'BOOLEANO' ? (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Estado del Cumplimiento
                        </label>
                        <div className="flex gap-4 flex-wrap">
                            <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <input
                                    type="radio"
                                    name="booleano"
                                    checked={valorBooleano}
                                    onChange={() => setValorBooleano(true)}
                                />
                                <span className="text-xs font-bold text-emerald-700">Realizado / Cumplido</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                                <input
                                    type="radio"
                                    name="booleano"
                                    checked={!valorBooleano}
                                    onChange={() => setValorBooleano(false)}
                                />
                                <span className="text-xs font-bold text-slate-600">En Proceso / Pendiente</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5 w-full">
                        <label className="block text-xs font-bold text-slate-700">
                            Valor Reportado (Cantidad / Avance)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={valorNumero}
                            onChange={(e) => setValorNumero(e.target.value)}
                            placeholder="Ej: 15"
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                        />
                    </div>
                )}

                <div className="space-y-1.5 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                        Presupuesto Ejecutado ($ COP)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presupuestoEjecutado}
                        onChange={(e) => setPresupuestoEjecutado(e.target.value)}
                        placeholder="Ej: 5000000"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />
                </div>

                <div className="space-y-1.5 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                        Observaciones / Descripción
                    </label>
                    <textarea
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detallá las acciones realizadas..."
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />
                </div>

                <div className="space-y-1.5 w-full">
                    <label className="block text-xs font-bold text-slate-700">
                        Enlace a Evidencia (Google Drive / OneDrive / Archivo)
                    </label>
                    <input
                        type="url"
                        value={evidenciaUrl}
                        onChange={(e) => setEvidenciaUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !actividadId}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-[var(--pol-primary)] hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                    {submitting ? 'Guardando reporte...' : 'Enviar Reporte de Avance'}
                </button>
            </form>
        </div>
    )
}
