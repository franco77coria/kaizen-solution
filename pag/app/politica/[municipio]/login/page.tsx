'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMunicipio, monograma } from '@/lib/politica/municipios'
import { ShieldCheck, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react'

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
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
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
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
            {/* Ambient Lighting Gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-orange-600/20 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-slate-800/30 rounded-full blur-2xl pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                {/* Municipal Badge Logo */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--pol-primary)] to-slate-900 border border-[var(--pol-primary)]/40 flex items-center justify-center shadow-xl shadow-[var(--pol-primary)]/20">
                        {municipio.escudo ? (
                            <img src={municipio.escudo} alt={municipio.nombre} className="w-10 h-10 object-contain" onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }} />
                        ) : null}
                        <span className="text-xl font-black tracking-wider text-white">{monograma(municipio)}</span>
                    </div>
                </div>

                <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                    Alcaldía Municipal de {municipio.nombre}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-400 font-medium">
                    {municipio.lema} • <span className="text-[var(--pol-primary-light)] font-semibold">{municipio.plan}</span>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
                    <div className="mb-6 pb-4 border-b border-slate-800 flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-200">Seguimiento a Políticas Públicas</h3>
                            <p className="text-xs text-slate-400">Ingresá tu nombre o número de teléfono registrado</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm font-medium animate-fadeIn flex items-start space-x-2">
                            <span className="text-red-400 font-bold">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="usuario-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                                Nombre o Teléfono
                            </label>
                            <div className="relative">
                                <input
                                    id="usuario-input"
                                    name="input"
                                    type="text"
                                    required
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ej: Sofia Moreno o 310..."
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] focus:border-transparent text-sm transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--pol-primary)] to-[var(--pol-primary-dark)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pol-primary)] shadow-lg shadow-[var(--pol-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    Ingresar al Tablero
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Acceso seguro institucional
                        </span>
                        <span className="text-slate-400">Kaizen Solution</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
