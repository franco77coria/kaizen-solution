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
                return <span className="px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-medium">Aprobada</span>
            case "REJECTED":
                return <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-medium">Rechazada</span>
            default:
                return <span className="px-2.5 py-1 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-full text-xs font-medium">Pendiente</span>
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <MessageSquare className="text-blue-600" />
                        Plantillas (Templates)
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Sincroniza y visualiza los mensajes aprobados por Meta para iniciar conversaciones.</p>
                </div>

                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg transition-all font-medium shadow-sm"
                >
                    <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                    <span>{syncing ? "Sincronizando..." : "Sincronizar con Meta"}</span>
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            {loading && templates.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No hay plantillas sincronizadas</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">Presiona el botón "Sincronizar con Meta" para traer tus templates desde el WhatsApp Business Manager.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => {
                        let parsedVars: string[] = []
                        try { parsedVars = JSON.parse(template.variables) } catch (e) { }

                        return (
                            <div key={template.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors flex flex-col shadow-sm">
                                <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            {template.name}
                                        </h3>
                                        <div className="flex gap-2">
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{template.language}</span>
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{template.category}</span>
                                        </div>
                                    </div>
                                    {getStatusBadge(template.status)}
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Whatsapp Bubble Mockup */}
                                    <div className="bg-[#dcf8c6] rounded-xl p-3 shadow-sm relative max-w-[90%] mb-4 border border-green-200">
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap font-sans">
                                            {template.bodyText}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Variables Requeridas</h4>
                                        {parsedVars.length === 0 ? (
                                            <span className="text-sm text-gray-400 italic">No requiere variables</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {parsedVars.map((v) => (
                                                    <span key={v} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-mono border border-blue-200">
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
