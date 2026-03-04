'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
    whatsapp: {
        today: { messages: number; cost: number; calls: number }
        period: { messages: number; cost: number; calls: number }
    }
    elevenlabs: {
        today: { chars: number; cost: number; calls: number }
        period: { chars: number; cost: number; calls: number }
    }
}

interface DailyChart {
    date: string
    label: string
    whatsapp: number
    elevenlabs: number
}

interface LogEntry {
    id: string
    service: string
    operation: string
    units: number
    cost: number
    metadata: string | null
    createdAt: string
}

export default function UsoApiPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [dailyChart, setDailyChart] = useState<DailyChart[]>([])
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [days, setDays] = useState(30)

    useEffect(() => { loadData() }, [days, filter])

    const loadData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ days: days.toString() })
            if (filter !== 'all') params.set('service', filter)
            const res = await fetch(`/api/usage?${params}`)
            const data = await res.json()
            setStats(data.stats)
            setDailyChart(data.dailyChart)
            setLogs(data.logs)
        } catch { }
        finally { setLoading(false) }
    }

    const maxChartVal = Math.max(1, ...dailyChart.map(d => d.whatsapp + d.elevenlabs))

    const opLabels: Record<string, string> = {
        send_template: 'Template',
        send_text: 'Texto',
        send_audio: 'Audio WA',
        bulk_template: 'Masivo',
        tts_generate: 'TTS',
    }

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Cargando uso de APIs...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📊 Uso de APIs</h1>
                    <p className="text-sm text-gray-400 mt-1">Monitoreo de consumo y costos de WhatsApp y ElevenLabs</p>
                </div>
                <div className="flex gap-2">
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value={7}>7 días</option>
                        <option value={30}>30 días</option>
                        <option value={90}>90 días</option>
                    </select>
                    <button onClick={loadData} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                        🔄
                    </button>
                </div>
            </div>

            {stats && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-green-600">WA Hoy</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{stats.whatsapp.today.messages}</p>
                            <p className="text-xs text-green-500 mt-1">mensajes</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-4">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-green-600">WA Período</p>
                            <p className="text-3xl font-bold text-green-700 mt-1">{stats.whatsapp.period.messages}</p>
                            <p className="text-xs text-green-500 mt-1">{stats.whatsapp.period.calls} operaciones</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-purple-600">ElevenLabs Hoy</p>
                            <p className="text-3xl font-bold text-purple-700 mt-1">{stats.elevenlabs.today.chars.toLocaleString()}</p>
                            <p className="text-xs text-purple-500 mt-1">caracteres • ~${stats.elevenlabs.today.cost.toFixed(2)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-xl p-4">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-purple-600">ElevenLabs Período</p>
                            <p className="text-3xl font-bold text-purple-700 mt-1">{stats.elevenlabs.period.chars.toLocaleString()}</p>
                            <p className="text-xs text-purple-500 mt-1">{stats.elevenlabs.period.calls} operaciones • ~${stats.elevenlabs.period.cost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">Uso últimos 7 días</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 h-40">
                                {dailyChart.map((d) => (
                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '120px' }}>
                                            <div
                                                className="w-full bg-green-400 rounded-t transition-all"
                                                style={{ height: `${Math.max(2, (d.whatsapp / maxChartVal) * 100)}%` }}
                                                title={`WA: ${d.whatsapp}`}
                                            />
                                            <div
                                                className="w-full bg-purple-400 rounded-t transition-all"
                                                style={{ height: `${Math.max(0, (d.elevenlabs / maxChartVal) * 100)}%` }}
                                                title={`EL: ${d.elevenlabs}`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400 text-center">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-400 rounded" /> WhatsApp</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-400 rounded" /> ElevenLabs</span>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Logs table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Registro de uso</CardTitle>
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                            {['all', 'whatsapp', 'elevenlabs'].map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {f === 'all' ? 'Todos' : f === 'whatsapp' ? 'WhatsApp' : 'ElevenLabs'}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">
                            No hay registros de uso aún
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Servicio</th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Operación</th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Unidades</th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Costo</th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="py-2.5 px-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.service === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {log.service === 'whatsapp' ? '💬' : '🎙️'} {log.service}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-gray-700">{opLabels[log.operation] || log.operation}</td>
                                            <td className="py-2.5 px-3 text-right text-gray-600">{log.units.toLocaleString()}</td>
                                            <td className="py-2.5 px-3 text-right text-gray-600">${log.cost.toFixed(4)}</td>
                                            <td className="py-2.5 px-3 text-right text-gray-400 text-xs">
                                                {new Date(log.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
