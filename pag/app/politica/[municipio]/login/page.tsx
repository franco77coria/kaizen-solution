'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMunicipio, monograma } from '@/lib/politica/municipios'
import { ShieldCheck, ArrowRight, Loader2, Landmark, Sparkles, Building2, TrendingUp, CheckCircle2, Layers, Lock } from 'lucide-react'

export default function PoliticaLoginPage({
    params,
}: {
    params: { municipio: string }
}) {
    const router = useRouter()
    const municipio = getMunicipio(params.municipio)

    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!municipio) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-white">
                <p>Municipio no encontrado</p>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/politica/${municipio.slug}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: input.trim() }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Ocurrió un error al ingresar')
                setLoading(false)
                return
            }

            if (data.redirect) {
                router.push(data.redirect)
                router.refresh()
            }
        } catch (err: any) {
            setError('Error de conexión con el servidor')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans antialiased">
            {/* Tech Mesh & Dot Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-40 pointer-events-none" />

            {/* Glowing Radial Light Beam */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-orange-600/20 via-amber-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-950/30 rounded-full blur-[120px] pointer-events-none" />

            {/* Top Corporate Bar */}
            <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center font-black text-white shadow-lg shadow-orange-600/30 border border-orange-400/40">
                        <span className="text-sm tracking-wider">{monograma(municipio)}</span>
                    </div>
                    <div>
                        <span className="font-extrabold text-slate-100 text-sm block">Alcaldía Municipal de {municipio.nombre}</span>
                        <span className="text-xs text-slate-400 font-medium">{municipio.plan}</span>
                    </div>
                </div>

                <div className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">Plataforma Institucional Activa</span>
                </div>
            </header>

            {/* Main Hero & Access Section */}
            <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
                {/* Left Column: Institutional Value Props & Live Metric Cards */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" />
                            {municipio.lema}
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
                            Tablero de Monitoreo & <br />
                            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                                Políticas Públicas Municipales
                            </span>
                        </h1>

                        <p className="text-slate-400 text-base max-w-xl leading-relaxed font-medium">
                            Plataforma oficial para el seguimiento en tiempo real de los compromisos, líneas estratégicas e indicadores del Plan de Desarrollo Municipal de {municipio.nombre}.
                        </p>
                    </div>

                    {/* Feature Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-2">
                            <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-200">7 Políticas Públicas</h4>
                            <p className="text-xs text-slate-400">Seguimiento centralizado de todos los ejes de desarrollo</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-2">
                            <div className="p-2 w-fit rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                <Layers className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-200">306 Actividades</h4>
                            <p className="text-xs text-slate-400">Medición de metas físicas, financieras y de gestión</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-2">
                            <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-200">Evidencias Auditables</h4>
                            <p className="text-xs text-slate-400">Soporte documental digital por cada reporte de avance</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Premium High-Tech Login Card */}
                <div className="lg:col-span-5 w-full">
                    <div className="relative group">
                        {/* Glowing Aura Effect behind card */}
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 opacity-25 blur-xl group-hover:opacity-40 transition duration-500" />

                        <div className="relative bg-slate-900/85 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-100 tracking-tight">Acceso Institucional</h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Ingresá tu nombre o número de teléfono registrado</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs font-semibold flex items-start space-x-2.5">
                                    <span className="text-red-400 text-base">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label htmlFor="usuario-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                        Identificación o Teléfono
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="usuario-input"
                                            name="input"
                                            type="text"
                                            required
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ingresá tu teléfono (ej: 310...) o tu nombre"
                                            className="w-full px-4 py-4 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="w-full flex justify-center items-center py-4 px-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-xl shadow-orange-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 tracking-wide"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Ingresando...
                                        </>
                                    ) : (
                                        <>
                                            Ingresar al Tablero
                                            <ArrowRight className="w-5 h-5 ml-2.5" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
                                <span className="flex items-center text-slate-300 font-semibold">
                                    <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                                    Acceso seguro institucional
                                </span>
                                <span className="text-slate-400 font-bold">Kaizen Solution</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
                <p>© 2026 Alcaldía Municipal de {municipio.nombre} • Todos los derechos reservados</p>
                <p className="font-semibold text-slate-300">Desarrollado por Kaizen Solution S.A.S.</p>
            </footer>
        </div>
    )
}
