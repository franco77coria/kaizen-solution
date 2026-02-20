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

export default function EnviarPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [contacts, setContacts] = useState<WindowContact[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)
    const [loadingContacts, setLoadingContacts] = useState(true)

    // Template form
    const [tPhone, setTPhone] = useState('')
    const [tTemplate, setTTemplate] = useState('')
    const [tLang, setTLang] = useState('es')
    const [sendingTemplate, setSendingTemplate] = useState(false)

    // Free text form 
    const [fPhone, setFPhone] = useState('')
    const [fMessage, setFMessage] = useState('')
    const [sendingText, setSendingText] = useState(false)

    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

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
            if (data.success) {
                setTemplates(data.templates)
            } else {
                showToast(data.error || 'Error al cargar templates', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setLoadingTemplates(false)
        }
    }

    const loadContacts = async () => {
        try {
            const res = await fetch('/api/whatsapp/contacts')
            const data = await res.json()
            setContacts(data.filter((c: WindowContact) => c.hasWindow))
        } catch { } finally {
            setLoadingContacts(false)
        }
    }

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
            if (data.success) {
                showToast('✅ Template enviado correctamente')
                setTPhone('')
            } else {
                showToast(data.error || 'Error al enviar', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setSendingTemplate(false)
        }
    }

    const handleSendText = async () => {
        if (!fPhone || !fMessage.trim()) return showToast('Seleccioná un contacto y escribí el mensaje', 'err')
        setSendingText(true)
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'texto', numero: fPhone, mensaje: fMessage }),
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Mensaje enviado')
                setFMessage('')
            } else {
                showToast(data.error || 'Error al enviar', 'err')
            }
        } catch {
            showToast('Error de conexión', 'err')
        } finally {
            setSendingText(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Enviar Mensaje</h1>
                <p className="text-sm text-gray-400 mt-1">Enviá templates a cualquier número o texto libre a contactos con ventana abierta</p>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.msg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template section */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <span>📋</span> Enviar Template
                            </CardTitle>
                            <button onClick={loadTemplates} className="text-xs text-green-600 hover:text-green-700 font-medium">
                                ↻ Recargar
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Podés enviar un template a cualquier número, sin importar si te escribió antes.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Número de destino</label>
                            <input
                                type="text"
                                value={tPhone}
                                onChange={(e) => setTPhone(e.target.value)}
                                placeholder="5491123456789 (sin + ni espacios)"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Template</label>
                            <select
                                value={tTemplate}
                                onChange={(e) => setTTemplate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                            >
                                <option value="">{loadingTemplates ? 'Cargando...' : 'Seleccionar template'}</option>
                                {templates.map((t) => (
                                    <option key={`${t.name}-${t.language}`} value={t.name}>
                                        {t.name} ({t.language})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Idioma</label>
                            <select
                                value={tLang}
                                onChange={(e) => setTLang(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                            >
                                <option value="es">Español</option>
                                <option value="es_AR">Español (AR)</option>
                                <option value="en_US">English (US)</option>
                                <option value="pt_BR">Português (BR)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleSendTemplate}
                            disabled={sendingTemplate}
                            className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                            {sendingTemplate ? 'Enviando...' : '📤 Enviar Template'}
                        </button>
                    </CardContent>
                </Card>

                {/* Free text section */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <span>💬</span> Texto Libre
                            </CardTitle>
                            <button onClick={loadContacts} className="text-xs text-green-600 hover:text-green-700 font-medium">
                                ↻ Actualizar
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Solo podés enviar texto libre a contactos que respondieron en las últimas 24hs.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* 24h contacts */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Contactos con ventana abierta</label>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {loadingContacts ? (
                                    <div className="text-center py-6 text-xs text-gray-400">Cargando...</div>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-gray-400 px-4">
                                        No hay contactos con ventana 24h abierta en este momento
                                    </div>
                                ) : (
                                    contacts.map((c) => (
                                        <button
                                            key={c.phone}
                                            onClick={() => setFPhone(c.phone)}
                                            className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${fPhone === c.phone ? 'bg-green-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                <span className="text-sm text-gray-700">{c.name || c.phone}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {getRemainingTime(c.windowEnd)}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Número seleccionado</label>
                            <input
                                type="text"
                                value={fPhone}
                                readOnly
                                placeholder="Seleccioná un contacto arriba"
                                className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Mensaje</label>
                            <textarea
                                value={fMessage}
                                onChange={(e) => setFMessage(e.target.value)}
                                placeholder="Escribí tu mensaje..."
                                rows={4}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 resize-none"
                            />
                        </div>
                        <button
                            onClick={handleSendText}
                            disabled={sendingText || !fPhone}
                            className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                            {sendingText ? 'Enviando...' : '💬 Enviar Texto Libre'}
                        </button>
                    </CardContent>
                </Card>
            </div>
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
