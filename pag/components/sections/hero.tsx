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

// Palabras que llevan gradiente — sin spans de React, GSAP las encuentra post-split
const ACCENT_WORDS = ['digitales', 'medida', 'negocio']

export default function Hero({
    title = "Soluciones digitales a medida para tu negocio",
    subtitle = "Impulsamos la mejora continua, la eficiencia y la adopción inteligente de tecnología. Sistemas y herramientas digitales robustas, creadas 100% a medida.",
    ctaText = "Agenda tu Diagnóstico Gratuito",
    whatsappNumber = "5491163515966"
}: HeroProps) {
    const headingRef = useRef<HTMLHeadingElement>(null)
    const badgeRef = useRef<HTMLDivElement>(null)
    const subtitleRef = useRef<HTMLParagraphElement>(null)
    const statsRef = useRef<HTMLDivElement>(null)
    const orbRef = useRef<HTMLDivElement>(null)
    const orb2Ref = useRef<HTMLDivElement>(null)
    const scrollIndicatorRef = useRef<HTMLButtonElement>(null)
    const counter100Ref = useRef<HTMLSpanElement>(null)
    const counter50Ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, SplitText } = await import('@/lib/gsap-init')

            ctx = gsap.context(() => {
                const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

                // ── Badge ──
                if (badgeRef.current) {
                    gsap.set(badgeRef.current, { opacity: 0, y: 24, filter: 'blur(8px)' })
                    tl.to(badgeRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 })
                }

                // ── Heading: SplitText sobre texto plano ──
                if (headingRef.current) {
                    // Hacer visible primero (estaba opacity:0 por CSS inline)
                    gsap.set(headingRef.current, { opacity: 1 })

                    const split = new SplitText(headingRef.current, { type: 'words' })

                    // Aplicar gradiente a palabras accent DESPUÉS del split
                    split.words.forEach((word) => {
                        const el = word as HTMLElement
                        const txt = el.textContent?.trim().replace(/[.,]/g, '').toLowerCase() || ''
                        if (ACCENT_WORDS.includes(txt)) {
                            el.style.background = 'linear-gradient(to right, #00BFF7, #81D8D0)'
                            el.style.webkitBackgroundClip = 'text'
                            el.style.webkitTextFillColor = 'transparent'
                            el.style.backgroundClip = 'text'
                        }
                    })

                    // Cada palabra: slide desde abajo + rotación leve
                    gsap.set(split.words, { opacity: 0, y: 80, rotateX: -60 })
                    tl.to(
                        split.words,
                        {
                            opacity: 1,
                            y: 0,
                            rotateX: 0,
                            stagger: 0.06,
                            duration: 0.9,
                            ease: 'back.out(1.2)',
                        },
                        '-=0.5'
                    )
                }

                // ── Subtitle ──
                if (subtitleRef.current) {
                    gsap.set(subtitleRef.current, { opacity: 0, y: 20, filter: 'blur(6px)' })
                    tl.to(
                        subtitleRef.current,
                        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7 },
                        '-=0.3'
                    )
                }

                // ── Stats group ──
                if (statsRef.current) {
                    gsap.set(statsRef.current, { opacity: 0, y: 16 })
                    tl.to(statsRef.current, { opacity: 1, y: 0, duration: 0.6 }, '-=0.1')
                }

                // ── Counters ──
                if (counter100Ref.current) {
                    const obj = { val: 0 }
                    tl.to(
                        obj,
                        {
                            val: 100,
                            duration: 2,
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
                            duration: 2,
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

                // ── Scroll indicator ──
                if (scrollIndicatorRef.current) {
                    gsap.set(scrollIndicatorRef.current, { opacity: 0 })
                    tl.to(scrollIndicatorRef.current, { opacity: 1, duration: 0.5 }, '+=0.3')
                }

                // ── Orb principal: loop infinito ──
                if (orbRef.current) {
                    gsap.to(orbRef.current, {
                        x: 100,
                        y: -60,
                        scale: 1.2,
                        duration: 10,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    })
                }

                // ── Orb secundario: contramovimiento ──
                if (orb2Ref.current) {
                    gsap.to(orb2Ref.current, {
                        x: -60,
                        y: 40,
                        scale: 1.15,
                        duration: 7,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                        delay: 2,
                    })
                }
            })
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [title])

    const handleCTA = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital")
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
    }

    const scrollToServices = () => {
        document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0f1e]" style={{ perspective: '1000px' }}>
            {/* Grid sutil */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Orb principal */}
            <div
                ref={orbRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-egyptian/25 via-daylight-sky/8 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            {/* Orb secundario */}
            <div
                ref={orb2Ref}
                className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-gradient-radial from-tiffany/15 to-transparent rounded-full blur-2xl pointer-events-none"
            />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="text-center space-y-10">

                    {/* Badge */}
                    <div ref={badgeRef} style={{ opacity: 0 }}>
                        <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2">
                            Transformación Digital con Propósito
                        </span>
                    </div>

                    {/* H1 — texto plano, SplitText lo procesa limpiamente */}
                    <h1
                        ref={headingRef}
                        style={{ opacity: 0 }}
                        className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-white leading-[1.1] tracking-tight"
                    >
                        {title}
                    </h1>

                    {/* Subtitle */}
                    <p
                        ref={subtitleRef}
                        style={{ opacity: 0 }}
                        className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {subtitle}
                    </p>

                    {/* CTA buttons — Framer Motion hover */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <motion.button
                            onClick={handleCTA}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            className="group flex items-center gap-2 bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] font-semibold px-8 py-4 rounded-full shadow-lg shadow-daylight-sky/20 hover:shadow-daylight-sky/40 transition-shadow duration-300"
                        >
                            {ctaText}
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                        </motion.button>
                        <motion.button
                            onClick={scrollToServices}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-medium px-6 py-4 rounded-full border border-white/10 hover:border-white/30 transition-all duration-300"
                        >
                            Conocer más
                        </motion.button>
                    </motion.div>

                    {/* Stats con counters */}
                    <div ref={statsRef} style={{ opacity: 0 }} className="flex items-center justify-center gap-12 md:gap-20 pt-16">
                        {[
                            { ref: counter100Ref, initial: '0%', label: 'A Medida' },
                            { ref: null, initial: '24/7', label: 'Soporte' },
                            { ref: counter50Ref, initial: '+0', label: 'Proyectos' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                    {stat.ref !== null ? (
                                        <span ref={stat.ref}>{stat.initial}</span>
                                    ) : (
                                        stat.initial
                                    )}
                                </div>
                                <div className="text-xs md:text-sm text-white/40 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <button
                ref={scrollIndicatorRef}
                onClick={scrollToServices}
                style={{ opacity: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ArrowDown size={24} />
                </motion.div>
            </button>
        </section>
    )
}
