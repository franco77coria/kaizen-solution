'use client'

import { useEffect, useRef } from 'react'
import { Lightbulb, BarChart3, Cloud, CheckCircle, LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
    'Lightbulb': Lightbulb,
    'BarChart3': BarChart3,
    'Cloud': Cloud,
}

interface Service {
    id: string
    title: string
    description: string
    icon: string | null
    features: string
}

interface StrategicPillarsProps {
    services?: Service[]
}

const defaultServices = [
    {
        id: '1',
        icon: 'Lightbulb',
        title: 'Consultoría Estratégica en TI',
        description: 'Diseño y estructuración de PETI, alineación estratégica tecnología-negocio.',
        features: '["Diseño de PETI", "Alineación estratégica", "Diagnóstico de madurez", "Asesoría en seguridad"]',
    },
    {
        id: '2',
        icon: 'BarChart3',
        title: 'Analítica y Business Intelligence',
        description: 'Tableros interactivos, KPIs y visualización en tiempo real del desempeño.',
        features: '["Tableros interactivos", "KPIs en tiempo real", "Análisis de datos", "Oportunidades de mejora"]',
    },
    {
        id: '3',
        icon: 'Cloud',
        title: 'Adopción e Implementación',
        description: 'Despliegue de herramientas productivas, migración y automatización.',
        features: '["Google Workspace", "Migración a la nube", "Automatización", "Capacitación"]',
    }
]

export default function StrategicPillars({ services = defaultServices }: StrategicPillarsProps) {
    const sectionRef = useRef<HTMLElement>(null)
    const headerRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<HTMLDivElement>(null)

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

                    // ── Header: staggered children with blur ──
                    if (headerRef.current) {
                        gsap.from(headerRef.current.children, {
                            opacity: 0,
                            y: isDesktop ? 40 : 20,
                            filter: reduceMotion ? 'none' : 'blur(8px)',
                            stagger: 0.1,
                            duration: dur ?? 0.8,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: headerRef.current,
                                start: 'top 82%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Cards: batch stagger with 3D rotation ──
                    if (cardsRef.current) {
                        const cards = cardsRef.current.querySelectorAll('.pillar-card')

                        ScrollTrigger.batch(cards, {
                            onEnter: (batch) => {
                                gsap.from(batch, {
                                    opacity: 0,
                                    y: isDesktop ? 60 : 30,
                                    rotateX: reduceMotion ? 0 : (isDesktop ? -15 : 0),
                                    scale: reduceMotion ? 1 : 0.92,
                                    duration: dur ?? 0.8,
                                    stagger: isDesktop ? 0.15 : 0.08,
                                    ease: 'back.out(1.2)',
                                    overwrite: true,
                                })
                            },
                            start: 'top 88%',
                        })

                        // ── Feature items: staggered slide-in per card ──
                        if (!reduceMotion) {
                            cards.forEach((card) => {
                                const features = card.querySelectorAll('.feature-item')
                                if (features.length) {
                                    gsap.from(features, {
                                        opacity: 0,
                                        x: -16,
                                        stagger: 0.06,
                                        duration: 0.4,
                                        ease: 'power2.out',
                                        scrollTrigger: {
                                            trigger: card,
                                            start: 'top 80%',
                                            toggleActions: 'play none none none',
                                        },
                                        delay: 0.4,
                                    })
                                }
                            })
                        }
                    }

                    return () => {}
                }
            )

            ctx = { revert: () => mm.revert() }
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    return (
        <section ref={sectionRef} id="servicios" className="py-28 bg-white" style={{ perspective: '1200px' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div ref={headerRef} className="text-center mb-20">
                    <span className="text-sm font-medium tracking-widest uppercase text-daylight-sky mb-4 block">
                        Servicios
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold text-egyptian mb-5">
                        Pilares Estratégicos
                    </h2>
                    <p className="text-lg text-slate max-w-2xl mx-auto font-light">
                        Servicios especializados para impulsar la transformación digital de tu organización
                    </p>
                </div>

                {/* Pillars Grid */}
                <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service) => {
                        const Icon = (service.icon && iconMap[service.icon]) ? iconMap[service.icon] : Lightbulb
                        const featuresList = JSON.parse(service.features) as string[]

                        return (
                            <div
                                key={service.id}
                                className="pillar-card group"
                            >
                                <div className="h-full p-8 rounded-2xl border border-gray-100 bg-white hover:border-daylight-sky/30 hover:shadow-xl hover:shadow-daylight-sky/5 transition-all duration-500">
                                    <div className="w-12 h-12 rounded-xl bg-[#0a0f1e] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                                        <Icon className="text-daylight-sky" size={24} />
                                    </div>
                                    <h3 className="text-xl font-heading font-bold text-egyptian mb-3">
                                        {service.title}
                                    </h3>
                                    <p className="text-slate text-sm leading-relaxed mb-6">
                                        {service.description}
                                    </p>
                                    <ul className="space-y-2.5">
                                        {featuresList.map((feature, i) => (
                                            <li key={i} className="feature-item flex items-center gap-2.5">
                                                <CheckCircle className="text-tiffany flex-shrink-0" size={16} />
                                                <span className="text-sm text-outer-space">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
