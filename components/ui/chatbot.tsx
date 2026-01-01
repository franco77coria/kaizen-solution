'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles, Loader2, User, Phone } from 'lucide-react'
import { Button } from './button'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

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
    const [leadData, setLeadData] = useState({ name: '', whatsapp: '' })
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
            inputRef.current.focus()
        }
    }, [isOpen])

    const saveLead = async () => {
        if (!leadData.name || !leadData.whatsapp) {
            alert('Por favor completá tu nombre y WhatsApp')
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
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `¡Perfecto, ${leadData.name}! 🎉 Guardé tus datos. Pronto alguien del equipo se va a comunicar con vos al ${leadData.whatsapp}. ¿Hay algo más en lo que pueda ayudarte mientras tanto?`,
                    timestamp: new Date()
                }])
                setLeadData({ name: '', whatsapp: '' })
            }
        } catch (error) {
            console.error('Error saving lead:', error)
            alert('Hubo un problema al guardar tus datos. Intentá de nuevo.')
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            role: 'user',
            content: input,
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

            if (!response.ok) throw new Error('Failed to get response')

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            let assistantMessage: Message = {
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

                // Check if we should ask for contact info (after 3+ messages and not already asked)
                if (messages.length >= 5 && !showLeadForm && !leadData.name) {
                    // Trigger lead form after a brief delay
                    setTimeout(() => {
                        setShowLeadForm(true)
                    }, 2000)
                }
            }
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Disculpá, tuve un problema. ¿Podés intentar de nuevo?',
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
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
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            size="lg"
                            className="relative h-16 w-16 rounded-full bg-gradient-to-br from-egyptian via-azure to-tiffany shadow-2xl hover:shadow-tiffany/50 transition-all duration-300 group overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-daylight-sky/20 to-turquoise/20 animate-pulse" />
                            <MessageCircle className="relative z-10 h-7 w-7 text-white group-hover:scale-110 transition-transform" />
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 rounded-full border-2 border-white"
                            />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.8 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 right-6 z-50 w-[420px] h-[650px] flex flex-col"
                    >
                        <div className="relative h-full rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 shadow-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-egyptian/5 via-tiffany/5 to-azure/5 animate-gradient" />

                            {/* Floating particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 bg-tiffany/30 rounded-full"
                                        animate={{
                                            x: [0, 100, 0],
                                            y: [0, -100, 0],
                                            opacity: [0, 1, 0]
                                        }}
                                        transition={{
                                            duration: 3 + i,
                                            repeat: Infinity,
                                            delay: i * 0.5
                                        }}
                                        style={{
                                            left: `${20 + i * 15}%`,
                                            top: `${30 + i * 10}%`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Header */}
                            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-egyptian to-azure">
                                <div className="flex items-center space-x-3">
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 4 }}
                                        className="relative"
                                    >
                                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center overflow-hidden">
                                            <Sparkles className="h-6 w-6 text-tiffany" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
                                    </motion.div>

                                    <div>
                                        <h3 className="font-heading font-bold text-white text-lg">KaiBot</h3>
                                        <p className="text-xs text-white/80">Asistente de Kaizen Solution</p>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => setIsOpen(false)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Messages */}
                            <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-tiffany/20 scrollbar-track-transparent">
                                {messages.map((message, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                                    ? 'bg-gradient-to-br from-egyptian to-azure text-white'
                                                    : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 text-slate-800 dark:text-white'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Lead Capture Form */}
                                {showLeadForm && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="bg-gradient-to-br from-egyptian/10 to-tiffany/10 backdrop-blur-sm border-2 border-tiffany/30 rounded-2xl p-4 space-y-3"
                                    >
                                        <div className="flex items-center space-x-2 text-egyptian dark:text-tiffany">
                                            <Sparkles className="h-5 w-5" />
                                            <p className="font-semibold text-sm">¡Me encantaría ayudarte más!</p>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            Dejame tus datos y alguien del equipo se va a comunicar con vos para darte una solución personalizada:
                                        </p>

                                        <div className="space-y-2">
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-egyptian/50" />
                                                <input
                                                    type="text"
                                                    placeholder="Tu nombre"
                                                    value={leadData.name}
                                                    onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-tiffany/30 focus:border-tiffany focus:ring-2 focus:ring-tiffany/20 outline-none text-sm"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-egyptian/50" />
                                                <input
                                                    type="tel"
                                                    placeholder="WhatsApp (ej: +57 300 1234567)"
                                                    value={leadData.whatsapp}
                                                    onChange={(e) => setLeadData({ ...leadData, whatsapp: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-tiffany/30 focus:border-tiffany focus:ring-2 focus:ring-tiffany/20 outline-none text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <Button
                                                onClick={saveLead}
                                                className="flex-1 bg-gradient-to-r from-egyptian to-azure hover:shadow-lg text-white text-sm py-2"
                                            >
                                                Enviar
                                            </Button>
                                            <Button
                                                onClick={() => setShowLeadForm(false)}
                                                variant="ghost"
                                                className="text-sm py-2"
                                            >
                                                Después
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                                            <div className="flex space-x-2">
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                                    className="w-2 h-2 bg-tiffany rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                                    className="w-2 h-2 bg-azure rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                                    className="w-2 h-2 bg-egyptian rounded-full"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="relative z-10 p-4 border-t border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                <div className="flex items-end space-x-2">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Escribí tu mensaje..."
                                            disabled={isLoading}
                                            className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/20 focus:border-tiffany/50 focus:ring-2 focus:ring-tiffany/20 outline-none transition-all disabled:opacity-50 text-sm"
                                        />
                                    </div>
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="h-12 w-12 rounded-2xl bg-gradient-to-br from-egyptian to-azure hover:shadow-lg hover:shadow-tiffany/30 transition-all disabled:opacity-50 flex-shrink-0"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
