'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMunicipio, monograma } from '@/lib/politica/municipios'
import { ShieldCheck, ArrowRight, Loader2, Landmark, Sparkles, Building2, User, Phone } from 'lucide-react'

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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none font-sans antialiased">
            {/* Tech Grid Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

            {/* Glowing Mesh Orbs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-600/25 via-amber-500/15 to-transparent rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-indigo-900/20 via-slate-900/40 to-transparent rounded-full blur-[100px] pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-4">
                {/* Municipal Badge Emblem */}
                <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-transparent border border-orange-500/40 shadow-2xl shadow-orange-500/20 backdrop-blur-xl">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 via-amber-600 to-slate-900 flex items-center justify-center border border-orange-400/40 shadow-inner">
                        <div className="flex flex-col items-center justify-center text-white">
                            <Landmark className="w-6 h-6 text-amber-200 mb-0.5" />
                            <span className="text-xs font-black tracking-widest leading-none">{monograma(municipio)}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                        Alcaldía Municipal de {municipio.nombre}
                    </h2>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs font-semibold text-slate-300">
                            {municipio.lema} • <span className="text-orange-400 font-bold">{municipio.plan}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
                {/* Futuristic Glassmorphic Card */}
                <div className="bg-slate-900/70 backdrop-blur-2xl py-8 px-6 sm:px-10 shadow-[0_0_80px_-15px_rgba(212,82,12,0.25)] rounded-3xl border border-slate-800/90">
                    <div className="mb-6 pb-5 border-b border-slate-800/80 flex items-center space-x-3.5">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-100 tracking-tight">Tablero de Políticas Públicas</h3>
                            <p className="text-xs text-slate-400 font-medium">Ingresá tu nombre o número de teléfono registrado</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-sm font-semibold animate-fadeIn flex items-start space-x-2.5">
                            <span className="text-red-400 text-base">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="usuario-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Identificación de Usuario
                            </label>
                            <div className="relative">
                                <input
                                    id="usuario-input"
                                    name="input"
                                    type="text"
                                    required
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ingresá tu nombre o teléfono (ej: 310...)"
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all font-medium shadow-inner"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-xl shadow-orange-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Validando credenciales...
                                </>
                            ) : (
                                <>
                                    Ingresar al Tablero
                                    <ArrowRight className="w-4 h-4 ml-2.5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span className="flex items-center text-slate-300">
                            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                            Acceso seguro municipal
                        </span>
                        <span className="text-slate-400 font-semibold">Kaizen Solution</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
