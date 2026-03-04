'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Job {
    id: string
    phone: string
    status: string
    messageId: string | null
    errorMessage: string | null
    processedAt: string | null
    createdAt: string
}

interface CampaignDetail {
    campaign: {
        id: string
        name: string
        type: string
        status: string
        stats: Record<string, number>
        list: { name: string }
        template: { name: string; language: string } | null
        _count: { jobs: number }
        createdAt: string
    }
    jobs: Job[]
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
    counts: {
        all: number
        pending: number
        sent: number
        delivered: number
        read: number
        failed: number
        awaiting_reply: number
        expired: number
    }
}

const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-100 text-red-600',
    awaiting_reply: 'bg-orange-100 text-orange-700',
    expired: 'bg-gray-100 text-gray-400',
    processing: 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendiente',
    sent: 'Enviado',
    delivered: 'Entregado',
    read: 'Leído',
    failed: 'Fallido',
    awaiting_reply: 'Esperando respuesta',
    expired: 'Vencido (5h)',
    processing: 'Procesando',
}

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
}

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
    draft: 'Borrador',
    running: 'En curso',
    paused: 'Pausada',
    completed: 'Completada',
    failed: 'Fallida',
}

export default function CampaignDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [data, setData] = useState<CampaignDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [actioning, setActioning] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await fetch(`/api/whatsapp/campaigns/${id}?status=${statusFilter}&page=${page}`)
            const json = await res.json()
            setData(json)
        } catch { } finally {
            if (!silent) setLoading(false)
        }
    }, [id, statusFilter, page])

    useEffect(() => {
        load()
    }, [load])

    // Auto-refresh cada 5 segundos si la campaña está en curso
    useEffect(() => {
        if (data?.campaign.status !== 'running') return
        const interval = setInterval(() => load(true), 5000)
        return () => clearInterval(interval)
    }, [data?.campaign.status, load])

    const handleDelete = async () => {
        if (!confirm('¿Eliminar esta campaña y todos sus registros? Esta acción no se puede deshacer.')) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/whatsapp/campaigns/${id}`, { method: 'DELETE' })
            if (res.ok) {
                router.push('/admin/whatsapp/campanas')
            } else {
                const json = await res.json()
                alert(json.error || 'Error al eliminar')
                setDeleting(false)
            }
        } catch {
            alert('Error al eliminar la campaña')
            setDeleting(false)
        }
    }

    const handleAction = async (action: 'start' | 'pause' | 'cancel') => {
        setActioning(true)
        await fetch(`/api/whatsapp/campaigns/${id}/${action}`, { method: 'POST' })
        await load()
        setActioning(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-gray-400">
                <p>Campaña no encontrada</p>
                <Link href="/admin/whatsapp/campanas" className="text-sm text-blue-600 mt-2 inline-block">← Volver</Link>
            </div>
        )
    }

    const { campaign, jobs, pagination, counts } = data
    const total = campaign._count.jobs
    const stats = campaign.stats
    const processedPct = total > 0 ? Math.round(((stats.sent || 0) + (stats.failed || 0)) / total * 100) : 0
    const deliveredPct = (stats.sent || 0) > 0 ? Math.round((stats.delivered || 0) / (stats.sent || 1) * 100) : 0
    const readPct = (stats.delivered || 0) > 0 ? Math.round((stats.read || 0) / (stats.delivered || 1) * 100) : 0

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/admin/whatsapp/campanas" className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block">
                        ← Campañas
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CAMPAIGN_STATUS_COLOR[campaign.status] || 'bg-gray-100 text-gray-600'}`}>
                            {CAMPAIGN_STATUS_LABEL[campaign.status] || campaign.status}
                            {campaign.status === 'running' && (
                                <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            )}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Lista: {campaign.list?.name}
                        {campaign.template && <> · Plantilla: {campaign.template.name}</>}
                        {' · '}{campaign.type === 'audio' ? 'Audio IA' : campaign.type === 'image' ? 'Imagen' : campaign.type === 'sequence' ? 'Secuencia' : 'Template'}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 shrink-0">
                    {campaign.status === 'draft' && (
                        <button
                            onClick={() => handleAction('start')}
                            disabled={actioning}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                            Iniciar campaña
                        </button>
                    )}
                    {campaign.status === 'running' && (
                        <button
                            onClick={() => handleAction('pause')}
                            disabled={actioning}
                            className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                        >
                            Pausar
                        </button>
                    )}
                    {campaign.status === 'paused' && (
                        <>
                            <button
                                onClick={() => handleAction('start')}
                                disabled={actioning}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                                Reanudar
                            </button>
                            <button
                                onClick={() => handleAction('cancel')}
                                disabled={actioning}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </>
                    )}
                    {['completed', 'cancelled', 'failed', 'paused', 'draft'].includes(campaign.status) && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total', value: total, color: 'text-gray-700' },
                    { label: 'Enviados', value: stats.sent || 0, color: 'text-blue-600' },
                    { label: 'Entregados', value: stats.delivered || 0, color: 'text-green-600' },
                    { label: 'Leídos', value: stats.read || 0, color: 'text-purple-600' },
                    { label: 'Fallidos', value: stats.failed || 0, color: 'text-red-500' },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Progress bars */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Progreso</h3>

                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Procesados</span>
                        <span>{processedPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${processedPct}%` }} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tasa de entrega</span>
                        <span>{deliveredPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${deliveredPct}%` }} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tasa de lectura</span>
                        <span>{readPct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${readPct}%` }} />
                    </div>
                </div>

                {campaign.status === 'running' && (
                    <p className="text-xs text-blue-500">Actualizando automáticamente cada 5 segundos...</p>
                )}
            </div>

            {/* Jobs table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                {/* Filter tabs */}
                <div className="flex gap-1 p-4 border-b border-gray-100 overflow-x-auto">
                    {[
                        { key: 'all', label: `Todos (${counts.all})` },
                        { key: 'pending', label: `Pendientes (${counts.pending})` },
                        { key: 'sent', label: `Enviados (${counts.sent})` },
                        { key: 'delivered', label: `Entregados (${counts.delivered})` },
                        { key: 'read', label: `Leídos (${counts.read})` },
                        { key: 'failed', label: `Fallidos (${counts.failed})` },
                        ...(campaign.type === 'sequence' ? [
                            { key: 'awaiting_reply', label: `En espera (${counts.awaiting_reply})` },
                            { key: 'expired', label: `Vencidos (${counts.expired})` },
                        ] : []),
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => { setStatusFilter(f.key); setPage(1) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === f.key
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Teléfono</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Estado</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Message ID</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Procesado</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                                        No hay registros con este filtro
                                    </td>
                                </tr>
                            ) : jobs.map((job) => (
                                <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{job.phone}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-500'}`}>
                                            {STATUS_LABEL[job.status] || job.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-[11px] text-gray-400 max-w-[140px] truncate">
                                        {job.messageId || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-gray-400">
                                        {job.processedAt
                                            ? new Date(job.processedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-red-500 max-w-[200px] truncate" title={job.errorMessage || ''}>
                                        {job.errorMessage || ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                            {(page - 1) * pagination.pageSize + 1}–{Math.min(page * pagination.pageSize, pagination.total)} de {pagination.total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
