'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

// Minimal SVG Icons
const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
)

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
)

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
)

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
)

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
)

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: '¡Hola! Soy KaiBot 👋 ¿En qué puedo ayudarte hoy?',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showLeadForm, setShowLeadForm] = useState(false)
    const [showQuickActions, setShowQuickActions] = useState(true)
    const [leadData, setLeadData] = useState({ name: '', whatsapp: '' })
    const [leadSaved, setLeadSaved] = useState(false)
    const [conversationSummary, setConversationSummary] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, showLeadForm])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    // Prevent body scroll when chat is open on mobile
    useEffect(() => {
        if (isOpen) {
            const isMobile = window.innerWidth < 640
            if (isMobile) {
                document.body.style.overflow = 'hidden'
            }
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const quickActions = [
        { label: 'Hablar con Ventas', action: () => handleQuickAction('Quiero hablar con el equipo de ventas') },
        { label: 'Ver Servicios', action: () => handleQuickAction('¿Qué servicios ofrecen?') },
        { label: 'Consultar Precios', action: () => handleQuickAction('¿Cuánto cuestan sus servicios?') },
    ]

    const handleQuickAction = (message: string) => {
        setShowQuickActions(false)
        setInput(message)
        setTimeout(() => sendMessage(message), 100)
    }

    const saveLead = async () => {
        if (!leadData.name.trim() || !leadData.whatsapp.trim()) {
            return
        }

        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: leadData.name,
                    whatsapp: leadData.whatsapp,
                    conversationSummary: conversationSummary || 'Conversación general sobre servicios'
                })
            })

            if (response.ok) {
                setShowLeadForm(false)
                setLeadSaved(true)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `¡Perfecto, ${leadData.name}! 🎉 Guardé tus datos. Pronto alguien del equipo se va a comunicar con vos al ${leadData.whatsapp}. ¿Hay algo más en lo que pueda ayudarte?`,
                    timestamp: new Date()
                }])
            } else {
                // If API fails, offer WhatsApp as fallback
                setShowLeadForm(false)
                const message = encodeURIComponent(`Hola soy ${leadData.name}, estuve chateando con KaiBot y me interesa saber más sobre sus servicios.`)
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Tuve un problemita guardando tus datos, pero no te preocupes. Podés contactarnos directamente por WhatsApp 👇`,
                    timestamp: new Date()
                }])
                setTimeout(() => {
                    window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
                }, 1500)
            }
        } catch {
            setShowLeadForm(false)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'No pude guardar tus datos en este momento, pero podés contactarnos directamente por WhatsApp al +54 9 11 6351-5966. ¡Te estamos esperando! 😊',
                timestamp: new Date()
            }])
        }
    }

    const sendMessage = async (customMessage?: string) => {
        const messageToSend = customMessage || input
        if (!messageToSend.trim() || isLoading) return

        const userMessage: Message = {
            role: 'user',
            content: messageToSend,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        // Update conversation summary for lead capture
        const conversationText = [...messages, userMessage]
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' | ')
        setConversationSummary(conversationText.substring(0, 500))

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMessage])

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value)
                    assistantMessage.content += chunk

                    setMessages(prev => {
                        const newMessages = [...prev]
                        newMessages[newMessages.length - 1] = { ...assistantMessage }
                        return newMessages
                    })
                }

                // Trigger lead form after 3+ user messages (only once)
                const userMsgCount = [...messages, userMessage].filter(m => m.role === 'user').length
                if (userMsgCount >= 3 && !showLeadForm && !leadSaved) {
                    setTimeout(() => setShowLeadForm(true), 2500)
                }
            }
        } catch (error) {
            console.error('Chat error:', error)
            // Fallback response when API is unavailable
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Disculpá, en este momento no puedo responder. Pero podés contactarnos directamente:\n\n📱 WhatsApp ARG: +54 9 11 6351-5966\n📱 WhatsApp COL: +57 321 205 0514\n📧 Email: gerencia@kaizensolutionscol.com\n\n¡Estamos para ayudarte!',
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 h-14 w-14 rounded-full bg-[#0a0f1e] text-daylight-sky shadow-2xl shadow-daylight-sky/10 hover:shadow-daylight-sky/20 hover:scale-105 transition-all duration-300 flex items-center justify-center border border-white/10"
                        aria-label="Abrir chat"
                    >
                        <BotIcon />
                        <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                            className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-tiffany rounded-full border-2 border-white"
                        />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="fixed z-50
                            inset-0 sm:inset-auto
                            sm:bottom-8 sm:right-8
                            sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100vh-80px)]
                            flex flex-col"
                    >
                        <div className="relative h-full sm:rounded-2xl bg-white shadow-2xl shadow-gray-200/50 flex flex-col overflow-hidden border border-gray-100 sm:border-gray-200">

                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white safe-area-top">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-9 w-9 rounded-xl bg-[#0a0f1e] flex items-center justify-center text-daylight-sky">
                                            <BotIcon />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-tiffany rounded-full border-2 border-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-heading font-bold text-egyptian text-sm">KaiBot</h3>
                                        <p className="text-[11px] text-slate">Asistente de Kaizen Solution</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate hover:text-egyptian hover:bg-gray-50 rounded-lg h-8 w-8 flex items-center justify-center transition-colors"
                                    aria-label="Cerrar chat"
                                >
                                    <CloseIcon />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 scrollbar-thin">
                                {messages.map((message, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.role === 'user'
                                                ? 'bg-[#0a0f1e] text-white'
                                                : 'bg-white border border-gray-100 text-outer-space shadow-sm'
                                                }`}
                                        >
                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-white/40' : 'text-slate/40'}`}>
                                                {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Quick Actions */}
                                {showQuickActions && messages.length === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2 pt-1"
                                    >
                                        <p className="text-[11px] text-slate font-medium">Acciones rápidas:</p>
                                        <div className="flex flex-col gap-1.5">
                                            {quickActions.map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={action.action}
                                                    className="text-left px-4 py-2.5 bg-white border border-gray-100 rounded-xl hover:border-daylight-sky/30 hover:bg-daylight-sky/5 transition-all text-[13px] text-outer-space shadow-sm"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Lead Capture Form */}
                                {showLeadForm && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="bg-gradient-to-br from-daylight-sky/5 to-tiffany/5 border border-daylight-sky/15 rounded-2xl p-4 space-y-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-[13px] text-egyptian">¡Me encantaría ayudarte más!</p>
                                            <p className="text-[11px] text-slate mt-1">
                                                Dejame tus datos y alguien del equipo se va a comunicar con vos:
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40">
                                                    <UserIcon />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Tu nombre"
                                                    value={leadData.name}
                                                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none text-[13px] transition-all"
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40">
                                                    <PhoneIcon />
                                                </div>
                                                <input
                                                    type="tel"
                                                    placeholder="WhatsApp (ej: +54 9 11 1234-5678)"
                                                    value={leadData.whatsapp}
                                                    onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none text-[13px] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveLead}
                                                disabled={!leadData.name.trim() || !leadData.whatsapp.trim()}
                                                className="flex-1 bg-[#0a0f1e] text-white text-[13px] font-medium py-2.5 rounded-xl hover:bg-egyptian transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Enviar
                                            </button>
                                            <button
                                                onClick={() => setShowLeadForm(false)}
                                                className="text-[13px] text-slate hover:text-egyptian px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                                            >
                                                Después
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Loading */}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                                            <div className="flex gap-1.5">
                                                {[0, 0.15, 0.3].map((delay, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                                                        transition={{ repeat: Infinity, duration: 0.9, delay }}
                                                        className="w-1.5 h-1.5 bg-daylight-sky rounded-full"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t border-gray-100 bg-white safe-area-bottom">
                                <div className="flex items-end gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribí tu mensaje..."
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all disabled:opacity-50 text-[13px]"
                                    />
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() || isLoading}
                                        className="h-10 w-10 rounded-xl bg-[#0a0f1e] text-white hover:bg-egyptian transition-all disabled:opacity-30 flex items-center justify-center flex-shrink-0"
                                        aria-label="Enviar mensaje"
                                    >
                                        <SendIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
