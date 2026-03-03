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
    unreadCount?: number
    lastMessage?: string
    lastMessageDirection?: string
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

    const [templates, setTemplates] = useState<{ id: string, name: string, language: string, bodyText: string, components: any[] }[]>([])
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})

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
            if (data.success && data.templates) {
                setTemplates(data.templates.filter((t: any) => t.status === 'APPROVED'))
            } else if (Array.isArray(data)) {
                setTemplates(data.filter((t: any) => t.status === 'APPROVED'))
            }
        } catch (e) {
            console.error('Error loading templates', e)
        }
    }

    const loadMessages = async (phone: string) => {
        setChatLoading(true)
        try {
            const res = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phone)}&limit=100`)
            const data = await res.json()
            setMessages(data.reverse())

            await fetch('/api/whatsapp/messages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            })

            setConversations(prev => prev.map(c =>
                c.phone === phone ? { ...c, unreadCount: 0 } : c
            ))
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
            const apiComponents: any[] = []
            const varKeys = Object.keys(templateVariables)

            if (varKeys.length > 0) {
                // Build body component from templateVariables (works for both Meta and Twilio)
                apiComponents.push({
                    type: "body",
                    parameters: varKeys.map(key => ({
                        type: "text",
                        parameter_name: key,
                        text: templateVariables[key] || "..."
                    }))
                })
            }

            // Also handle FLOW buttons from components (Meta only)
            try {
                const parsedComps: any[] = typeof selectedTemplate.components === 'string'
                    ? JSON.parse(selectedTemplate.components)
                    : (selectedTemplate.components || [])
                for (const c of parsedComps) {
                    if (c.type === 'BUTTONS' && c.buttons) {
                        c.buttons.forEach((btn: any, idx: number) => {
                            if (btn.type === 'FLOW') {
                                apiComponents.push({ type: "button", sub_type: "flow", index: String(idx), parameters: [] })
                            }
                        })
                    }
                }
            } catch { }

            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'template',
                    numero: selectedPhone,
                    template: selectedTemplate.name,
                    idioma: selectedTemplate.language,
                    components: apiComponents
                }),
            })

            const data = await res.json()
            if (data.success) {
                setIsTemplateModalOpen(false)
                setSelectedTemplate(null)
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
                            title="Nueva ConversaciÃ³n"
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar conversaciÃ³n..."
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
                        filtered.map((c) => {
                            const unread = c.unreadCount || 0
                            return (
                                <button
                                    key={c.phone}
                                    onClick={() => setSelectedPhone(c.phone)}
                                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedPhone === c.phone ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {getInitials(c.name || c.phone)}
                                            </div>
                                            {unread > 0 && (
                                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-green-500 text-white text-[10px] font-bold rounded-full px-1">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                                                    {c.name || formatPhone(c.phone)}
                                                </p>
                                                <span className={`text-[10px] flex-shrink-0 ml-2 ${unread > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                                                    {formatTime(c.lastMessageAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <p className={`text-[12px] truncate pr-2 ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                                    {c.lastMessageDirection === 'outbound' && (
                                                        <span className="text-gray-400 mr-0.5">Tu: </span>
                                                    )}
                                                    {c.lastMessage || `${c.totalMessages} mensaje${c.totalMessages !== 1 ? 's' : ''}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {!selectedPhone ? (
                    <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">ðŸ’¬</div>
                            <p className="text-sm text-gray-500 font-medium">Selecciona una conversaciÃ³n</p>
                            <p className="text-xs text-gray-400 mt-1">Elige un contacto de la lista para ver el chat</p>
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
                                Enviar Plantilla Oficial
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
                            {chatLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 mt-12">No hay mensajes</div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                                    const showDate = !prevMsg || !isSameDay(msg.timestamp, prevMsg.timestamp)

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="flex justify-center my-3">
                                                    <span className="text-[11px] text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                                                        {formatDateSeparator(msg.timestamp)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} mb-1`}>
                                                <div
                                                    className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm relative ${msg.direction === 'outbound'
                                                        ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-md'
                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-md shadow-sm'
                                                        }`}
                                                >
                                                    <MessageContent msg={msg} />
                                                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.direction === 'outbound' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        <span className="text-[10px]">{formatMessageTime(msg.timestamp)}</span>
                                                        {msg.direction === 'outbound' && <StatusTicks status={msg.status} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Reply input */}
                        <div className="px-6 py-4 bg-white border-t border-gray-200">
                            {isAudioMode && (
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">Modo Audio IA Activado</span>
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
                                        <span className="text-sm text-blue-800 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                                        <span className="text-xs text-blue-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 font-bold p-1">x</button>
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
                                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                                </button>
                                <button
                                    onClick={() => setIsAudioMode(!isAudioMode)}
                                    title={isAudioMode ? "Cambiar a Texto" : "Cambiar a Audio IA"}
                                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border transition-colors ${isAudioMode ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                </button>
                                <input
                                    type="text"
                                    placeholder={isAudioMode ? "Escribi el texto que la IA narrara..." : "Escribir mensaje..."}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                    className={`flex-1 px-4 py-2.5 bg-gray-50 border rounded-full text-sm focus:outline-none transition-colors ${isAudioMode ? 'border-purple-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400' : 'border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-400'}`}
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={sending || (!replyText.trim() && !selectedFile) || (isAudioMode && !selectedVoice)}
                                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isAudioMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-500 hover:bg-green-600'}`}
                                >
                                    {sending ? (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Nueva ConversaciÃ³n */}
            {isNewChatModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Nueva ConversaciÃ³n</h3>
                            <button onClick={() => setIsNewChatModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NÃºmero de WhatsApp (con cÃ³digo de paÃ­s)</label>
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
                                Abrir Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Plantillas */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-amber-200 bg-amber-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-amber-900">Enviar Plantilla (Regla 24h)</h3>
                                <p className="text-xs text-amber-700/80 mt-1">Usa esto si Meta rechaza mensajes libres porque el cliente no te contactÃ³ recientemente.</p>
                            </div>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="text-amber-500 hover:text-amber-700 text-lg">x</button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Selecciona un modelo oficial aprobado:</label>
                                <select
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                                    value={selectedTemplate?.id || ""}
                                    onChange={(e) => {
                                        const found = templates.find(t => t.id === e.target.value)
                                        setSelectedTemplate(found || null)
                                        const vars: Record<string, string> = {}
                                        if (found) {
                                            try {
                                                const varNames: string[] = JSON.parse((found as any).variables || "[]")
                                                varNames.forEach(v => { vars[v] = "" })
                                            } catch { }
                                        }
                                        setTemplateVariables(vars)
                                    }}
                                >
                                    <option value="" disabled>-- Elige una Plantilla --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTemplate && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">PrevisualizaciÃ³n:</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {selectedTemplate.bodyText || 'Sin contenido'}
                                    </p>
                                </div>
                            )}

                            {selectedTemplate && Object.keys(templateVariables).length > 0 && (
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-2">
                                    <p className="text-xs font-bold text-amber-900 mb-3">Variables requeridas por la plantilla:</p>
                                    <div className="space-y-3">
                                        {Object.keys(templateVariables).map((vKey) => (
                                            <div key={vKey}>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Valor para <span className="text-amber-600 bg-amber-100 px-1 rounded">{vKey}</span></label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-300 p-2 rounded-md text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                    placeholder={`Ej. Nombre, monto...`}
                                                    value={templateVariables[vKey]}
                                                    onChange={(e) => setTemplateVariables({ ...templateVariables, [vKey]: e.target.value })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
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

function MessageContent({ msg }: { msg: Message }) {
    const { type, content } = msg

    if (type === 'template') {
        // Extract template name from content like "[Template: name]"
        const templateName = content.match(/\[Template:\s*(.+?)\]/)?.[1] || content
        return (
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">📋</span>
                <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mb-1">
                        Plantilla
                    </span>
                    <p className="text-sm text-gray-600 mt-0.5 italic">{templateName}</p>
                </div>
            </div>
        )
    }

    if (type === 'image') {
        const caption = content.replace(/^\[(?:Imagen|Archivo:[^\]]*)\]:?\s*/, '').trim()
        return (
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">🖼️</span>
                <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Imagen
                    </span>
                    {caption && <p className="text-sm text-gray-600 mt-1">{caption}</p>}
                </div>
            </div>
        )
    }

    if (type === 'audio') {
        // Extract text from "[Audio IA: "text..."]" or just "[Audio]"
        const audioText = content.match(/\[Audio IA:\s*"(.+?)"\]/)?.[1]
        return (
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">🎵</span>
                <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        {audioText ? 'Audio IA' : 'Audio'}
                    </span>
                    {audioText && <p className="text-sm text-gray-600 mt-1 italic">&quot;{audioText}&quot;</p>}
                </div>
            </div>
        )
    }

    if (type === 'video') {
        return (
            <div className="flex items-center gap-2">
                <span className="text-base">🎬</span>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                    Video
                </span>
            </div>
        )
    }

    if (type === 'document') {
        const filename = content.match(/\[(?:Documento|Archivo):\s*(.+?)\]/)?.[1] || ''
        return (
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">📄</span>
                <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        Documento
                    </span>
                    {filename && <p className="text-sm text-gray-600 mt-0.5 truncate max-w-[200px]">{filename}</p>}
                </div>
            </div>
        )
    }

    if (type === 'sticker') {
        return (
            <div className="flex items-center gap-2">
                <span className="text-2xl">😄</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Sticker</span>
            </div>
        )
    }

    if (type === 'location') {
        const coords = content.match(/\[Ubicación:\s*(.+?)\]/)?.[1] || ''
        return (
            <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">📍</span>
                <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Ubicación
                    </span>
                    {coords && <p className="text-xs text-gray-500 mt-0.5">{coords}</p>}
                </div>
            </div>
        )
    }

    if (type === 'reaction') {
        const emoji = content.match(/\[Reacción:\s*(.+?)\]/)?.[1] || '👍'
        return <span className="text-2xl">{emoji}</span>
    }

    // Default: plain text
    return <p className="whitespace-pre-wrap break-words">{content}</p>
}

function StatusTicks({ status }: { status: string }) {
    if (status === 'read') {
        return (
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178L6.12 6.2 3.809 3.793a.453.453 0 00-.634-.057.465.465 0 00-.058.639L6.12 7.8l.234-.009 4.717-6.822a.457.457 0 000-.316z" fill="#53bdeb" />
                <path d="M14.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178L9.12 6.2 6.809 3.793a.453.453 0 00-.634-.057.465.465 0 00-.058.639L9.12 7.8l.234-.009 4.717-6.822a.457.457 0 000-.316z" fill="#53bdeb" />
            </svg>
        )
    }
    if (status === 'delivered') {
        return (
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178L6.12 6.2 3.809 3.793a.453.453 0 00-.634-.057.465.465 0 00-.058.639L6.12 7.8l.234-.009 4.717-6.822a.457.457 0 000-.316z" fill="#92a58c" />
                <path d="M14.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178L9.12 6.2 6.809 3.793a.453.453 0 00-.634-.057.465.465 0 00-.058.639L9.12 7.8l.234-.009 4.717-6.822a.457.457 0 000-.316z" fill="#92a58c" />
            </svg>
        )
    }
    return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M8.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178L3.12 6.2.809 3.793a.453.453 0 00-.634-.057.465.465 0 00-.058.639L3.12 7.8l.234-.009L8.071.969a.457.457 0 000-.316z" fill="#92a58c" />
        </svg>
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
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min'
    if (diff < 86400000) {
        return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
    }
    if (diff < 604800000) {
        const days = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
        return days[dt.getDay()]
    }
    return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear().toString().slice(-2)
}

function formatMessageTime(d: string): string {
    if (!d) return ''
    const dt = new Date(d)
    return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
}

function isSameDay(a: string, b: string): boolean {
    const da = new Date(a)
    const db = new Date(b)
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function formatDateSeparator(d: string): string {
    const dt = new Date(d)
    const now = new Date()
    const diff = now.getTime() - dt.getTime()
    if (diff < 86400000 && dt.getDate() === now.getDate()) return 'Hoy'
    if (diff < 172800000) return 'Ayer'
    return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear()
}
