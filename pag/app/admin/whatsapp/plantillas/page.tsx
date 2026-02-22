"use client"

import { useState, useEffect } from "react"
import { RefreshCw, MessageSquare, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function PlantillasPage() {
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/whatsapp/templates/sync")
            const data = await res.json()
            setTemplates(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [])

    const handleSync = async () => {
        setSyncing(true)
        setMessage(null)
        try {
            const res = await fetch("/api/whatsapp/templates/sync", { method: "POST" })
            const data = await res.json()

            if (res.ok) {
                setMessage({ text: data.message || "Plantillas sincronizadas.", type: "success" })
                fetchTemplates()
            } else {
                setMessage({ text: data.error || "Error al sincronizar.", type: "error" })
            }
        } catch (error: any) {
            setMessage({ text: error.message, type: "error" })
        } finally {
            setSyncing(false)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED": return <CheckCircle className="text-green-500 w-5 h-5" />
            case "REJECTED": return <AlertTriangle className="text-red-500 w-5 h-5" />
            default: return <Clock className="text-yellow-500 w-5 h-5" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED":
                return <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">Aprobada</span>
            case "REJECTED":
                return <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-medium">Rechazada</span>
            default:
                return <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-xs font-medium">Pendiente</span>
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-gradient-to-r from-[#1A1D24] to-[#111318] p-6 rounded-2xl border border-[#2A2D35]">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <MessageSquare className="text-blue-400" />
                        Plantillas (Templates)
                    </h1>
                    <p className="text-gray-400 mt-1">Sincroniza y visualiza los mensajes aprobados por Meta para iniciar conversaciones.</p>
                </div>

                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg transition-all font-medium shadow-lg shadow-blue-500/20"
                >
                    <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                    <span>{syncing ? "Sincronizando..." : "Sincronizar con Meta"}</span>
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border ${message.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {message.text}
                </div>
            )}

            {loading && templates.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-20 bg-[#1A1D24] border border-[#2A2D35] rounded-xl">
                    <MessageSquare className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No hay plantillas sincronizadas</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-6">Presiona el botón "Sincronizar con Meta" para traer tus templates desde el WhatsApp Business Manager.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => {
                        let parsedVars: string[] = []
                        try { parsedVars = JSON.parse(template.variables) } catch (e) { }

                        return (
                            <div key={template.id} className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors flex flex-col">
                                <div className="p-5 border-b border-[#2A2D35] flex justify-between items-start bg-[#111318]/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                            {template.name}
                                        </h3>
                                        <div className="flex gap-2">
                                            <span className="text-xs text-gray-500 bg-[#2A2D35] px-2 py-0.5 rounded">{template.language}</span>
                                            <span className="text-xs text-gray-500 bg-[#2A2D35] px-2 py-0.5 rounded">{template.category}</span>
                                        </div>
                                    </div>
                                    {getStatusBadge(template.status)}
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Whatsapp Bubble Mockup */}
                                    <div className="bg-[#0b141a] rounded-xl p-3 shadow-inner relative max-w-[90%] mb-4 border border-[#2A2D35]">
                                        <div className="absolute top-0 -left-2 w-0 h-0 border-t-8 border-t-[#0b141a] border-l-8 border-l-transparent border-b-8 border-b-transparent"></div>
                                        <p className="text-[#e9edef] text-sm whitespace-pre-wrap font-sans">
                                            {template.bodyText}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-[#2A2D35]">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Variables Requeridas</h4>
                                        {parsedVars.length === 0 ? (
                                            <span className="text-sm text-gray-500 italic">No requiere variables</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {parsedVars.map((v) => (
                                                    <span key={v} className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded font-mono border border-blue-500/20">
                                                        {`{{${v}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
