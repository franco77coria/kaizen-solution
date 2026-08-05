'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'

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
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reportar Avance</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Registrá los logros, ejecuciones presupuestales y evidencias de tu dependencia
                </p>
            </div>

            {successMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-5">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                        Actividad / Compromiso *
                    </label>
                    <select
                        required
                        value={actividadId}
                        onChange={(e) => setActividadId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
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
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="text-slate-500">
                            Meta configurada: <span className="font-semibold text-slate-900">{actSeleccionada.tipoMeta}</span>
                            {actSeleccionada.metaNumero != null && ` (${actSeleccionada.metaNumero})`}
                        </div>
                        <div className="text-slate-500">
                            Dependencia: <span className="font-semibold text-slate-800">{actSeleccionada.dependencia?.nombre || 'General'}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                        Período / Año *
                    </label>
                    <input
                        type="text"
                        required
                        value={periodoTexto}
                        onChange={(e) => setPeriodoTexto(e.target.value)}
                        placeholder="Ej: 2026 o I Trimestre 2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                {actSeleccionada?.tipoMeta === 'BOOLEANO' ? (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Estado del Cumplimiento
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="booleano"
                                    checked={valorBooleano}
                                    onChange={() => setValorBooleano(true)}
                                />
                                <span className="text-xs font-bold text-emerald-700">Realizado / Cumplido</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
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
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                            Valor Reportado (Cantidad / Avance)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={valorNumero}
                            onChange={(e) => setValorNumero(e.target.value)}
                            placeholder="Ej: 15"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                        />
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                        Presupuesto Ejecutado ($ COP)
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={presupuestoEjecutado}
                        onChange={(e) => setPresupuestoEjecutado(e.target.value)}
                        placeholder="Ej: 5000000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                        Observaciones / Descripción
                    </label>
                    <textarea
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detallá las acciones realizadas..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                        Enlace a Evidencia (Google Drive / OneDrive / Archivo)
                    </label>
                    <input
                        type="url"
                        value={evidenciaUrl}
                        onChange={(e) => setEvidenciaUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || !actividadId}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[var(--pol-primary)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submitting ? 'Guardando reporte...' : 'Enviar Reporte de Avance'}
                </button>
            </form>
        </div>
    )
}
