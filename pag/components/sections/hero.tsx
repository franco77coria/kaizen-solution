'use client'

import { useEffect, useRef } from 'react'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'

interface HeroProps {
    title?: string
    subtitle?: string
    ctaText?: string
    whatsappNumber?: string
}

export default function Hero({
    title = "Soluciones digitales a medida para tu negocio",
    subtitle = "Impulsamos la mejora continua, la eficiencia y la adopción inteligente de tecnología. Sistemas y herramientas digitales robustas, creadas 100% a medida.",
    ctaText = "Agenda tu Diagnóstico Gratuito",
    whatsappNumber = "5491163515966"
}: HeroProps) {
    const badgeRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const statsRef = useRef<HTMLDivElement>(null)
    const orbRef = useRef<HTMLDivElement>(null)
    const scrollIndicatorRef = useRef<HTMLButtonElement>(null)

    // Refs para counters individuales
    const counter100Ref = useRef<HTMLSpanElement>(null)
    const counter50Ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, SplitText } = await import('@/lib/gsap-init')

            ctx = gsap.context(() => {
                const tl = gsap.timeline()

                // Badge: fade + slide
                if (badgeRef.current) {
                    gsap.set(badgeRef.current, { opacity: 0, y: 20 })
                    tl.to(badgeRef.current, {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        ease: 'power3.out',
                    })
                }

                // Heading: SplitText char-by-char
                if (headingRef.current) {
                    gsap.set(headingRef.current, { opacity: 1 })
                    const split = new SplitText(headingRef.current, { type: 'chars,words' })
                    gsap.set(split.chars, { opacity: 0, y: 60, rotateX: -90 })
                    tl.to(
                        split.chars,
                        {
                            opacity: 1,
                            y: 0,
                            rotateX: 0,
                            stagger: 0.022,
                            duration: 0.7,
                            ease: 'back.out(1.4)',
                        },
                        '-=0.4'
                    )
                }

                // Subtitle: fade + slide
                if (subtitleRef.current) {
                    gsap.set(subtitleRef.current, { opacity: 0, y: 20 })
                    tl.to(
                        subtitleRef.current,
                        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' },
                        '-=0.2'
                    )
                }

                // Stats: fade in como grupo
                if (statsRef.current) {
                    gsap.set(statsRef.current, { opacity: 0 })
                    tl.to(
                        statsRef.current,
                        { opacity: 1, duration: 0.8, ease: 'power2.out' },
                        '+=0.1'
                    )
                }

                // Counters animados: 0→100 y 0→50
                if (counter100Ref.current) {
                    const obj = { val: 0 }
                    tl.to(
                        obj,
                        {
                            val: 100,
                            duration: 1.8,
                            ease: 'power2.out',
                            onUpdate: () => {
                                if (counter100Ref.current) {
                                    counter100Ref.current.textContent = `${Math.round(obj.val)}%`
                                }
                            },
                        },
                        '<'
                    )
                }
                if (counter50Ref.current) {
                    const obj2 = { val: 0 }
                    tl.to(
                        obj2,
                        {
                            val: 50,
                            duration: 1.8,
                            ease: 'power2.out',
                            onUpdate: () => {
                                if (counter50Ref.current) {
                                    counter50Ref.current.textContent = `+${Math.round(obj2.val)}`
                                }
                            },
                        },
                        '<'
                    )
                }

                // Scroll indicator
                if (scrollIndicatorRef.current) {
                    gsap.set(scrollIndicatorRef.current, { opacity: 0 })
                    tl.to(
                        scrollIndicatorRef.current,
                        { opacity: 1, duration: 0.6 },
                        '+=0.2'
                    )
                }

                // Orb: loop suave infinito
                if (orbRef.current) {
                    gsap.to(orbRef.current, {
                        x: 90,
                        y: -50,
                        scale: 1.18,
                        duration: 9,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    })
                }
            })
        }

        initGSAP()

        return () => {
            ctx?.revert()
        }
    }, [title])

    const handleCTA = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital")
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
    }

    const scrollToServices = () => {
        document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0f1e]">
            {/* Grid sutil */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Orb animado con GSAP */}
            <div
                ref={orbRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-egyptian/20 via-daylight-sky/5 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            {/* Orb secundario decorativo */}
            <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-tiffany/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="text-center space-y-10">

                    {/* Badge — controlado por GSAP */}
                    <div ref={badgeRef} style={{ opacity: 0 }}>
                        <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2">
                            Transformación Digital con Propósito
                        </span>
                    </div>

                    {/* Heading — SplitText por GSAP */}
                    <h1
                        ref={headingRef}
                        style={{ opacity: 0 }}
                        className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-white leading-[1.1] tracking-tight"
                    >
                        {title.split(' ').map((word, i) => {
                            const accentWords = ['digitales', 'medida', 'negocio']
                            if (accentWords.includes(word.toLowerCase())) {
                                return (
                                    <span
                                        key={i}
                                        className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent"
                                    >
                                        {word}{' '}
                                    </span>
                                )
                            }
                            return <span key={i}>{word} </span>
                        })}
                    </h1>

                    {/* Subtitle — Framer Motion (suave, sin conflicto) */}
                    <p
                        ref={subtitleRef}
                        style={{ opacity: 0 }}
                        className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {subtitle}
                    </p>

                    {/* CTA Buttons — Framer Motion hover */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <button
                            onClick={handleCTA}
                            className="group flex items-center gap-2 bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
                        >
                            {ctaText}
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                        </button>
                        <button
                            onClick={scrollToServices}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-medium px-6 py-4 rounded-full border border-white/10 hover:border-white/25 transition-all duration-300"
                        >
                            Conocer más
                        </button>
                    </motion.div>

                    {/* Stats con counters GSAP */}
                    <div ref={statsRef} style={{ opacity: 0 }} className="flex items-center justify-center gap-12 md:gap-16 pt-16">
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                <span ref={counter100Ref}>0%</span>
                            </div>
                            <div className="text-xs md:text-sm text-white/40 uppercase tracking-wider">A Medida</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-bold text-white mb-1">24/7</div>
                            <div className="text-xs md:text-sm text-white/40 uppercase tracking-wider">Soporte</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                <span ref={counter50Ref}>+0</span>
                            </div>
                            <div className="text-xs md:text-sm text-white/40 uppercase tracking-wider">Proyectos</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator — GSAP fade in */}
            <button
                ref={scrollIndicatorRef}
                onClick={scrollToServices}
                style={{ opacity: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ArrowDown size={24} />
                </motion.div>
            </button>
        </section>
    )
}
