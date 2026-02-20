'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Config {
    isConfigured: boolean
    apiToken: string
    phoneNumberId: string
    wabaId: string
    verifyToken: string
    apiVersion: string
}

export default function ConfigPage() {
    const [config, setConfig] = useState<Config>({
        isConfigured: false,
        apiToken: '',
        phoneNumberId: '',
        wabaId: '',
        verifyToken: 'kaizen_whatsapp_2026',
        apiVersion: 'v21.0',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [showToken, setShowToken] = useState(false)
    const [newToken, setNewToken] = useState('')

    useEffect(() => {
        loadConfig()
    }, [])

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/whatsapp/config')
            const data = await res.json()
            setConfig(data)
        } catch { } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!newToken && !config.isConfigured) {
            return showToast('Ingresá el API Token', 'err')
        }
        if (!config.phoneNumberId) {
            return showToast('Ingresá el Phone Number ID', 'err')
        }

        setSaving(true)
        try {
            const res = await fetch('/api/whatsapp/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiToken: newToken || config.apiToken,
                    phoneNumberId: config.phoneNumberId,
                    wabaId: config.wabaId,
                    verifyToken: config.verifyToken,
                    apiVersion: config.apiVersion,
                }),
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Configuración guardada')
                setNewToken('')
                loadConfig()
            } else {
                showToast(data.error || 'Error al guardar', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setSaving(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const res = await fetch('/api/whatsapp/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            setTestResult({
                success: data.success,
                message: data.success
                    ? `✅ Conectado: ${data.phoneNumber} (${data.name})`
                    : `❌ Error: ${data.error}`,
            })
        } catch {
            setTestResult({ success: false, message: '❌ Error de conexión' })
        } finally {
            setTesting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/whatsapp`
        : '/api/whatsapp'

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                <p className="text-sm text-gray-400 mt-1">Configurá tus credenciales de la API de WhatsApp Business</p>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.msg}
                </div>
            )}

            {/* Connection status */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${config.isConfigured ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm font-medium text-gray-700">
                                {config.isConfigured ? 'Configurado' : 'No configurado'}
                            </span>
                        </div>
                        <button
                            onClick={handleTest}
                            disabled={testing || !config.isConfigured}
                            className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                            {testing ? 'Testeando...' : '🔌 Testear Conexión'}
                        </button>
                    </div>
                    {testResult && (
                        <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {testResult.message}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* API Credentials */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Credenciales de la API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* API Token */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">API Token (Access Token)</label>
                        {config.isConfigured && !showToken ? (
                            <div className="flex items-center gap-3">
                                <input
                                    type="password"
                                    value={config.apiToken}
                                    readOnly
                                    className="flex-1 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm cursor-not-allowed font-mono"
                                />
                                <button
                                    onClick={() => setShowToken(true)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                                >
                                    Cambiar token
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    value={newToken}
                                    onChange={(e) => setNewToken(e.target.value)}
                                    placeholder="EAAxxxxxxxxxxxxxxxx..."
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                                {showToken && (
                                    <button onClick={() => { setShowToken(false); setNewToken('') }} className="text-xs text-gray-400 mt-1 hover:text-gray-600">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">
                            Obtenelo en Meta for Developers → tu App → WhatsApp → API Setup
                        </p>
                    </div>

                    {/* Phone Number ID */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number ID</label>
                        <input
                            type="text"
                            value={config.phoneNumberId}
                            onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                            placeholder="1234567890"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Lo encontrás en WhatsApp → API Setup → "Phone number ID"
                        </p>
                    </div>

                    {/* WABA ID */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">WABA ID (Business Account ID)</label>
                        <input
                            type="text"
                            value={config.wabaId}
                            onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                            placeholder="9876543210"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Necesario para obtener templates. Lo encontrás en la URL del dashboard de WhatsApp: .../waba/XXXXX/...
                        </p>
                    </div>

                    {/* Verify Token */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Verify Token</label>
                        <input
                            type="text"
                            value={config.verifyToken}
                            onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
                            placeholder="kaizen_whatsapp_2026"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Token que Meta usa para verificar el webhook. Debe coincidir con el que ponés en Meta.
                        </p>
                    </div>

                    {/* API Version */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">API Version</label>
                        <select
                            value={config.apiVersion}
                            onChange={(e) => setConfig({ ...config, apiVersion: e.target.value })}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                        >
                            <option value="v21.0">v21.0 (recomendado)</option>
                            <option value="v20.0">v20.0</option>
                            <option value="v19.0">v19.0</option>
                        </select>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Configuración'}
                    </button>
                </CardContent>
            </Card>

            {/* Webhook Info */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Webhook</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">URL del Webhook</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={webhookUrl}
                                className="flex-1 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono cursor-text"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl)
                                    showToast('URL copiada')
                                }}
                                className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                📋 Copiar
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">📝 Instrucciones de configuración</h4>
                        <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                            <li>Andá a <strong>Meta for Developers</strong> → tu App → WhatsApp → Configuración</li>
                            <li>En &quot;Webhook&quot;, pegá la <strong>URL del webhook</strong> de arriba</li>
                            <li>En &quot;Verify Token&quot;, usá: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">{config.verifyToken}</code></li>
                            <li>Suscribite al evento <strong>messages</strong></li>
                            <li>Hacé click en &quot;Verificar y guardar&quot;</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
