'use client'

import { useEffect, useRef } from 'react'
import { TrendingUp, FileCheck, Rocket, Users, DollarSign, Clock, LucideIcon } from 'lucide-react'

const benefits: { icon: LucideIcon; title: string; description: string }[] = [
    {
        icon: TrendingUp,
        title: 'Mayor Productividad',
        description: 'Herramientas que potencian el trabajo en equipo y aumentan la eficiencia operativa.',
    },
    {
        icon: FileCheck,
        title: 'Procesos Estandarizados',
        description: 'Metodologías claras que aseguran la calidad y consistencia en cada proyecto.',
    },
    {
        icon: Rocket,
        title: 'Transformación Accesible',
        description: 'Soluciones escalables y prácticas adaptadas a tu presupuesto y necesidades.',
    },
    {
        icon: Users,
        title: 'Acompañamiento Integral',
        description: 'Desde la planeación hasta la operación, estamos con vos en cada paso.',
    },
    {
        icon: DollarSign,
        title: 'Ahorro en Costos',
        description: 'Optimización de recursos y reducción de gastos operativos innecesarios.',
    },
    {
        icon: Clock,
        title: 'Ahorro de Tiempo',
        description: 'Automatización de tareas repetitivas para enfocarte en lo que importa.',
    },
]

export default function Benefits() {
    const sectionRef = useRef<HTMLElement>(null)
    const headerRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const ctaRef = useRef<HTMLDivElement>(null)
    const ctaHeadingRef = useRef<HTMLHeadingElement>(null)
    const ctaButtonRef = useRef<HTMLButtonElement>(null)

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

                    // ── Header: label slides in, title + subtitle fade blur ──
                    if (headerRef.current) {
                        const children = headerRef.current.children
                        gsap.from(children, {
                            opacity: 0,
                            y: isDesktop ? 40 : 20,
                            filter: reduceMotion ? 'none' : 'blur(8px)',
                            stagger: 0.12,
                            duration: dur ?? 0.8,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: headerRef.current,
                                start: 'top 82%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Grid items: batch stagger reveal ──
                    if (gridRef.current) {
                        const items = gridRef.current.querySelectorAll('.benefit-item')
                        ScrollTrigger.batch(items, {
                            onEnter: (batch) => {
                                gsap.from(batch, {
                                    opacity: 0,
                                    y: isDesktop ? 50 : 24,
                                    scale: reduceMotion ? 1 : 0.95,
                                    duration: dur ?? 0.7,
                                    stagger: 0.08,
                                    ease: 'back.out(1.4)',
                                    overwrite: true,
                                })
                            },
                            start: 'top 88%',
                        })

                        // Icon hover-like pulse on each card via scroll
                        items.forEach((item) => {
                            const icon = item.querySelector('.benefit-icon')
                            if (icon && !reduceMotion) {
                                gsap.to(icon, {
                                    scale: 1.12,
                                    rotation: 5,
                                    duration: 0.4,
                                    ease: 'power2.out',
                                    paused: true,
                                    scrollTrigger: {
                                        trigger: item,
                                        start: 'top 80%',
                                        toggleActions: 'play none none reverse',
                                    },
                                })
                            }
                        })
                    }

                    // ── CTA block: dramatic entrance ──
                    if (ctaRef.current) {
                        const tl = gsap.timeline({
                            scrollTrigger: {
                                trigger: ctaRef.current,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })

                        tl.from(ctaRef.current, {
                            opacity: 0,
                            y: isDesktop ? 60 : 30,
                            scale: reduceMotion ? 1 : 0.92,
                            duration: dur ?? 0.9,
                            ease: 'power4.out',
                        })

                        if (ctaHeadingRef.current && !reduceMotion) {
                            tl.from(
                                ctaHeadingRef.current,
                                {
                                    opacity: 0,
                                    y: 20,
                                    filter: 'blur(6px)',
                                    duration: 0.6,
                                    ease: 'power3.out',
                                },
                                '-=0.5'
                            )
                        }

                        if (ctaButtonRef.current && !reduceMotion) {
                            tl.from(
                                ctaButtonRef.current,
                                {
                                    opacity: 0,
                                    y: 16,
                                    scale: 0.9,
                                    duration: 0.5,
                                    ease: 'back.out(2)',
                                },
                                '-=0.3'
                            )
                        }
                    }

                    return () => { /* matchMedia auto-cleans */ }
                }
            )

            ctx = { revert: () => mm.revert() }
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    const handleDiagnostico = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital gratuito")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <section ref={sectionRef} id="beneficios" className="py-28 bg-white overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div ref={headerRef} className="text-center mb-20">
                    <span className="text-sm font-medium tracking-widest uppercase text-accent-ink mb-4 block">
                        Beneficios
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold text-egyptian mb-5">
                        Resultados Tangibles
                    </h2>
                    <p className="text-lg text-slate max-w-2xl mx-auto font-light">
                        Impacto directo en el crecimiento de tu organización
                    </p>
                </div>

                {/* Benefits Grid */}
                <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit) => {
                        const Icon = benefit.icon
                        return (
                            <div
                                key={benefit.title}
                                className="benefit-item group"
                            >
                                <div className="flex items-start gap-4 p-6 rounded-2xl hover:bg-gray-50/80 transition-all duration-300">
                                    <div className="benefit-icon w-11 h-11 rounded-xl bg-[#0a0f1e] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <Icon className="text-tiffany" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-egyptian mb-1">{benefit.title}</h3>
                                        <p className="text-sm text-slate leading-relaxed">{benefit.description}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Bottom CTA */}
                <div
                    ref={ctaRef}
                    className="mt-20 text-center bg-[#0a0f1e] rounded-3xl p-12 md:p-16 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-radial from-daylight-sky/10 to-transparent opacity-50" />
                    <div className="relative z-10">
                        <h3 ref={ctaHeadingRef} className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">
                            ¿Listo para transformar tu negocio?
                        </h3>
                        <p className="text-white/50 mb-8 max-w-lg mx-auto font-light">
                            Comienza con un diagnóstico gratuito de madurez digital
                        </p>
                        <button
                            ref={ctaButtonRef}
                            onClick={handleDiagnostico}
                            className="bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
                        >
                            Agendar Diagnóstico Gratuito
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
