'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Campaign {
    id: string
    name: string
    type: string
    status: string
    stats: string
    createdAt: string
    list: { name: string }
    template: { name: string } | null
    _count: { jobs: number }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
    running: { label: 'En curso', color: 'bg-blue-100 text-blue-700' },
    paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Fallida', color: 'bg-red-100 text-red-700' },
    scheduled: { label: 'Programada', color: 'bg-purple-100 text-purple-700' },
}

export default function CampanasPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadCampaigns()
    }, [])

    const loadCampaigns = async () => {
        try {
            const res = await fetch('/api/whatsapp/campaigns')
            const data = await res.json()
            setCampaigns(Array.isArray(data) ? data : [])
        } catch { } finally {
            setLoading(false)
        }
    }

    const handleAction = async (id: string, action: 'start' | 'pause' | 'cancel') => {
        await fetch(`/api/whatsapp/campaigns/${id}/${action}`, { method: 'POST' })
        loadCampaigns()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
                    <p className="text-sm text-gray-400 mt-1">Envíos masivos programados</p>
                </div>
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <p className="text-lg font-medium">No hay campañas todavía</p>
                    <p className="text-sm mt-1">Las campañas se crean desde la sección de Listas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map((c) => {
                        const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats
                        const total = c._count.jobs || stats.total || 0
                        const sent = stats.sent || 0
                        const delivered = stats.delivered || 0
                        const read = stats.read || 0
                        const failed = stats.failed || 0
                        const progress = total > 0 ? Math.round((sent + failed) / total * 100) : 0
                        const statusInfo = STATUS_LABEL[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-600' }

                        return (
                            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                {c.type === 'audio' ? 'Audio' : 'Template'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Lista: <span className="text-gray-600">{c.list?.name}</span>
                                            {c.template && <> · Plantilla: <span className="text-gray-600">{c.template.name}</span></>}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                                            <span className="text-xs text-gray-500">{total} contactos</span>
                                            <span className="text-xs text-blue-600">{sent} enviados</span>
                                            <span className="text-xs text-green-600">{delivered} entregados</span>
                                            <span className="text-xs text-purple-600">{read} leídos</span>
                                            {failed > 0 && <span className="text-xs text-red-500">{failed} fallidos</span>}
                                        </div>

                                        {/* Progress bar */}
                                        {total > 0 && (
                                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-sm">
                                                <div
                                                    className="h-full bg-green-400 rounded-full transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/admin/whatsapp/campanas/${c.id}`}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Ver detalle
                                        </Link>
                                        {c.status === 'draft' && (
                                            <button
                                                onClick={() => handleAction(c.id, 'start')}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                                            >
                                                Iniciar
                                            </button>
                                        )}
                                        {c.status === 'running' && (
                                            <button
                                                onClick={() => handleAction(c.id, 'pause')}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors"
                                            >
                                                Pausar
                                            </button>
                                        )}
                                        {c.status === 'paused' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(c.id, 'start')}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                                                >
                                                    Reanudar
                                                </button>
                                                <button
                                                    onClick={() => handleAction(c.id, 'cancel')}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </>
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
