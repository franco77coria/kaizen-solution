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
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadConversations()
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
        if (!replyText.trim() || !selectedPhone || sending) return
        setSending(true)
        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'texto',
                    numero: selectedPhone,
                    mensaje: replyText,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setReplyText('')
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

    const filtered = conversations.filter((c) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (c.name?.toLowerCase().includes(q) || c.phone.includes(q))
    })

    const selectedContact = conversations.find(c => c.phone === selectedPhone)

    return (
        <div className="flex h-[calc(100vh-0px)]">
            {/* Conversation list */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900 mb-3">Mensajes</h2>
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
                        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-3">
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
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Escribir mensaje... (solo funciona en ventana 24h)"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={sending || !replyText.trim()}
                                    className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {sending ? '...' : 'Enviar'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
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
