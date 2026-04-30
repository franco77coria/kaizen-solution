'use client'

import { useEffect, useRef } from 'react'

import { motion } from 'framer-motion'
import {
    Brain, Bot, Workflow, Sparkles, LucideIcon,
    MessageSquare, Mic2, Braces, BarChart2, Vote,
    CheckCheck, Zap,
} from 'lucide-react'

const aiFeatures: { icon: LucideIcon; title: string; description: string }[] = [
    {
        icon: Brain,
        title: 'Modelos Predictivos',
        description: 'Análisis avanzado de datos con machine learning para predecir tendencias y optimizar decisiones.',
    },
    {
        icon: Bot,
        title: 'Asistentes Digitales y Bots',
        description: 'Chatbots inteligentes y asistentes virtuales que mejoran la atención al cliente.',
    },
    {
        icon: Workflow,
        title: 'Automatización con IA',
        description: 'Procesos inteligentes que aprenden y se adaptan, reduciendo errores humanos.',
    },
    {
        icon: Sparkles,
        title: 'Integraciones Inteligentes',
        description: 'Conexión de sistemas existentes con capacidades de IA para análisis en tiempo real.',
    },
]

const whatsappFeatures: { icon: LucideIcon; title: string; description: string; tag?: string }[] = [
    {
        icon: MessageSquare,
        title: 'Campañas Masivas',
        description: 'WhatsApp Business API oficial. Envío masivo personalizado con seguimiento de entrega en tiempo real.',
    },
    {
        icon: Mic2,
        title: 'Audio IA con ElevenLabs',
        description: 'Voz sintetizada personalizada por contacto. Cada persona recibe un audio con su nombre y datos específicos.',
        tag: 'ElevenLabs',
    },
    {
        icon: Braces,
        title: 'Variables Dinámicas',
        description: 'Personalización profunda: {nombre}, {municipio}, {candidato} — cualquier variable en el mensaje o audio.',
    },
    {
        icon: BarChart2,
        title: 'CRM + Analytics',
        description: 'Pipeline de leads con estados, historial de conversaciones y métricas de campaña en tiempo real.',
    },
    {
        icon: Vote,
        title: 'Uso Electoral',
        description: 'Mensajes de audio personalizados por votante, recordatorios electorales y activación de redes de testigos.',
        tag: 'Electoral',
    },
    {
        icon: Zap,
        title: 'Dry-Run antes de enviar',
        description: 'Probá la campaña en tu propio número antes de enviar. Cero riesgo de errores masivos.',
    },
]

// Mensajes del mockup de WhatsApp
const mockupMessages = [
    {
        id: 1,
        type: 'campaign',
        text: 'Campaña: Elecciones Cundinamarca 2026',
        time: '9:42 AM',
    },
    {
        id: 2,
        type: 'audio',
        name: 'Mensaje personalizado',
        duration: '0:15',
        time: '9:42 AM',
        status: 'sent',
    },
    {
        id: 3,
        type: 'stats',
        sent: 2847,
        delivered: 2791,
    },
]

export default function AISection() {
    const phoneRef = useRef<HTMLDivElement>(null)
    const messageRefs = useRef<(HTMLDivElement | null)[]>([])
    const waSectionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            ctx = gsap.context(() => {
                // Phone mockup: slide up + leve rotación
                if (phoneRef.current) {
                    gsap.from(phoneRef.current, {
                        y: 70,
                        opacity: 0,
                        rotation: 3,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: phoneRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                    })
                }

                // Mensajes del mockup: entran uno a uno
                messageRefs.current.forEach((msg, i) => {
                    if (!msg) return
                    gsap.from(msg, {
                        x: 24,
                        opacity: 0,
                        duration: 0.5,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: phoneRef.current,
                            start: 'top 70%',
                            toggleActions: 'play none none none',
                        },
                        delay: 0.5 + i * 0.3,
                    })
                })

                // Features list del bloque WhatsApp
                if (waSectionRef.current) {
                    const items = waSectionRef.current.querySelectorAll('.wa-feature-item')
                    gsap.from(items, {
                        opacity: 0,
                        x: -20,
                        stagger: 0.1,
                        duration: 0.6,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: waSectionRef.current,
                            start: 'top 75%',
                            toggleActions: 'play none none none',
                        },
                    })
                }
            })
        }

        initGSAP()

        return () => {
            ctx?.revert()
        }
    }, [])

    const handleConsultar = () => {
        const message = encodeURIComponent("Hola, me interesa consultar sobre soluciones de Inteligencia Artificial")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    const handleWhatsAppDemo = () => {
        const message = encodeURIComponent("Hola, quiero ver una demo del WhatsApp CRM con Audio IA")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <section id="ia" className="bg-[#0a0f1e] text-white relative overflow-hidden">
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-daylight-sky/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28">

                {/* ── Bloque 1: Features de IA ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2 mb-6">
                        Inteligencia Artificial
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
                        Potencia tu Negocio con{' '}
                        <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">IA</span>
                    </h2>
                    <p className="text-lg text-white/50 max-w-2xl mx-auto font-light">
                        Soluciones de inteligencia artificial que transforman datos en decisiones estratégicas
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                    {aiFeatures.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="h-full p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-daylight-sky/20 transition-all duration-500">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-daylight-sky/20 to-tiffany/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                                        <Icon className="text-daylight-sky" size={22} />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mb-28"
                >
                    <button
                        onClick={handleConsultar}
                        className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:scale-[1.02]"
                    >
                        Consultar Soluciones de IA
                    </button>
                </motion.div>

                {/* ── Divisor ── */}
                <div className="border-t border-white/8 mb-24" />

                {/* ── Bloque 2: WhatsApp CRM + ElevenLabs ── */}
                <div ref={waSectionRef}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <span className="inline-block text-sm font-medium tracking-widest uppercase text-tiffany/80 border border-tiffany/20 rounded-full px-5 py-2 mb-6">
                            Plataforma Propia
                        </span>
                        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
                            WhatsApp CRM{' '}
                            <span className="bg-gradient-to-r from-tiffany to-daylight-sky bg-clip-text text-transparent">
                                + Audio IA
                            </span>
                        </h2>
                        <p className="text-lg text-white/50 max-w-2xl mx-auto font-light">
                            Una plataforma ya construida y en producción. Campañas masivas de WhatsApp con mensajes
                            de voz personalizados por cada contacto, usando ElevenLabs.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Features list */}
                        <div className="space-y-5">
                            {whatsappFeatures.map((feature) => {
                                const Icon = feature.icon
                                return (
                                    <div
                                        key={feature.title}
                                        className="wa-feature-item flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tiffany/20 to-daylight-sky/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            <Icon className="text-tiffany" size={17} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                                                {feature.tag && (
                                                    <span className="text-xs text-tiffany bg-tiffany/10 border border-tiffany/20 px-2 py-0.5 rounded-full">
                                                        {feature.tag}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white/45 leading-relaxed">{feature.description}</p>
                                        </div>
                                    </div>
                                )
                            })}

                            <button
                                onClick={handleWhatsAppDemo}
                                className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-tiffany to-daylight-sky text-[#0a0f1e] font-semibold px-7 py-3.5 rounded-full hover:shadow-lg hover:shadow-tiffany/20 transition-all duration-300 hover:scale-[1.02]"
                            >
                                <MessageSquare size={17} />
                                Pedir Demo
                            </button>
                        </div>

                        {/* Phone mockup */}
                        <div ref={phoneRef} className="flex justify-center lg:justify-end">
                            <div className="relative w-72">
                                {/* Glow detrás del phone */}
                                <div className="absolute inset-0 bg-gradient-radial from-tiffany/20 to-transparent blur-2xl scale-110 pointer-events-none" />

                                {/* Marco del teléfono */}
                                <div className="relative bg-[#111827] rounded-[2.5rem] border border-white/15 shadow-2xl overflow-hidden">
                                    {/* Notch */}
                                    <div className="flex justify-center pt-3 pb-2">
                                        <div className="w-20 h-1.5 bg-white/10 rounded-full" />
                                    </div>

                                    {/* WhatsApp header */}
                                    <div className="bg-[#1a2637] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tiffany to-daylight-sky flex items-center justify-center text-xs font-bold text-[#0a0f1e]">
                                            K
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-white">Kaizen Campaign</div>
                                            <div className="text-[10px] text-green-400">En línea</div>
                                        </div>
                                        <div className="ml-auto">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Mensajes */}
                                    <div className="bg-[#0d1520] px-4 py-4 space-y-3 min-h-[220px]">

                                        {/* Mensaje 1: Banner de campaña */}
                                        <div
                                            ref={(el) => { messageRefs.current[0] = el }}
                                            className="bg-[#1a2637] rounded-xl rounded-tl-none p-3 max-w-[90%]"
                                        >
                                            <div className="text-[10px] text-tiffany font-semibold mb-1">
                                                Campaña: Elecciones 2026
                                            </div>
                                            <p className="text-xs text-white/80 leading-relaxed">
                                                Hola <span className="text-tiffany font-medium">{'{nombre}'}</span>, te enviamos tu mensaje personalizado como testigo de mesa.
                                            </p>
                                            <div className="text-[9px] text-white/30 mt-1.5 text-right">9:42 AM</div>
                                        </div>

                                        {/* Mensaje 2: Audio */}
                                        <div
                                            ref={(el) => { messageRefs.current[1] = el }}
                                            className="bg-[#1a2637] rounded-xl rounded-tl-none p-3 max-w-[85%]"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tiffany/30 to-daylight-sky/20 flex items-center justify-center flex-shrink-0">
                                                    <Mic2 className="text-tiffany" size={13} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        {[...Array(12)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="bg-tiffany/50 rounded-full w-0.5"
                                                                style={{ height: `${4 + Math.sin(i * 1.2) * 6}px` }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="text-[9px] text-white/40">0:15 · ElevenLabs AI</div>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-white/30 mt-1 text-right flex items-center justify-end gap-1">
                                                9:42 AM <CheckCheck size={10} className="text-tiffany" />
                                            </div>
                                        </div>

                                        {/* Mensaje 3: Stats */}
                                        <div
                                            ref={(el) => { messageRefs.current[2] = el }}
                                            className="bg-[#162230] rounded-xl p-3 border border-tiffany/10"
                                        >
                                            <div className="text-[9px] text-tiffany font-semibold mb-2 uppercase tracking-wider">
                                                Estado de campaña
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <div className="text-sm font-bold text-white">2,847</div>
                                                    <div className="text-[9px] text-white/35">Enviados</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-tiffany">2,791</div>
                                                    <div className="text-[9px] text-white/35">Entregados</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-gradient-to-r from-tiffany to-daylight-sky h-full rounded-full" style={{ width: '98%' }} />
                                            </div>
                                            <div className="text-[9px] text-white/25 mt-1 text-right">98.4% entrega</div>
                                        </div>
                                    </div>

                                    {/* Input bar */}
                                    <div className="bg-[#1a2637] px-3 py-2.5 flex items-center gap-2 border-t border-white/5">
                                        <div className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-[10px] text-white/25">
                                            Escribe un mensaje...
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tiffany to-daylight-sky flex items-center justify-center">
                                            <Mic2 size={11} className="text-[#0a0f1e]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
