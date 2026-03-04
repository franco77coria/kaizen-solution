'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Voice {
    voice_id: string
    name: string
    category: string
}

export default function ConfigElevenLabsPage() {
    const [apiKey, setApiKey] = useState('')
    const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM')
    const [modelId, setModelId] = useState('eleven_multilingual_v2')
    const [isConfigured, setIsConfigured] = useState(false)
    const [voices, setVoices] = useState<Voice[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

    // Voice cloning
    const [cloneName, setCloneName] = useState('')
    const [cloneDesc, setCloneDesc] = useState('')
    const [cloneFiles, setCloneFiles] = useState<File[]>([])
    const [cloning, setCloning] = useState(false)

    useEffect(() => { loadConfig() }, [])

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const loadConfig = async () => {
        try {
            const res = await fetch('/api/elevenlabs/config')
            const data = await res.json()
            if (data.isConfigured) {
                setApiKey(data.apiKey)
                setVoiceId(data.voiceId)
                setModelId(data.modelId)
                setIsConfigured(true)
            }
        } catch { showToast('Error cargando config', 'err') }
        finally { setLoading(false) }
    }

    const loadVoices = async () => {
        try {
            const res = await fetch('/api/elevenlabs/voices')
            const data = await res.json()
            if (data.success) setVoices(data.voices)
        } catch { }
    }

    const handleSave = async () => {
        if (!apiKey || apiKey.includes('...')) {
            return showToast('Ingresá tu API Key completa (no la versión enmascarada)', 'err')
        }
        setSaving(true)
        try {
            const res = await fetch('/api/elevenlabs/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, voiceId, modelId }),
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Configuración guardada')
                setIsConfigured(true)
                loadVoices()
            } else showToast(data.error || 'Error al guardar', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setSaving(false) }
    }

    const handleTestConnection = async () => {
        setTesting(true)
        try {
            const res = await fetch('/api/elevenlabs/voices')
            const data = await res.json()
            if (data.success) {
                setVoices(data.voices)
                showToast(`✅ Conexión exitosa — ${data.voices.length} voces disponibles`)
            } else showToast(data.error || 'Error de conexión', 'err')
        } catch { showToast('No se pudo conectar a ElevenLabs', 'err') }
        finally { setTesting(false) }
    }

    const handleCloneVoice = async () => {
        if (!cloneName.trim()) return showToast('Ingresá un nombre para la voz', 'err')
        if (cloneFiles.length === 0) return showToast('Subí al menos un archivo de audio', 'err')

        setCloning(true)
        try {
            const formData = new FormData()
            formData.append('name', cloneName)
            formData.append('description', cloneDesc || `Voz clonada: ${cloneName}`)
            cloneFiles.forEach(f => formData.append('files', f))

            const res = await fetch('/api/elevenlabs/clone', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (data.success) {
                showToast(`✅ Voz "${cloneName}" clonada exitosamente`)
                setVoiceId(data.voice_id)
                setCloneName('')
                setCloneDesc('')
                setCloneFiles([])
                loadVoices()
            } else showToast(data.error || 'Error al clonar', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setCloning(false) }
    }

    const handleDeleteVoice = async (vId: string, vName: string) => {
        if (!confirm(`¿Eliminar la voz "${vName}"? Esta acción no se puede deshacer.`)) return
        try {
            const res = await fetch('/api/elevenlabs/clone', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voiceId: vId }),
            })
            const data = await res.json()
            if (data.success) {
                showToast(`✅ Voz "${vName}" eliminada`)
                loadVoices()
            } else showToast(data.error || 'Error', 'err')
        } catch { showToast('Error', 'err') }
    }

    const models = [
        { id: 'eleven_multilingual_v2', name: 'Multilingual v2 (recomendado — español)' },
        { id: 'eleven_monolingual_v1', name: 'Monolingual v1 (solo inglés)' },
        { id: 'eleven_turbo_v2', name: 'Turbo v2 (rápido)' },
        { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5 (más rápido)' },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Cargando configuración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🎙️ ElevenLabs — Audio IA</h1>
                <p className="text-sm text-gray-400 mt-1">Configurá tu API key, cloná voces y generá audios personalizados.</p>
            </div>

            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Status */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isConfigured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                <p className={`text-sm font-medium ${isConfigured ? 'text-green-700' : 'text-amber-700'}`}>
                    {isConfigured ? 'ElevenLabs configurado y activo' : 'ElevenLabs no configurado — ingresá tu API Key'}
                </p>
            </div>

            {/* Credentials */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">🔑 Credenciales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">API Key</label>
                        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                            placeholder="xi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Obtenela en <a href="https://elevenlabs.io" target="_blank" rel="noopener" className="text-purple-500 hover:underline">elevenlabs.io</a> → Profile → API Keys
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Modelo</label>
                        <select value={modelId} onChange={(e) => setModelId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Voz por defecto</label>
                        {voices.length > 0 ? (
                            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                                {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.category})</option>)}
                            </select>
                        ) : (
                            <input type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="Voice ID"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} disabled={saving}
                            className="flex-1 py-3 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors">
                            {saving ? 'Guardando...' : '💾 Guardar'}
                        </button>
                        <button onClick={handleTestConnection} disabled={testing || !isConfigured}
                            className="py-3 px-6 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors">
                            {testing ? '⏳...' : '🔗 Probar Conexión'}
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Voice Cloning */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">🧬 Clonar Voz</CardTitle>
                    <p className="text-xs text-gray-400 mt-1">
                        Subí grabaciones de la voz que querés clonar. Mínimo 1 archivo, idealmente 3-5 muestras de 30seg-2min cada una. Formatos: mp3, wav, m4a.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre de la voz</label>
                        <input type="text" value={cloneName} onChange={(e) => setCloneName(e.target.value)}
                            placeholder="Ej: Voz Carlos, Voz Gerencia, etc."
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Descripción (opcional)</label>
                        <input type="text" value={cloneDesc} onChange={(e) => setCloneDesc(e.target.value)}
                            placeholder="Ej: Voz masculina, tono profesional"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Archivos de audio de referencia</label>
                        <input
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.ogg"
                            multiple
                            onChange={(e) => setCloneFiles(Array.from(e.target.files || []))}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 file:text-xs file:font-semibold"
                        />
                        {cloneFiles.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {cloneFiles.map((f, i) => (
                                    <p key={i} className="text-xs text-gray-500">📎 {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)</p>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleCloneVoice} disabled={cloning || !isConfigured}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-violet-700 disabled:opacity-50 transition-all">
                        {cloning ? '⏳ Clonando voz... (puede tardar)' : '🧬 Clonar Voz'}
                    </button>
                </CardContent>
            </Card>

            {/* Voices list */}
            {voices.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">🗣️ Voces disponibles ({voices.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                            {voices.map(v => (
                                <div key={v.voice_id}
                                    className={`px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${voiceId === v.voice_id ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                    <button onClick={() => setVoiceId(v.voice_id)} className="flex-1 text-left">
                                        <p className="font-medium">{v.name}</p>
                                        <p className="text-[10px] opacity-60">{v.category} {voiceId === v.voice_id && '✓ seleccionada'}</p>
                                    </button>
                                    {v.category === 'cloned' && (
                                        <button onClick={() => handleDeleteVoice(v.voice_id, v.name)}
                                            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 ml-2"
                                            title="Eliminar voz clonada">
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
