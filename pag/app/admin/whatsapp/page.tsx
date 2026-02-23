'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Stats {
    totalRecibidos: number
    totalEnviados: number
    totalContactos: number
    recibidosHoy: number
    enviadosHoy: number
    noLeidos: number
    tasaRespuesta: number
    campaigns: {
        total: number
        delivered: number
        read: number
        failed: number
    }
    financials?: {
        meta: number
        elevenlabs: number
        total: number
        templateJobs: number
        audioJobs: number
    }
    health?: {
        status: string
        qualityRating: string
    }
}

interface Message {
    id: string
    phone: string
    contactName: string | null
    content: string
    timestamp: string
    isRead: boolean
}

export default function WhatsAppDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [recentMessages, setRecentMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [dateRange, setDateRange] = useState('ALL') // ALL, TODAY, 7DAYS, 30DAYS

    // Calculadora dinámica
    const [isCalcOpen, setIsCalcOpen] = useState(false)
    const [calcData, setCalcData] = useState({
        contacts: 1000,
        type: 'template', // 'template' | 'audio'
        characters: 150
    })

    const fetchData = async () => {
        try {
            setError('')
            setLoading(true)

            let qs = ''
            const now = new Date()
            if (dateRange === 'TODAY') {
                now.setHours(0, 0, 0, 0)
                qs = `?startDate=${now.toISOString()}`
            } else if (dateRange === '7DAYS') {
                now.setDate(now.getDate() - 7)
                qs = `?startDate=${now.toISOString()}`
            } else if (dateRange === '30DAYS') {
                now.setDate(now.getDate() - 30)
                qs = `?startDate=${now.toISOString()}`
            }

            const res = await fetch('/api/whatsapp/stats' + qs)
            if (!res.ok) throw new Error('Error al cargar')
            const data = await res.json()
            setStats(data.stats)
            setRecentMessages(data.recentMessages || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [dateRange])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Cargando dashboard...</p>
                </div>
            </div>
        )
    }

    const statCards = [
        { label: 'Recibidos', value: stats?.totalRecibidos || 0, sub: `+${stats?.recibidosHoy || 0} hoy`, color: 'bg-green-500', icon: '📩' },
        { label: 'Enviados', value: stats?.totalEnviados || 0, sub: `+${stats?.enviadosHoy || 0} hoy`, color: 'bg-blue-500', icon: '📤' },
        { label: 'Contactos', value: stats?.totalContactos || 0, sub: 'activos', color: 'bg-purple-500', icon: '👥' },
        { label: 'Tasa Respuesta', value: `${stats?.tasaRespuesta || 0}%`, sub: 'respondidos', color: 'bg-amber-500', icon: '📈' },
    ]

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-1">Resumen de tu actividad en WhatsApp Business</p>
                </div>

                <div className="flex items-center gap-3">
                    {stats?.health && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${stats.health.qualityRating === 'GREEN' ? 'bg-green-50 border-green-200 text-green-700' :
                            stats.health.qualityRating === 'YELLOW' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                stats.health.qualityRating === 'RED' ? 'bg-red-50 border-red-200 text-red-700' :
                                    'bg-gray-50 border-gray-200 text-gray-600'
                            }`}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            <span>Calidad WABA: {stats.health.qualityRating}</span>
                        </div>
                    )}

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-green-500/20"
                    >
                        <option value="ALL">Histórico Global</option>
                        <option value="TODAY">Hoy</option>
                        <option value="7DAYS">Últimos 7 días</option>
                        <option value="30DAYS">Últimos 30 días</option>
                    </select>

                    <button
                        onClick={() => { fetchData() }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        ↻ Actualizar
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s) => (
                    <Card key={s.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                    <p className="text-sm font-medium text-gray-500 mt-1">{s.label}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl ${s.color} bg-opacity-10 flex items-center justify-center text-lg`}>
                                    {s.icon}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">{s.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Panel de Campañas Masivas */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>📢</span> Rendimiento de Campañas Masivas
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Acumulado histórico de los envíos programados usando plantillas.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tracking-tight text-gray-900">{stats?.campaigns?.total || 0}</span>
                        <span className="text-xs text-gray-500 uppercase font-semibold mt-1 tracking-wider">Total Generados</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tracking-tight text-blue-600">{stats?.campaigns?.delivered || 0}</span>
                        <span className="text-xs text-blue-500 uppercase font-semibold mt-1 tracking-wider">Entregados</span>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tracking-tight text-green-600">{stats?.campaigns?.read || 0}</span>
                        <span className="text-xs text-green-500 uppercase font-semibold mt-1 tracking-wider">Leídos</span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tracking-tight text-red-600">{stats?.campaigns?.failed || 0}</span>
                        <span className="text-xs text-red-500 uppercase font-semibold mt-1 tracking-wider">Errores / Bounce</span>
                    </div>
                </div>
            </div>

            {/* Dashboard Financiero */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>💸</span> Visibilidad Financiera
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Costo estimado incurrido en el período seleccionado. Basado en facturación por uso de APIs (Promedio Latam).</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-4 border-r border-gray-100 w-16 flex items-center justify-center text-3xl">🧩</div>
                        <div className="p-4 bg-white flex-1 flex flex-col justify-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Costo Meta (WhatsApp)</span>
                            <span className="text-2xl font-black text-gray-900">${stats?.financials?.meta?.toFixed(2) || '0.00'} <span className="text-sm font-medium text-gray-400">USD</span></span>
                        </div>
                    </div>

                    <div className="flex border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-purple-50 p-4 border-r border-purple-100 w-16 flex items-center justify-center text-3xl">🎙️</div>
                        <div className="p-4 bg-white flex-1 flex flex-col justify-center">
                            <span className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">Costo ElevenLabs</span>
                            <span className="text-2xl font-black text-gray-900">${stats?.financials?.elevenlabs?.toFixed(2) || '0.00'} <span className="text-sm font-medium text-gray-400">USD</span></span>
                        </div>
                    </div>

                    <div className="flex border-2 border-green-500 rounded-xl overflow-hidden shadow-md">
                        <div className="bg-green-500 p-4 w-16 flex items-center justify-center text-3xl text-white">💰</div>
                        <div className="p-4 bg-white flex-1 flex flex-col justify-center">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Gasto Total</span>
                            <span className="text-2xl font-black text-green-700">${stats?.financials?.total?.toFixed(2) || '0.00'} <span className="text-sm font-medium text-gray-500">USD</span></span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => setIsCalcOpen(true)}
                        className="text-sm font-medium text-teal-600 bg-teal-50 px-4 py-2 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200 flex items-center gap-2"
                    >
                        <span>🧮</span> Abrir Calculadora de Presupuesto
                    </button>
                </div>
            </div>

            {/* Unread badge */}
            {(stats?.noLeidos || 0) > 0 && (
                <Link href="/admin/whatsapp/mensajes">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {stats?.noLeidos}
                            </div>
                            <span className="text-sm font-medium text-green-800">
                                {stats?.noLeidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}
                            </span>
                        </div>
                        <span className="text-green-600 text-sm">Ver mensajes →</span>
                    </div>
                </Link>
            )}

            {/* Recent messages + Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent messages */}
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-gray-900">Mensajes Recientes</CardTitle>
                                <Link href="/admin/whatsapp/mensajes" className="text-xs text-green-600 hover:text-green-700 font-medium">
                                    Ver todos →
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentMessages.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    No hay mensajes aún. Cuando te escriban por WhatsApp, aparecerán acá.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {recentMessages.map((msg) => (
                                        <Link key={msg.id} href="/admin/whatsapp/mensajes">
                                            <div className={`flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${!msg.isRead ? 'bg-green-50/40' : ''}`}>
                                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                                    {getInitials(msg.contactName || msg.phone)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm ${!msg.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                            {msg.contactName || formatPhone(msg.phone)}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                                                            {formatTime(msg.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content}</p>
                                                </div>
                                                {!msg.isRead && (
                                                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick actions */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-gray-900">Acciones Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href="/admin/whatsapp/enviar">
                            <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-all cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📤</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-green-700">Enviar Mensaje</p>
                                        <p className="text-[11px] text-gray-400">Template o texto libre</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/admin/whatsapp/contactos">
                            <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all cursor-pointer group mt-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">👥</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Ver Contactos</p>
                                        <p className="text-[11px] text-gray-400">Gestionar la lista</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <Link href="/admin/whatsapp/config">
                            <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group mt-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⚙️</span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Configuración</p>
                                        <p className="text-[11px] text-gray-400">API y webhook</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
            {/* Calculator Modal */}
            {isCalcOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] shadow-2xl overflow-y-auto flex flex-col border border-gray-100">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><span>🧮</span> Proyección de Presupuesto</h3>
                                <p className="text-sm text-gray-500 mt-1">Calcula cuánto te costará una campaña específica según tu propia audiencia.</p>
                            </div>
                            <button onClick={() => setIsCalcOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad de Personas a impactar</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={calcData.contacts}
                                    onChange={e => setCalcData({ ...calcData, contacts: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-sm transition-all bg-gray-50/50 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Campaña</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setCalcData({ ...calcData, type: 'template' })}
                                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${calcData.type === 'template' ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        📄 Plantilla Texto
                                    </button>
                                    <button
                                        onClick={() => setCalcData({ ...calcData, type: 'audio' })}
                                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${calcData.type === 'audio' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        🎙️ Audio IA
                                    </button>
                                </div>
                            </div>

                            {calcData.type === 'audio' && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Longitud del texto (Caracteres)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={calcData.characters}
                                        onChange={e => setCalcData({ ...calcData, characters: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">ElevenLabs cobra por cada caracter generado (~$0.00015 USD). Afecta el precio final de la nota de voz.</p>
                                </div>
                            )}

                            {(() => {
                                const baseMeta = calcData.contacts * 0.06; // Conversation Template / Utility latam average
                                const baseEleven = calcData.type === 'audio' ? (calcData.contacts * calcData.characters * 0.00015) : 0;
                                const total = baseMeta + baseEleven;

                                return (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <div className={`p-5 rounded-xl border ${calcData.type === 'audio' ? 'bg-gradient-to-br from-purple-50 to-teal-50 border-purple-100' : 'bg-teal-50 border-teal-100'}`}>
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="text-sm font-bold text-gray-700">Costo Final Proyectado</p>
                                                <p className="text-3xl font-black text-gray-900">${total.toFixed(2)} <span className="text-sm font-semibold text-gray-500">USD</span></p>
                                            </div>
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-gray-500">WhatsApp API: <span className="text-teal-700 font-bold">${baseMeta.toFixed(2)}</span></span>
                                                {calcData.type === 'audio' && <span className="text-gray-500">ElevenLabs: <span className="text-purple-700 font-bold">${baseEleven.toFixed(2)}</span></span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={() => setIsCalcOpen(false)} className="w-full px-4 py-2.5 bg-gray-900 border border-transparent rounded-xl text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                                Cerrar Proyección
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.split(' ')
    return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase()
}

function formatPhone(p: string): string {
    if (!p) return ''
    if (p.length > 10) return '+' + p.substring(0, p.length - 10) + ' ' + p.substring(p.length - 10)
    return p
}

function formatTime(d: string): string {
    if (!d) return ''
    const dt = new Date(d)
    const now = new Date()
    const diff = now.getTime() - dt.getTime()
    if (diff < 86400000) return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
    if (diff < 172800000) return 'Ayer'
    return dt.getDate() + '/' + (dt.getMonth() + 1)
}
