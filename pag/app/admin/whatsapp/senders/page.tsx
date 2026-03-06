'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Phone,
    Plus,
    Trash2,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Wifi,
    WifiOff,
    Activity,
    Clock,
    Zap,
    Shield,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react'

interface Sender {
    id: string
    name: string
    phoneNumber: string
    messagingServiceSid: string | null
    trustLevel: string
    maxMps: number
    dailyLimit: number
    sentToday: number
    isActive: boolean
    isHealthy: boolean
    lastError: string | null
    lastUsedAt: string | null
    totalSent: number
    createdAt: string
}

type TrustLevel = 'new' | 'standard' | 'high'

const TRUST_LABELS: Record<TrustLevel, { label: string; color: string; mps: string }> = {
    new: { label: 'Nuevo', color: 'text-amber-600 bg-amber-50', mps: '1 MPS' },
    standard: { label: 'Estándar', color: 'text-blue-600 bg-blue-50', mps: '10 MPS' },
    high: { label: 'Alto', color: 'text-green-600 bg-green-50', mps: '80 MPS' },
}

export default function SendersPage() {
    const [senders, setSenders] = useState<Sender[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        name: '',
        accountSid: '',
        authToken: '',
        phoneNumber: '',
        messagingServiceSid: '',
        trustLevel: 'standard' as TrustLevel,
        maxMps: 1,
        dailyLimit: 1000,
    })

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const loadSenders = useCallback(async () => {
        try {
            const res = await fetch('/api/whatsapp/senders')
            if (res.ok) {
                const data = await res.json()
                setSenders(data)
            }
        } catch {
            showToast('Error cargando senders', 'err')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSenders()
    }, [loadSenders])

    const handleCreate = async () => {
        if (!form.name || !form.accountSid || !form.authToken || !form.phoneNumber) {
            return showToast('Completá todos los campos obligatorios', 'err')
        }

        setSaving(true)
        try {
            const res = await fetch('/api/whatsapp/senders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            if (res.ok && data.success) {
                showToast(`Sender "${form.name}" creado correctamente`)
                setShowForm(false)
                setForm({
                    name: '', accountSid: '', authToken: '', phoneNumber: '',
                    messagingServiceSid: '', trustLevel: 'standard', maxMps: 1, dailyLimit: 1000,
                })
                loadSenders()
            } else {
                showToast(data.error || 'Error al crear sender', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (sender: Sender) => {
        try {
            const res = await fetch(`/api/whatsapp/senders/${sender.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !sender.isActive }),
            })
            if (res.ok) {
                showToast(`${sender.name} ${sender.isActive ? 'desactivado' : 'activado'}`)
                loadSenders()
            }
        } catch {
            showToast('Error actualizando sender', 'err')
        }
    }

    const handleReEnable = async (sender: Sender) => {
        try {
            const res = await fetch(`/api/whatsapp/senders/${sender.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isHealthy: true }),
            })
            if (res.ok) {
                showToast(`${sender.name} re-habilitado`)
                loadSenders()
            }
        } catch {
            showToast('Error re-habilitando sender', 'err')
        }
    }

    const handleDelete = async (sender: Sender) => {
        if (!confirm(`¿Eliminar "${sender.name}"?\nEsta acción no se puede deshacer.`)) return

        setDeletingId(sender.id)
        try {
            const res = await fetch(`/api/whatsapp/senders/${sender.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (res.ok && data.success) {
                showToast('Sender eliminado')
                loadSenders()
            } else {
                showToast(data.error || 'Error al eliminar', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setDeletingId(null)
        }
    }

    const handleTestConnection = async (sender: Sender) => {
        setTesting(sender.id)
        try {
            const res = await fetch(`/api/whatsapp/senders/${sender.id}`)
            if (res.ok) {
                showToast(`${sender.name}: conexión OK`)
            } else {
                showToast(`Error verificando ${sender.name}`, 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setTesting(null)
        }
    }

    // Stats
    const totalMps = senders.filter(s => s.isActive && s.isHealthy).reduce((sum, s) => sum + s.maxMps, 0)
    const totalCapacity = senders.filter(s => s.isActive && s.isHealthy).reduce((sum, s) => sum + s.dailyLimit, 0)
    const totalSentToday = senders.reduce((sum, s) => sum + s.sentToday, 0)
    const activeSenders = senders.filter(s => s.isActive && s.isHealthy).length
    const unhealthySenders = senders.filter(s => !s.isHealthy).length

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Senders Twilio</h1>
                    <p className="text-sm text-gray-400 mt-1">Gestioná múltiples números de WhatsApp para envíos masivos</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Agregar Sender
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <Wifi size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{activeSenders}</p>
                                <p className="text-xs text-gray-400">Activos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Zap size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalMps}</p>
                                <p className="text-xs text-gray-400">MPS Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Activity size={20} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalSentToday.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">Enviados hoy</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Shield size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalCapacity.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">Capacidad diaria</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Unhealthy Alert */}
            {unhealthySenders > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">
                            {unhealthySenders} sender{unhealthySenders > 1 ? 's' : ''} con problemas
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">
                            Revisá los errores abajo y rehabilitalos cuando estén listos
                        </p>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Nuevo Sender Twilio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre del Sender *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder='ej: "Sender Principal"'
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Número WhatsApp *</label>
                                <input
                                    type="text"
                                    value={form.phoneNumber}
                                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                    placeholder="+15077636379"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                            </div>

                            {/* Account SID */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Account SID *</label>
                                <input
                                    type="text"
                                    value={form.accountSid}
                                    onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                            </div>

                            {/* Auth Token */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Auth Token *</label>
                                <input
                                    type="password"
                                    value={form.authToken}
                                    onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                            </div>

                            {/* Messaging Service SID (optional) */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    Messaging Service SID
                                    <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.messagingServiceSid}
                                    onChange={(e) => setForm({ ...form, messagingServiceSid: e.target.value })}
                                    placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Si usás Messaging Service, Twilio balancea automáticamente entre números
                                </p>
                            </div>

                            {/* Trust Level */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Trust Level</label>
                                <select
                                    value={form.trustLevel}
                                    onChange={(e) => {
                                        const tl = e.target.value as TrustLevel
                                        const mpsMap: Record<TrustLevel, number> = { new: 1, standard: 10, high: 80 }
                                        setForm({ ...form, trustLevel: tl, maxMps: mpsMap[tl] })
                                    }}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                >
                                    <option value="new">🔵 Nuevo (1 MPS) — Número recién registrado</option>
                                    <option value="standard">🟢 Estándar (10 MPS) — Días/semanas de uso</option>
                                    <option value="high">⚡ Alto (80 MPS) — Cuenta establecida</option>
                                </select>
                            </div>

                            {/* Daily Limit */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Límite Diario</label>
                                <input
                                    type="number"
                                    value={form.dailyLimit}
                                    onChange={(e) => setForm({ ...form, dailyLimit: parseInt(e.target.value) || 1000 })}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Máximo de mensajes por día para este sender
                                </p>
                            </div>

                            {/* Max MPS */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">MPS (Mensajes/segundo)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={form.maxMps}
                                    onChange={(e) => setForm({ ...form, maxMps: parseFloat(e.target.value) || 1 })}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                            </div>
                        </div>

                        {/* Info box */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tip</h4>
                            <p className="text-xs text-blue-800">
                                Las credenciales se verifican con Twilio antes de guardar. Si la verificación falla, revisá que Account SID y Auth Token sean correctos.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Verificando y guardando...' : 'Crear Sender'}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Senders List */}
            {senders.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Phone size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">No hay senders configurados</h3>
                        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                            Agregá cuentas Twilio para distribuir los envíos masivos entre múltiples números y aumentar la velocidad.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
                        >
                            <Plus size={18} />
                            Agregar primer sender
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {senders.map((sender) => {
                        const trust = TRUST_LABELS[sender.trustLevel as TrustLevel] || TRUST_LABELS.standard
                        const capacityUsed = sender.dailyLimit > 0 ? (sender.sentToday / sender.dailyLimit) * 100 : 0
                        const isDisabled = !sender.isActive || !sender.isHealthy

                        return (
                            <Card key={sender.id} className={`border-0 shadow-sm transition-all ${isDisabled ? 'opacity-60' : ''}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* Status indicator */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${!sender.isHealthy ? 'bg-red-50' :
                                                    !sender.isActive ? 'bg-gray-100' :
                                                        'bg-green-50'
                                                }`}>
                                                {!sender.isHealthy ? (
                                                    <XCircle size={22} className="text-red-500" />
                                                ) : !sender.isActive ? (
                                                    <WifiOff size={22} className="text-gray-400" />
                                                ) : (
                                                    <CheckCircle2 size={22} className="text-green-500" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{sender.name}</h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${trust.color}`}>
                                                        {trust.label} · {trust.mps}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-gray-400 font-mono mb-2">{sender.phoneNumber}</p>

                                                {/* Error banner */}
                                                {!sender.isHealthy && sender.lastError && (
                                                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
                                                        <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-red-700 line-clamp-2">{sender.lastError}</p>
                                                    </div>
                                                )}

                                                {/* Progress bar */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${capacityUsed > 90 ? 'bg-red-500' :
                                                                    capacityUsed > 60 ? 'bg-amber-500' :
                                                                        'bg-green-500'
                                                                }`}
                                                            style={{ width: `${Math.min(capacityUsed, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                        {sender.sentToday.toLocaleString()} / {sender.dailyLimit.toLocaleString()} hoy
                                                    </span>
                                                </div>

                                                {/* Meta info */}
                                                <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Activity size={12} />
                                                        {sender.totalSent.toLocaleString()} total
                                                    </span>
                                                    {sender.lastUsedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            Último: {new Date(sender.lastUsedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {sender.messagingServiceSid && (
                                                        <span className="flex items-center gap-1 text-blue-500">
                                                            <Zap size={12} />
                                                            Messaging Service
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Re-enable if unhealthy */}
                                            {!sender.isHealthy && (
                                                <button
                                                    onClick={() => handleReEnable(sender)}
                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                    title="Re-habilitar sender"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}

                                            {/* Toggle active */}
                                            <button
                                                onClick={() => handleToggle(sender)}
                                                className={`p-2 rounded-lg transition-colors ${sender.isActive
                                                        ? 'text-green-600 hover:bg-green-50'
                                                        : 'text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                title={sender.isActive ? 'Desactivar' : 'Activar'}
                                            >
                                                {sender.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(sender)}
                                                disabled={deletingId === sender.id}
                                                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                title="Eliminar sender"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Capacity Summary */}
            {senders.length > 0 && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
                    <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Estimación de rendimiento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">10K mensajes con {activeSenders} sender{activeSenders !== 1 ? 's' : ''}</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {totalMps > 0 ? `~${Math.ceil(10000 / (totalMps * 60))} minutos` : '—'}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">Capacidad restante hoy</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {(totalCapacity - totalSentToday).toLocaleString()} mensajes
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-xs text-gray-400 mb-1">Velocidad combinada</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {totalMps} msg/s ({(totalMps * 60).toLocaleString()} msg/min)
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* How it works */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">🔧 ¿Cómo funciona?</h3>
                    <div className="space-y-3 text-xs text-gray-600">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-600 text-[10px] font-bold">1</div>
                            <p>Agregá uno o más números Twilio habilitados para WhatsApp. Cada uno tiene su propio Account SID y Auth Token.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-600 text-[10px] font-bold">2</div>
                            <p>Cuando lanzás una campaña, el sistema distribuye los envíos entre todos los senders activos automáticamente (round-robin proporcional).</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 text-green-600 text-[10px] font-bold">3</div>
                            <p>Si un sender tiene errores, se deshabilita automáticamente para no afectar la campaña. Podés re-habilitarlo cuando lo soluciones.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 text-[10px] font-bold">💡</div>
                            <p><strong>Tip:</strong> Si configurás un <span className="font-mono bg-gray-100 px-1 rounded">Messaging Service SID</span>, Twilio balancea automáticamente entre los números del servicio.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
