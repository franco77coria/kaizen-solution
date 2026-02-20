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

    const fetchData = async () => {
        try {
            setError('')
            const res = await fetch('/api/whatsapp/stats')
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
    }, [])

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-1">Resumen de tu actividad en WhatsApp Business</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData() }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    ↻ Actualizar
                </button>
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
