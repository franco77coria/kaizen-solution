'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, ShieldAlert, ScanFace, Activity, Factory, MapPin, Zap, ChevronRight } from 'lucide-react'

// ─── Casos de uso de visión artificial ───────────────────────────────────────
const useCases = [
    {
        icon: Camera,
        title: 'Gestión de Tráfico',
        description: 'IA optimiza los ciclos de semáforos en tiempo real según la densidad de vehículos y peatones detectados.',
        stat: '-34% congestión',
        color: '#00BFF7',
    },
    {
        icon: ScanFace,
        title: 'Control de Acceso',
        description: 'Reconocimiento facial y de matrículas para acceso automático y seguro en edificios y estacionamientos.',
        stat: '99.8% precisión',
        color: '#81D8D0',
    },
    {
        icon: ShieldAlert,
        title: 'Seguridad Perimetral',
        description: 'Detección 24/7 de intrusiones, comportamiento anómalo y emisión de alertas en tiempo real.',
        stat: '<50ms latencia',
        color: '#00BFF7',
    },
    {
        icon: Activity,
        title: 'Análisis de Flujo',
        description: 'Mapas de calor, conteo de personas y patrones de movimiento para retail y espacios públicos.',
        stat: '+28% eficiencia',
        color: '#81D8D0',
    },
    {
        icon: Factory,
        title: 'Control de Calidad',
        description: 'Detección automática de defectos en línea de producción con precisión submilimétrica.',
        stat: '99.9% detección',
        color: '#00BFF7',
    },
]

// ─── Objeto de detección en el mockup ────────────────────────────────────────
interface Detection {
    label: string
    conf: string
    color: string
    x: string
    y: string
    w: string
    h: string
}

const detections: Detection[] = [
    { label: 'VEHÍCULO', conf: '97.2%', color: '#00BFF7', x: '8%', y: '52%', w: '28%', h: '28%' },
    { label: 'VEHÍCULO', conf: '94.1%', color: '#00BFF7', x: '48%', y: '55%', w: '24%', h: '26%' },
    { label: 'PEATÓN', conf: '89.4%', color: '#81D8D0', x: '36%', y: '38%', w: '10%', h: '28%' },
    { label: 'SEMÁFORO', conf: '98.9%', color: '#FFD700', x: '78%', y: '18%', w: '8%', h: '22%' },
]

// ─── Stats del panel inferior ─────────────────────────────────────────────────
const initialStats = [
    { label: 'Vehículos/min', value: 12, unit: '' },
    { label: 'Peatones', value: 3, unit: '' },
    { label: 'Ciclo semáforo', value: 28, unit: 's' },
    { label: 'Latencia IA', value: 42, unit: 'ms' },
]

export default function AIVisionSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const cameraRef = useRef<HTMLDivElement>(null)
    const scanLineRef = useRef<HTMLDivElement>(null)
    const detectionRefs = useRef<(HTMLDivElement | null)[]>([])
    const caseRefs = useRef<(HTMLDivElement | null)[]>([])
    const [stats, setStats] = useState(initialStats)
    const [activeDet, setActiveDet] = useState<number[]>([])
    const [trafficLight, setTrafficLight] = useState<'red' | 'green'>('red')

    // ── Stats "live" que fluctúan ──
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => prev.map((s, i) => ({
                ...s,
                value: Math.max(1, s.value + (Math.random() > 0.5 ? 1 : -1) * (i === 3 ? 3 : 1))
            })))
            setTrafficLight(prev => (Math.random() > 0.7 ? (prev === 'red' ? 'green' : 'red') : prev))
        }, 1800)
        return () => clearInterval(interval)
    }, [])

    // ── Animación de bounding boxes: aparecen/desaparecen en secuencia ──
    useEffect(() => {
        const sequence = async () => {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                for (let i = 0; i < detections.length; i++) {
                    await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
                    setActiveDet(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
                }
                await new Promise(r => setTimeout(r, 1200))
                setActiveDet(detections.map((_, i) => i)) // todos activos
                await new Promise(r => setTimeout(r, 2000))
                setActiveDet([]) // todos inactivos
                await new Promise(r => setTimeout(r, 800))
            }
        }
        sequence()
    }, [])

    // ── GSAP: scan line + sección reveal + scramble heading ──
    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            const mm = gsap.matchMedia()

            mm.add(
                {
                    isDesktop: '(min-width: 768px)',
                    isMobile: '(max-width: 767px)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { isDesktop, reduceMotion } = context.conditions!
                    const dur = reduceMotion ? 0 : undefined

                    // Scan line: runs continuously (even on mobile, it's cheap)
                    if (scanLineRef.current && !reduceMotion) {
                        gsap.fromTo(
                            scanLineRef.current,
                            { top: '0%', opacity: 0.8 },
                            {
                                top: '100%',
                                opacity: 0,
                                duration: 2.8,
                                repeat: -1,
                                ease: 'none',
                                repeatDelay: 0.5,
                            }
                        )
                    }

                    // Heading: text scramble
                    if (headingRef.current && !reduceMotion) {
                        const target = headingRef.current
                        const finalText = target.textContent || ''
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#!'

                        ScrollTrigger.create({
                            trigger: target,
                            start: 'top 80%',
                            once: true,
                            onEnter: () => {
                                const obj = { p: 0 }
                                gsap.to(obj, {
                                    p: 1,
                                    duration: 1.4,
                                    ease: 'power3.out',
                                    onUpdate() {
                                        const progress = obj.p
                                        target.textContent = finalText
                                            .split('')
                                            .map((char, i) => {
                                                if (char === ' ') return ' '
                                                if (i < Math.floor(progress * finalText.length)) return char
                                                return chars[Math.floor(Math.random() * chars.length)]
                                            })
                                            .join('')
                                    },
                                    onComplete() {
                                        target.textContent = finalText
                                    },
                                })
                            },
                        })
                    }

                    // Camera mockup: dramatic entrance
                    if (cameraRef.current) {
                        gsap.from(cameraRef.current, {
                            opacity: 0,
                            scale: reduceMotion ? 1 : 0.88,
                            y: isDesktop ? 60 : 30,
                            rotateX: reduceMotion ? 0 : (isDesktop ? 10 : 0),
                            duration: dur ?? 1.1,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: cameraRef.current,
                                start: 'top 80%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // Case cards: stagger reveal
                    caseRefs.current.forEach((el, i) => {
                        if (!el) return
                        gsap.from(el, {
                            opacity: 0,
                            x: isDesktop ? 50 : 0,
                            y: isDesktop ? 0 : 30,
                            duration: dur ?? 0.7,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: el,
                                start: 'top 88%',
                                toggleActions: 'play none none none',
                            },
                            delay: i * 0.1,
                        })
                    })

                    return () => {}
                }
            )

            ctx = { revert: () => mm.revert() }
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    const handleContacto = () => {
        window.open(`https://wa.me/5491163515966?text=${encodeURIComponent('Hola, me interesa implementar Visión Artificial con IA en mi organización')}`, '_blank')
    }

    return (
        <section ref={sectionRef} className="bg-[#060b17] text-white py-28 relative overflow-hidden">
            {/* Grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
            }} />
            {/* Glow izquierdo */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-daylight-sky/12 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2 mb-6"
                    >
                        Visión Artificial · Computer Vision
                    </motion.span>

                    {/* Text scramble heading */}
                    <h2
                        ref={headingRef}
                        className="text-3xl md:text-5xl font-heading font-bold mb-5 font-mono tracking-tight"
                    >
                        IA que Ve, Entiende y Actúa
                    </h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="text-lg text-white/50 max-w-2xl mx-auto font-light"
                    >
                        Sistemas de percepción visual que transforman cámaras ordinarias en agentes
                        inteligentes capaces de analizar, decidir y actuar en tiempo real.
                    </motion.p>
                </div>

                {/* ── Layout principal: mockup cámara izquierda + casos derecha ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

                    {/* ── Mockup de cámara AI ── */}
                    <div ref={cameraRef} className="relative" style={{ perspective: '1000px' }}>
                        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0a1628] shadow-2xl shadow-black/50">

                            {/* Barra superior */}
                            <div className="flex items-center justify-between px-4 py-3 bg-[#0d1e35] border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs font-mono text-white/60 tracking-wider">CAM_01 · INTERSECCIÓN NORTE</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-xs text-green-400 font-mono">LIVE</span>
                                </div>
                            </div>

                            {/* Feed de la cámara */}
                            <div className="relative bg-[#080f1e] overflow-hidden" style={{ height: '280px' }}>
                                {/* Línea de escaneo */}
                                <div
                                    ref={scanLineRef}
                                    className="absolute left-0 right-0 h-px pointer-events-none z-20"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, #00BFF7, #81D8D0, #00BFF7, transparent)',
                                        boxShadow: '0 0 8px #00BFF7, 0 0 20px #00BFF750',
                                    }}
                                />

                                {/* Esquinas sci-fi */}
                                {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                                    <div key={i} className={`absolute ${pos} w-6 h-6 border-daylight-sky/60 z-10 pointer-events-none`} style={{
                                        borderTopWidth: i < 2 ? '2px' : '0',
                                        borderBottomWidth: i >= 2 ? '2px' : '0',
                                        borderLeftWidth: i % 2 === 0 ? '2px' : '0',
                                        borderRightWidth: i % 2 === 1 ? '2px' : '0',
                                    }} />
                                ))}

                                {/* Cielo */}
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0e1f3a 0%, #152d50 40%, #1a3a60 60%, #1c2e3a 100%)' }} />

                                {/* Edificios al fondo */}
                                <div className="absolute bottom-[35%] left-0 right-0 flex items-end gap-2 px-4">
                                    {[60, 80, 50, 70, 55, 90, 45, 65].map((h, i) => (
                                        <div key={i} className="flex-1 bg-[#1a2840] border-t border-[#1e3050]" style={{ height: `${h}px` }}>
                                            {/* Ventanas */}
                                            <div className="grid grid-cols-2 gap-1 p-1 h-full">
                                                {[...Array(Math.floor(h / 20))].map((_, j) => (
                                                    <div key={j} className="rounded-sm" style={{
                                                        background: Math.random() > 0.4 ? '#FFD70030' : 'transparent',
                                                        height: '6px'
                                                    }} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Calle */}
                                <div className="absolute bottom-0 left-0 right-0 bg-[#1a1e2a]" style={{ height: '35%' }}>
                                    <div className="absolute inset-x-0 top-0 h-px bg-[#2a3040]" />
                                    {/* Líneas de calle */}
                                    <div className="absolute inset-x-0 top-1/2 flex justify-center gap-4">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="w-8 h-1 bg-white/10 rounded-full" />
                                        ))}
                                    </div>
                                </div>

                                {/* Semáforo */}
                                <div className="absolute bottom-[35%] right-[20%] z-10">
                                    <div className="w-3 h-16 bg-[#0d1520] rounded-sm mx-auto" />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 rounded bg-[#0a1220] border border-white/10 p-0.5 flex flex-col gap-0.5">
                                        <div className={`w-full aspect-square rounded-sm transition-all duration-700 ${trafficLight === 'red' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-red-900/30'}`} />
                                        <div className="w-full aspect-square rounded-sm bg-yellow-900/30" />
                                        <div className={`w-full aspect-square rounded-sm transition-all duration-700 ${trafficLight === 'green' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-green-900/30'}`} />
                                    </div>
                                </div>

                                {/* Bounding boxes de detección */}
                                {detections.map((det, i) => (
                                    <div
                                        key={i}
                                        ref={el => { detectionRefs.current[i] = el }}
                                        className="absolute z-20 transition-all duration-300"
                                        style={{
                                            left: det.x, top: det.y,
                                            width: det.w, height: det.h,
                                            border: `1.5px solid ${det.color}`,
                                            opacity: activeDet.includes(i) ? 1 : 0,
                                            boxShadow: activeDet.includes(i) ? `0 0 8px ${det.color}60, inset 0 0 8px ${det.color}10` : 'none',
                                            transform: activeDet.includes(i) ? 'scale(1)' : 'scale(0.95)',
                                        }}
                                    >
                                        {/* Label */}
                                        <div
                                            className="absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-wider"
                                            style={{ background: det.color, color: '#0a0f1e' }}
                                        >
                                            {det.label} {det.conf}
                                        </div>
                                        {/* Esquinas del bbox */}
                                        <div className="absolute top-0 left-0 w-2 h-2" style={{ borderTop: `2px solid ${det.color}`, borderLeft: `2px solid ${det.color}` }} />
                                        <div className="absolute top-0 right-0 w-2 h-2" style={{ borderTop: `2px solid ${det.color}`, borderRight: `2px solid ${det.color}` }} />
                                        <div className="absolute bottom-0 left-0 w-2 h-2" style={{ borderBottom: `2px solid ${det.color}`, borderLeft: `2px solid ${det.color}` }} />
                                        <div className="absolute bottom-0 right-0 w-2 h-2" style={{ borderBottom: `2px solid ${det.color}`, borderRight: `2px solid ${det.color}` }} />
                                    </div>
                                ))}

                                {/* Overlay de detecciones activas - contador */}
                                <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/10">
                                    <div className="text-[9px] font-mono text-daylight-sky tracking-wider mb-0.5">DETECCIONES</div>
                                    <div className="text-base font-bold font-mono text-white">{activeDet.length}</div>
                                </div>
                            </div>

                            {/* Panel de stats inferior */}
                            <div className="grid grid-cols-4 divide-x divide-white/5 border-t border-white/5 bg-[#0a1628]">
                                {stats.map((stat, i) => (
                                    <div key={i} className="px-3 py-2.5 text-center">
                                        <div className="text-sm font-bold font-mono text-daylight-sky tabular-nums transition-all duration-500">
                                            {stat.value}{stat.unit}
                                        </div>
                                        <div className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5 leading-tight">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Resultado de IA */}
                            <div className="px-4 py-3 bg-[#0d1e35] border-t border-white/5 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                <span className="text-xs font-mono text-white/50">
                                    Semáforo{' '}
                                    <span className={`font-bold transition-colors duration-700 ${trafficLight === 'green' ? 'text-green-400' : 'text-red-400'}`}>
                                        {trafficLight === 'green' ? 'VERDE → flujo optimizado' : 'ROJO → analizando densidad...'}
                                    </span>
                                </span>
                                <span className="ml-auto text-[10px] text-white/20 font-mono">IA_MODEL_v3.2</span>
                            </div>
                        </div>

                        {/* Label debajo del mockup */}
                        <p className="text-center text-xs text-white/25 mt-3 font-mono tracking-wider">
                            SIMULACIÓN · Sistema de visión artificial en tiempo real
                        </p>
                    </div>

                    {/* ── Lista de casos de uso ── */}
                    <div className="space-y-3">
                        {useCases.map((useCase, i) => {
                            const Icon = useCase.icon
                            return (
                                <div
                                    key={useCase.title}
                                    ref={el => { caseRefs.current[i] = el }}
                                    className="group flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                                        style={{ background: `${useCase.color}20`, border: `1px solid ${useCase.color}30` }}
                                    >
                                        <Icon size={18} style={{ color: useCase.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h4 className="text-sm font-semibold text-white">{useCase.title}</h4>
                                            <span
                                                className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                                                style={{ color: useCase.color, background: `${useCase.color}15`, border: `1px solid ${useCase.color}25` }}
                                            >
                                                {useCase.stat}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/45 leading-relaxed">{useCase.description}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-white/20 group-hover:text-daylight-sky flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all duration-300" />
                                </div>
                            )
                        })}

                        <div className="pt-4">
                            <button
                                onClick={handleContacto}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-daylight-sky/20 text-daylight-sky text-sm font-semibold hover:bg-daylight-sky/5 hover:border-daylight-sky/40 transition-all duration-300 group"
                            >
                                <Zap size={15} className="group-hover:scale-110 transition-transform" />
                                Implementar Visión Artificial
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
