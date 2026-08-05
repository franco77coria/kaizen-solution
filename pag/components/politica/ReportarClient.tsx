'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Upload, CheckCircle2, AlertCircle, FileText, DollarSign, Calendar } from 'lucide-react'

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
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="border-b border-slate-800 pb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                    <Send className="w-7 h-7 text-[var(--pol-primary-light)]" />
                    Reportar Avance de Actividad
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Registrá los logros, ejecuciones presupuestales y evidencias de tu dependencia
                </p>
            </div>

            {successMsg && (
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
                {/* Seleccionar Actividad */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Actividad / Compromiso *
                    </label>
                    <select
                        required
                        value={actividadId}
                        onChange={(e) => setActividadId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    >
                        <option value="">-- Seleccioná la actividad a reportar --</option>
                        {actividades.map((a) => (
                            <option key={a.id} value={a.id}>
                                [{a.dependencia?.nombre || 'General'}] {a.nombre.slice(0, 90)}...
                            </option>
                        ))}
                    </select>
                </div>

                {actSeleccionada && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="text-slate-400">
                            Meta configurada: <span className="font-semibold text-white">{actSeleccionada.tipoMeta}</span>
                            {actSeleccionada.metaNumero != null && ` (${actSeleccionada.metaNumero})`}
                        </div>
                        <div className="text-slate-400">
                            Dependencia: <span className="font-semibold text-slate-200">{actSeleccionada.dependencia?.nombre || 'General'}</span>
                        </div>
                    </div>
                )}

                {/* Período */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Período / Año *
                    </label>
                    <input
                        type="text"
                        required
                        value={periodoTexto}
                        onChange={(e) => setPeriodoTexto(e.target.value)}
                        placeholder="Ej: 2026 o I Trimestre 2026"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                {/* Valor de Avance */}
                {actSeleccionada?.tipoMeta === 'BOOLEANO' ? (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Estado del Cumplimiento
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="booleano"
                                    checked={valorBooleano}
                                    onChange={() => setValorBooleano(true)}
                                    className="text-[var(--pol-primary)]"
                                />
                                <span className="text-sm font-semibold text-emerald-400">Realizado / Cumplido</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="booleano"
                                    checked={!valorBooleano}
                                    onChange={() => setValorBooleano(false)}
                                    className="text-[var(--pol-primary)]"
                                />
                                <span className="text-sm font-semibold text-slate-400">En Proceso / Pendiente</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Valor Reportado (Cantidad / Avance)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={valorNumero}
                            onChange={(e) => setValorNumero(e.target.value)}
                            placeholder="Ej: 15"
                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                        />
                    </div>
                )}

                {/* Presupuesto Ejecutado */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Presupuesto Ejecutado en este Reporte ($ COP)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presupuestoEjecutado}
                        onChange={(e) => setPresupuestoEjecutado(e.target.value)}
                        placeholder="Ej: 5000000"
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Observaciones / Descripción del Avance
                    </label>
                    <textarea
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detallá las acciones realizadas..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                {/* Evidencia Link */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Enlace a Evidencia (Google Drive / OneDrive / Archivo)
                    </label>
                    <input
                        type="url"
                        value={evidenciaUrl}
                        onChange={(e) => setEvidenciaUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !actividadId}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-[var(--pol-primary)] to-[var(--pol-primary-dark)] hover:brightness-110 shadow-lg shadow-[var(--pol-primary)]/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {submitting ? 'Guardando reporte...' : 'Enviar Reporte de Avance'}
                </button>
            </form>
        </div>
    )
}
