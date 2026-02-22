'use client'

import { useEffect, useState, useRef } from 'react'

interface Message {
    id: string
    messageId: string | null
    direction: string
    phone: string
    contactName: string | null
    content: string
    type: string
    status: string
    isRead: boolean
    timestamp: string
}

interface Contact {
    phone: string
    name: string | null
    lastMessageAt: string | null
    totalMessages: number
}

export default function MensajesPage() {
    const [conversations, setConversations] = useState<Contact[]>([])
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [chatLoading, setChatLoading] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')
    const [isAudioMode, setIsAudioMode] = useState(false)
    const [voices, setVoices] = useState<{ voice_id: string, name: string }[]>([])
    const [selectedVoice, setSelectedVoice] = useState<string>('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
    const [newChatPhone, setNewChatPhone] = useState('')

    // Plantillas (Para conversaciones vacías o iniciales)
    const [templates, setTemplates] = useState<{ id: string, name: string, language: string, bodyText: string }[]>([])
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState('')

    const chatEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadConversations()
        loadVoices()
        loadTemplates()
    }, [])

    useEffect(() => {
        if (selectedPhone) loadMessages(selectedPhone)
    }, [selectedPhone])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const loadConversations = async () => {
        try {
            const res = await fetch('/api/whatsapp/contacts')
            const data = await res.json()
            setConversations(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const loadVoices = async () => {
        try {
            const res = await fetch('/api/elevenlabs/voices')
            const data = await res.json()
            if (data.success && data.voices?.length > 0) {
                setVoices(data.voices)
                setSelectedVoice(data.voices[0].voice_id)
            }
        } catch (e) {
            console.error("No se pudieron cargar voces", e)
        }
    }

    const loadTemplates = async () => {
        try {
            const res = await fetch('/api/whatsapp/templates')
            const data = await res.json()
            setTemplates(data.filter((t: any) => t.status === 'APPROVED'))
        } catch (e) {
            console.error('Error loading templates', e)
        }
    }

    const loadMessages = async (phone: string) => {
        setChatLoading(true)
        try {
            const res = await fetch(`/api/whatsapp/messages?phone=${phone}&limit=100`)
            const data = await res.json()
            setMessages(data.reverse())

            // Mark as read
            await fetch('/api/whatsapp/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            })
        } catch (e) {
            console.error(e)
        } finally {
            setChatLoading(false)
        }
    }

    const handleReply = async () => {
        if ((!replyText.trim() && !selectedFile) || !selectedPhone || sending) return

        if (isAudioMode && !selectedVoice) {
            alert('Por favor selecciona una voz primero')
            return
        }

        if (selectedFile && isAudioMode) {
            alert('No puedes enviar un archivo adjunto y un Audio IA al mismo tiempo.');
            return;
        }

        setSending(true)
        try {
            let res;
            if (isAudioMode) {
                res = await fetch('/api/whatsapp/send-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: selectedPhone,
                        text: replyText,
                        voiceId: selectedVoice
                    }),
                })
            } else if (selectedFile) {
                const formData = new FormData()
                formData.append("numero", selectedPhone)
                formData.append("file", selectedFile)
                if (replyText) formData.append("text", replyText)

                res = await fetch('/api/whatsapp/send-media', {
                    method: 'POST',
                    body: formData,
                })
            } else {
                res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tipo: 'texto',
                        numero: selectedPhone,
                        mensaje: replyText,
                    }),
                })
            }

            const data = await res.json()
            if (data.success) {
                setReplyText('')
                setSelectedFile(null)
                loadMessages(selectedPhone)
            } else {
                alert(data.error || 'Error al enviar')
            }
        } catch (e) {
            alert('Error al enviar')
        } finally {
            setSending(false)
        }
    }

    const sendManualTemplate = async () => {
        if (!selectedPhone || !selectedTemplate) return
        setSending(true)
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'plantilla',
                    numero: selectedPhone,
                    mensaje: selectedTemplate, // selectedTemplate guarda el string 'name' de la plantilla
                }),
            })

            const data = await res.json()
            if (data.success) {
                setIsTemplateModalOpen(false)
                setSelectedTemplate('')
                loadMessages(selectedPhone)
            } else {
                alert(data.error || 'Error enviando la plantilla oficial')
            }
        } catch (e) {
            alert('Error de conexión al enviar plantilla')
        } finally {
            setSending(false)
        }
    }

    const startNewChat = () => {
        if (!newChatPhone.trim()) return;
        // Limpiamos el número de posibles espacios o + 
        const cleanPhone = newChatPhone.replace(/\D/g, '');
        setSelectedPhone(cleanPhone);
        setIsNewChatModalOpen(false);
        setNewChatPhone('');
    }

    const filtered = conversations.filter((c) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (c.name?.toLowerCase().includes(q) || c.phone.includes(q))
    })

    const selectedContact = conversations.find(c => c.phone === selectedPhone)

    return (
        <div className="flex h-[calc(100vh-0px)] relative">
            {/* Conversation list */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col z-10">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-gray-900">Mensajes</h2>
                        <button
                            onClick={() => setIsNewChatModalOpen(true)}
                            className="w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                            title="Nueva Conversación"
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar conversación..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-400 px-4">
                            {search ? 'Sin resultados' : 'No hay conversaciones'}
                        </div>
                    ) : (
                        filtered.map((c) => (
                            <button
                                key={c.phone}
                                onClick={() => setSelectedPhone(c.phone)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedPhone === c.phone ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                        {getInitials(c.name || c.phone)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {c.name || formatPhone(c.phone)}
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            {c.totalMessages} mensaje{c.totalMessages !== 1 ? 's' : ''} · {formatTime(c.lastMessageAt)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {!selectedPhone ? (
                    <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">💬</div>
                            <p className="text-sm text-gray-500 font-medium">Seleccioná una conversación</p>
                            <p className="text-xs text-gray-400 mt-1">Elegí un contacto de la lista para ver el chat</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                                    {getInitials(selectedContact?.name || selectedPhone)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        {selectedContact?.name || formatPhone(selectedPhone)}
                                    </h3>
                                    <p className="text-[11px] text-gray-400">+{selectedPhone}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-md transition-colors border border-amber-200"
                                title="Enviar mensaje oficial pre-aprobado (Regla 24h)"
                            >
                                ⚡ Enviar Plantilla Oficial
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {chatLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 mt-12">No hay mensajes</div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${msg.direction === 'outbound'
                                                ? 'bg-green-500 text-white rounded-br-md'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'
                                                }`}>
                                                {formatMessageTime(msg.timestamp)}
                                                {msg.direction === 'outbound' && (
                                                    <span className="ml-2">
                                                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Reply input */}
                        <div className="px-6 py-4 bg-white border-t border-gray-200">
                            {isAudioMode && (
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">Modo Audio IA Activado 🎙️</span>
                                    {voices.length > 0 ? (
                                        <select
                                            value={selectedVoice}
                                            onChange={(e) => setSelectedVoice(e.target.value)}
                                            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none text-gray-700 max-w-[200px]"
                                        >
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-xs text-amber-600">No hay voces configuradas</span>
                                    )}
                                </div>
                            )}
                            {selectedFile && (
                                <div className="mb-2 bg-blue-50/50 border border-blue-100 rounded-lg p-2 px-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📎</span>
                                        <span className="text-sm text-blue-800 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                                        <span className="text-xs text-blue-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 font-bold p-1">×</button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0])
                                    }}
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Adjuntar archivo"
                                    disabled={isAudioMode || sending}
                                    className="w-10 flex-shrink-0 flex items-center justify-center rounded-xl border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    📎
                                </button>
                                <button
                                    onClick={() => setIsAudioMode(!isAudioMode)}
                                    title={isAudioMode ? "Cambiar a Texto" : "Cambiar a Audio IA"}
                                    className={`w-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors ${isAudioMode ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    {isAudioMode ? '🎙️' : '⌨️'}
                                </button>
                                <input
                                    type="text"
                                    placeholder={isAudioMode ? "Escribí el texto que la IA narrará (se enviará como nota de voz)..." : "Escribir mensaje... (solo funciona en ventana 24h)"}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                    className={`flex-1 px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none transition-colors ${isAudioMode ? 'border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400' : 'border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-400'}`}
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={sending || (!replyText.trim() && !selectedFile) || (isAudioMode && !selectedVoice)}
                                    className={`px-5 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isAudioMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-500 hover:bg-green-600'}`}
                                >
                                    {sending ? '...' : (isAudioMode ? 'Narrar y Enviar' : 'Enviar')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Nueva Conversación */}
            {isNewChatModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Nueva Conversación</h3>
                            <button onClick={() => setIsNewChatModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de WhatsApp (con código de país)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 54911223344"
                                    value={newChatPhone}
                                    onChange={(e) => setNewChatPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={startNewChat}
                                disabled={!newChatPhone.trim()}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                                Abrir Carpeta de Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Plantillas Rápidas (Para iniciar chats) */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-amber-200 bg-amber-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-amber-900 flex items-center gap-2">⚡ Enviar Plantilla (Regla 24h)</h3>
                                <p className="text-xs text-amber-700/80 mt-1">Usa esto si Meta te rechaza mensajes libres porque el cliente no te contactó recientemente.</p>
                            </div>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-amber-500 hover:text-amber-700">✕</button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona un modelo oficial aprobado:</label>
                                <select
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                >
                                    <option value="" disabled>-- Elige una Plantilla --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTemplate && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Previsualización del texto a enviar:</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {templates.find(t => t.name === selectedTemplate)?.bodyText || 'Sin contenido'}
                                    </p>
                                </div>
                            )}

                            <p className="text-[11px] text-gray-400 italic">
                                Nota: Si tu plantilla seleccionada posee variables dinámicas (como "Hola {"{{"}1{"}}"}"), este envío inicial rápido podría fallar ya que Meta espera que le pases las variables exactas por Campañas Masivas. Escoge preferiblemente modelos estáticos para envío manual rápido.
                            </p>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button
                                onClick={() => setIsTemplateModalOpen(false)}
                                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={sendManualTemplate}
                                disabled={!selectedTemplate || sending}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {sending ? 'Enviando...' : 'Despachar Plantilla'}
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

function formatTime(d: string | null): string {
    if (!d) return ''
    const dt = new Date(d)
    const now = new Date()
    const diff = now.getTime() - dt.getTime()
    if (diff < 60000) return 'ahora'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'min'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h'
    return dt.getDate() + '/' + (dt.getMonth() + 1)
}

function formatMessageTime(d: string): string {
    if (!d) return ''
    const dt = new Date(d)
    return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
}
