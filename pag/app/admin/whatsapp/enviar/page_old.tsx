'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Template {
    name: string
    language: string
    category: string
    status: string
}

interface WindowContact {
    id: string
    phone: string
    name: string | null
    hasWindow: boolean
    windowEnd: string | null
    lastMessageAt: string | null
}

interface Voice {
    voice_id: string
    name: string
    category: string
}

interface BulkResult {
    numero: string
    success: boolean
    error?: string
}

export default function EnviarPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [contacts, setContacts] = useState<WindowContact[]>([])
    const [voices, setVoices] = useState<Voice[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [loadingContacts, setLoadingContacts] = useState(true)
    const [loadingVoices, setLoadingVoices] = useState(false)

    // Template form (single)
    const [tPhone, setTPhone] = useState('')
    const [tTemplate, setTTemplate] = useState('')
    const [tLang, setTLang] = useState('es')
    const [sendingTemplate, setSendingTemplate] = useState(false)

    // Bulk form
    const [bulkNumbers, setBulkNumbers] = useState('')
    const [bulkTemplate, setBulkTemplate] = useState('')
    const [bulkLang, setBulkLang] = useState('es')
    const [sendingBulk, setSendingBulk] = useState(false)
    const [bulkProgress, setBulkProgress] = useState<{ total: number; enviados: number; errores: number; detalles: BulkResult[] } | null>(null)

    // Free text form
    const [fPhone, setFPhone] = useState('')
    const [fMessage, setFMessage] = useState('')
    const [sendingText, setSendingText] = useState(false)

    // Audio form
    const [audioText, setAudioText] = useState('')
    const [audioPhone, setAudioPhone] = useState('')
    const [audioVoice, setAudioVoice] = useState('')
    const [audioPreview, setAudioPreview] = useState<string | null>(null)
    const [generatingAudio, setGeneratingAudio] = useState(false)
    const [sendingAudio, setSendingAudio] = useState(false)
    const [audioVars, setAudioVars] = useState<Record<string, string>>({})


    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [activeTab, setActiveTab] = useState<'template' | 'bulk' | 'text' | 'audio'>('template')

    useEffect(() => {
        loadTemplates()
        loadContacts()
    }, [])

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const loadTemplates = async () => {
        setLoadingTemplates(true)
        try {
            const res = await fetch('/api/whatsapp/templates')
            const data = await res.json()
            if (data.success) setTemplates(data.templates)
            else showToast(data.error || 'Error al cargar templates', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setLoadingTemplates(false) }
    }

    const loadContacts = async () => {
        try {
            const res = await fetch('/api/whatsapp/contacts')
            const data = await res.json()
            setContacts(data.filter((c: WindowContact) => c.hasWindow))
        } catch { } finally { setLoadingContacts(false) }
    }

    const loadVoices = async () => {
        setLoadingVoices(true)
        try {
            const res = await fetch('/api/elevenlabs/voices')
            const data = await res.json()
            if (data.success) setVoices(data.voices)
            else showToast(data.error || 'ElevenLabs no configurado', 'err')
        } catch { showToast('Error al cargar voces', 'err') }
        finally { setLoadingVoices(false) }
    }

    // Single template send
    const handleSendTemplate = async () => {
        if (!tPhone || !tTemplate) return showToast('Completá número y template', 'err')
        setSendingTemplate(true)
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'template', numero: tPhone, template: tTemplate, idioma: tLang }),
            })
            const data = await res.json()
            if (data.success) { showToast('✅ Template enviado'); setTPhone('') }
            else showToast(data.error || 'Error al enviar', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setSendingTemplate(false) }
    }

    // Bulk template send
    const handleSendBulk = async () => {
        if (!bulkTemplate) return showToast('Seleccioná un template', 'err')
        const nums = bulkNumbers.split('\n').map(n => n.trim()).filter(n => n.length > 0)
        if (nums.length === 0) return showToast('Ingresá al menos un número', 'err')

        if (!confirm(`¿Enviar template "${bulkTemplate}" a ${nums.length} números?`)) return

        setSendingBulk(true)
        setBulkProgress(null)
        try {
            const res = await fetch('/api/whatsapp/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: bulkTemplate, idioma: bulkLang, numeros: nums }),
            })
            const data = await res.json()
            if (data.success) {
                setBulkProgress({ total: data.total, enviados: data.enviados, errores: data.errores, detalles: data.detalles })
                showToast(`✅ ${data.enviados}/${data.total} enviados`)
            } else showToast(data.error || 'Error en envío masivo', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setSendingBulk(false) }
    }

    // Free text send
    const handleSendText = async () => {
        if (!fPhone || !fMessage.trim()) return showToast('Seleccioná contacto y escribí el mensaje', 'err')
        setSendingText(true)
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'texto', numero: fPhone, mensaje: fMessage }),
            })
            const data = await res.json()
            if (data.success) { showToast('✅ Mensaje enviado'); setFMessage('') }
            else showToast(data.error || 'Error al enviar', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setSendingText(false) }
    }

    // Resolve template variables in audio text
    const resolveVars = (text: string): string => {
        let result = text
        for (const [key, value] of Object.entries(audioVars)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value || `{${key}}`)
        }
        return result
    }

    // Detect variables in audioText
    const detectedVars = (() => {
        const matches = audioText.match(/\{(\w+)\}/g)
        if (!matches) return [] as string[]
        return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))))
    })()

    const resolvedAudioText = resolveVars(audioText)

    // Audio preview
    const handlePreviewAudio = async () => {
        if (!audioText.trim()) return showToast('Escribí el texto para el audio', 'err')
        setGeneratingAudio(true)
        try {
            const res = await fetch('/api/elevenlabs/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: resolvedAudioText, voiceId: audioVoice || undefined }),
            })
            const data = await res.json()
            if (data.success) {
                setAudioPreview(`data:audio/mpeg;base64,${data.audio}`)
                showToast(`✅ Audio generado (${data.characterCount} chars, ~$${data.estimatedCost})`)
            } else showToast(data.error || 'Error al generar audio', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setGeneratingAudio(false) }
    }

    // Audio send
    const handleSendAudio = async () => {
        if (!audioPhone || !audioText.trim()) return showToast('Completá número y texto', 'err')
        setSendingAudio(true)
        try {
            const res = await fetch('/api/whatsapp/send-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numero: audioPhone, text: resolvedAudioText, voiceId: audioVoice || undefined }),
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Audio enviado por WhatsApp')
                setAudioText('')
                setAudioPreview(null)
                setAudioVars({})
            } else showToast(data.error || 'Error al enviar audio', 'err')
        } catch { showToast('Error de conexión', 'err') }
        finally { setSendingAudio(false) }
    }

    // CSV upload handler
    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n').map(l => l.trim()).filter(l => l)
            // Extract first column (phone numbers), skip header if non-numeric
            const numbers = lines
                .map(l => l.split(',')[0].replace(/[^0-9]/g, '').trim())
                .filter(n => n.length >= 10)
            setBulkNumbers(numbers.join('\n'))
            showToast(`📋 ${numbers.length} números cargados del CSV`)
        }
        reader.readAsText(file)
    }

    const tabs = [
        { id: 'template' as const, label: '📋 Template', desc: 'Envío individual' },
        { id: 'bulk' as const, label: '📢 Masivo', desc: 'A múltiples números' },
        { id: 'text' as const, label: '💬 Texto', desc: 'Ventana 24h' },
        { id: 'audio' as const, label: '🎙️ Audio IA', desc: 'ElevenLabs' },
    ]

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Enviar Mensaje</h1>
                <p className="text-sm text-gray-400 mt-1">Templates, envío masivo, texto libre y mensajes de audio IA</p>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id)
                            if (tab.id === 'audio' && voices.length === 0) loadVoices()
                        }}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white shadow-sm text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="block">{tab.label}</span>
                        <span className="block text-[10px] mt-0.5 opacity-60">{tab.desc}</span>
                    </button>
                ))}
            </div>

            {/* Template Tab */}
            {activeTab === 'template' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>📋</span> Enviar Template (Individual)
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-1">Enviá un template aprobado a un número específico.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Número de destino</label>
                            <input type="text" value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="5491123456789 (sin + ni espacios)"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Template</label>
                            <select value={tTemplate} onChange={(e) => setTTemplate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                <option value="">{loadingTemplates ? 'Cargando...' : 'Seleccionar template'}</option>
                                {templates.map(t => <option key={`${t.name}-${t.language}`} value={t.name}>{t.name} ({t.language})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Idioma</label>
                            <select value={tLang} onChange={(e) => setTLang(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                <option value="es">Español</option>
                                <option value="es_AR">Español (AR)</option>
                                <option value="en_US">English (US)</option>
                                <option value="pt_BR">Português (BR)</option>
                            </select>
                        </div>
                        <button onClick={handleSendTemplate} disabled={sendingTemplate}
                            className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors">
                            {sendingTemplate ? 'Enviando...' : '📤 Enviar Template'}
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* Bulk Tab */}
            {activeTab === 'bulk' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>📢</span> Envío Masivo de Templates
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-1">Enviá un template a múltiples números. Pegá los números o subí un CSV.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Template</label>
                            <select value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                <option value="">{loadingTemplates ? 'Cargando...' : 'Seleccionar template'}</option>
                                {templates.map(t => <option key={`bulk-${t.name}-${t.language}`} value={t.name}>{t.name} ({t.language})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Idioma</label>
                            <select value={bulkLang} onChange={(e) => setBulkLang(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                <option value="es">Español</option>
                                <option value="es_AR">Español (AR)</option>
                                <option value="en_US">English (US)</option>
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-gray-600">Números (uno por línea)</label>
                                <label className="text-xs text-green-600 hover:text-green-700 font-medium cursor-pointer">
                                    📁 Subir CSV
                                    <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVUpload} />
                                </label>
                            </div>
                            <textarea
                                value={bulkNumbers}
                                onChange={(e) => setBulkNumbers(e.target.value)}
                                placeholder={"5491123456789\n5491198765432\n573001234567"}
                                rows={8}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 resize-none"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                {bulkNumbers.split('\n').filter(n => n.trim().length >= 10).length} números válidos detectados
                            </p>
                        </div>

                        <button onClick={handleSendBulk} disabled={sendingBulk}
                            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all">
                            {sendingBulk ? '⏳ Enviando... (esto puede tardar)' : `📢 Enviar a ${bulkNumbers.split('\n').filter(n => n.trim().length >= 10).length} números`}
                        </button>

                        {/* Progress/Results */}
                        {bulkProgress && (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-green-700">{bulkProgress.enviados}</p>
                                        <p className="text-xs text-green-600">Enviados</p>
                                    </div>
                                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-red-700">{bulkProgress.errores}</p>
                                        <p className="text-xs text-red-600">Errores</p>
                                    </div>
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-gray-700">{bulkProgress.total}</p>
                                        <p className="text-xs text-gray-600">Total</p>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(bulkProgress.enviados / bulkProgress.total) * 100}%` }} />
                                </div>
                                {/* Error details */}
                                {bulkProgress.detalles.filter(d => !d.success).length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-xs font-medium text-red-700 mb-2">Errores:</p>
                                        {bulkProgress.detalles.filter(d => !d.success).map((d, i) => (
                                            <p key={i} className="text-xs text-red-600">{d.numero}: {d.error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Text Tab */}
            {activeTab === 'text' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>💬</span> Texto Libre
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-1">Solo para contactos que respondieron en las últimas 24hs.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Contactos con ventana abierta</label>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {loadingContacts ? (
                                    <div className="text-center py-6 text-xs text-gray-400">Cargando...</div>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-gray-400 px-4">No hay contactos con ventana 24h abierta</div>
                                ) : contacts.map(c => (
                                    <button key={c.phone} onClick={() => setFPhone(c.phone)}
                                        className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${fPhone === c.phone ? 'bg-green-50' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span className="text-sm text-gray-700">{c.name || c.phone}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{getRemainingTime(c.windowEnd)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Mensaje</label>
                            <textarea value={fMessage} onChange={(e) => setFMessage(e.target.value)} placeholder="Escribí tu mensaje..." rows={4}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 resize-none" />
                        </div>
                        <button onClick={handleSendText} disabled={sendingText || !fPhone}
                            className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors">
                            {sendingText ? 'Enviando...' : '💬 Enviar Texto Libre'}
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* Audio Tab */}
            {activeTab === 'audio' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>🎙️</span> Mensaje de Audio con IA
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-1">Generá un audio con ElevenLabs y envialo por WhatsApp. Usá {'{'}<em>nombre</em>{'}'} para personalizar.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Número de destino</label>
                            <input type="text" value={audioPhone} onChange={(e) => setAudioPhone(e.target.value)} placeholder="5491123456789"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Voz</label>
                            <select value={audioVoice} onChange={(e) => setAudioVoice(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                                <option value="">{loadingVoices ? 'Cargando voces...' : 'Voz por defecto'}</option>
                                {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.category})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Texto a convertir en audio</label>
                            <textarea value={audioText} onChange={(e) => setAudioText(e.target.value)}
                                placeholder={'Hola {nombre}, te saluda Kaizen Solution. Queríamos contarte sobre {servicio}...'}
                                rows={5}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
                            <p className="text-[11px] text-gray-400 mt-1">
                                {audioText.length}/5000 chars — Usá {'{'}<span className="font-mono text-purple-500">nombre</span>{'}'} {'{'}<span className="font-mono text-purple-500">empresa</span>{'}'} etc. para personalizar
                            </p>
                        </div>

                        {/* Template variables */}
                        {detectedVars.length > 0 && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-semibold text-purple-700">🏷️ Variables detectadas:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {detectedVars.map(v => (
                                        <div key={v}>
                                            <label className="block text-[11px] font-medium text-purple-600 mb-1">{`{${v}}`}</label>
                                            <input
                                                type="text"
                                                value={audioVars[v] || ''}
                                                onChange={(e) => setAudioVars(prev => ({ ...prev, [v]: e.target.value }))}
                                                placeholder={`Valor para ${v}`}
                                                className="w-full px-2.5 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {/* Resolved preview */}
                                <div className="bg-white rounded-lg p-3 border border-purple-100">
                                    <p className="text-[10px] uppercase font-semibold text-purple-400 mb-1">Preview del texto final:</p>
                                    <p className="text-sm text-gray-700">{resolvedAudioText}</p>
                                </div>
                            </div>
                        )}

                        {/* Audio preview */}
                        {audioPreview && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="text-xs font-medium text-purple-700 mb-2">🔊 Preview del audio:</p>
                                <audio controls src={audioPreview} className="w-full" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handlePreviewAudio} disabled={generatingAudio || !audioText.trim()}
                                className="py-3 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors">
                                {generatingAudio ? '⏳ Generando...' : '🔊 Preview Audio'}
                            </button>
                            <button onClick={handleSendAudio} disabled={sendingAudio || !audioPhone || !audioText.trim()}
                                className="py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all">
                                {sendingAudio ? '⏳ Enviando...' : '📤 Enviar Audio'}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function getRemainingTime(windowEnd: string | null): string {
    if (!windowEnd) return ''
    const end = new Date(windowEnd)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return 'expirado'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${mins}min`
}
