'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, ShieldCheck, MapPin, Network, ScanSearch, Globe, BarChart3, Users } from 'lucide-react'

interface ElectoralProduct {
    id: string
    badge: string
    badgeColor: string
    title: string
    subtitle: string
    context: string
    description: string
    features: string[]
    aiFeature: string
    stat: { value: string; label: string }
    accentFrom: string
    accentTo: string
    Icon: React.ElementType
}

const products: ElectoralProduct[] = [
    {
        id: 'vigilancia',
        badge: 'Electoral Tech',
        badgeColor: 'text-daylight-sky border-daylight-sky/20',
        title: 'Vigilancia Electoral',
        subtitle: 'Coordinación de veedores en tiempo real',
        context: 'Elecciones nacionales y regionales',
        description:
            'Plataforma integral para gestión de veedores en mesas electorales. Captura y análisis automático de documentos con IA para detectar inconsistencias y garantizar transparencia en el escrutinio.',
        features: [
            'Dashboard de mesas en tiempo real',
            'Captura digital de documentos electorales',
            'Roles: Veedor / Coordinador / Analista',
            'Alertas automáticas de discrepancias',
        ],
        aiFeature: 'IA analiza documentos para detectar diferencias automáticamente',
        stat: { value: '0%', label: 'discrepancias sin detectar' },
        accentFrom: '#00BFF7',
        accentTo: '#81D8D0',
        Icon: ShieldCheck,
    },
    {
        id: 'geoanalitica',
        badge: 'GeoAnalytics',
        badgeColor: 'text-tiffany border-tiffany/20',
        title: 'Inteligencia Territorial',
        subtitle: 'Dashboard de segmentación electoral',
        context: 'Campañas nacionales y regionales',
        description:
            'Dashboard geodemográfico avanzado para estrategia de campaña. Convierte datos territoriales en decisiones geopolíticas precisas con segmentación multivariable en tiempo real.',
        features: [
            'Mapa interactivo por municipio y provincia',
            'Segmentación demográfica multivariable',
            'Análisis de comportamiento por territorio',
            'Reportes exportables para equipos de campo',
        ],
        aiFeature: 'Modelos predictivos de comportamiento electoral por zona',
        stat: { value: '32', label: 'departamentos cubiertos' },
        accentFrom: '#81D8D0',
        accentTo: '#00BFF7',
        Icon: Globe,
    },
    {
        id: 'aliados',
        badge: 'CRM Político',
        badgeColor: 'text-daylight-sky border-daylight-sky/15',
        title: 'Red de Aliados',
        subtitle: 'Gestión de redes de apoyo político',
        context: 'Organización política nacional',
        description:
            'Sistema de gestión de redes de apoyo con trazabilidad completa. Organización inteligente de aliados por zona y nivel jerárquico, con activación vía WhatsApp y análisis de cobertura.',
        features: [
            'Gestión de redes jerárquicas por zona',
            'Cobertura territorial en tiempo real',
            'Activación automática vía WhatsApp',
            'Dashboard de captación por región',
        ],
        aiFeature: 'Identifica zonas de baja cobertura y sugiere acciones',
        stat: { value: '100%', label: 'rastreabilidad de red' },
        accentFrom: '#00BFF7',
        accentTo: '#223F93',
        Icon: Network,
    },
]

const impactItems = [
    { icon: ScanSearch, label: 'Análisis de documentos con IA', sub: 'Detección automática de diferencias' },
    { icon: BarChart3, label: 'Inteligencia territorial', sub: 'Datos que mueven campañas' },
    { icon: Users, label: 'Gestión de redes', sub: 'Trazabilidad total de aliados' },
]

export default function PublicSectorSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const headerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const impactRef = useRef<HTMLDivElement>(null)
    const lineRef = useRef<HTMLDivElement>(null)

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

                    // Header reveal con blur
                    if (headerRef.current) {
                        gsap.from(headerRef.current.children, {
                            opacity: 0,
                            y: isDesktop ? 50 : 24,
                            filter: reduceMotion ? 'none' : 'blur(10px)',
                            stagger: 0.15,
                            duration: dur ?? 1,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: headerRef.current,
                                start: 'top 80%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // Cards: cada una entra desde abajo con stagger
                    cardRefs.current.forEach((card, i) => {
                        if (!card) return
                        gsap.from(card, {
                            opacity: 0,
                            y: isDesktop ? 80 : 40,
                            scale: reduceMotion ? 1 : 0.95,
                            duration: dur ?? 0.9,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: card,
                                start: 'top 88%',
                                toggleActions: 'play none none none',
                            },
                            delay: i * 0.12,
                        })

                        // Animate features inside each card
                        if (!reduceMotion) {
                            const features = card.querySelectorAll('li')
                            gsap.from(features, {
                                opacity: 0,
                                x: -12,
                                stagger: 0.06,
                                duration: 0.4,
                                ease: 'power2.out',
                                scrollTrigger: {
                                    trigger: card,
                                    start: 'top 80%',
                                    toggleActions: 'play none none none',
                                },
                                delay: 0.4 + i * 0.12,
                            })
                        }
                    })

                    // Línea divisoria: width 0 → 100%
                    if (lineRef.current && !reduceMotion) {
                        gsap.from(lineRef.current, {
                            scaleX: 0,
                            transformOrigin: 'left center',
                            duration: 1.2,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: lineRef.current,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // Impact items
                    if (impactRef.current) {
                        gsap.from(impactRef.current.children, {
                            opacity: 0,
                            y: isDesktop ? 30 : 16,
                            stagger: 0.15,
                            duration: dur ?? 0.8,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: impactRef.current,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })
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
        <section ref={sectionRef} id="sector-publico" className="bg-[#0a0f1e] text-white relative">
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28">

                {/* Header */}
                <div ref={headerRef} className="text-center mb-20 space-y-5">
                    <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2">
                        Sector Público · Tecnología Electoral
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold">
                        Donde la Tecnología{' '}
                        <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">
                            Impacta a Millones
                        </span>
                    </h2>
                    <p className="text-lg text-white/65 max-w-2xl mx-auto font-light">
                        Desarrollamos plataformas de misión crítica para campañas políticas y gestión
                        electoral. IA que analiza documentos en tiempo real para garantizar transparencia.
                    </p>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-20">
                    {products.map((product, index) => {
                        const { Icon } = product
                        return (
                            <div
                                key={product.id}
                                ref={(el) => { cardRefs.current[index] = el }}
                                className="group relative rounded-2xl border border-white/8 bg-white/[0.03] p-7 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-500 flex flex-col"
                            >
                                {/* Glow en hover */}
                                <div
                                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at 50% 0%, ${product.accentFrom}15 0%, transparent 60%)`,
                                    }}
                                />

                                {/* Badge + context */}
                                <div className="flex items-center justify-between mb-6">
                                    <span className={`text-xs font-semibold tracking-wider uppercase border rounded-full px-3 py-1.5 ${product.badgeColor}`}>
                                        {product.badge}
                                    </span>
                                    <span className="text-xs text-white/55 font-medium text-right max-w-[130px] leading-tight">
                                        {product.context}
                                    </span>
                                </div>

                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: `linear-gradient(135deg, ${product.accentFrom}30, ${product.accentTo}15)` }}
                                >
                                    <Icon size={24} style={{ color: product.accentFrom }} />
                                </div>

                                {/* Title + subtitle */}
                                <h3 className="text-xl font-heading font-bold text-white mb-1">{product.title}</h3>
                                <p className="text-xs text-white/60 mb-4 font-medium tracking-wide">{product.subtitle}</p>

                                {/* Description */}
                                <p className="text-sm text-white/55 leading-relaxed mb-5">{product.description}</p>

                                {/* Features */}
                                <ul className="space-y-2 mb-5 flex-1">
                                    {product.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5">
                                            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: product.accentFrom }} />
                                            <span className="text-sm text-white/60">{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* AI feature highlight */}
                                <div
                                    className="flex items-start gap-2.5 rounded-xl p-3 mb-5"
                                    style={{ background: `${product.accentFrom}10`, border: `1px solid ${product.accentFrom}20` }}
                                >
                                    <ScanSearch size={14} className="flex-shrink-0 mt-0.5" style={{ color: product.accentFrom }} />
                                    <span className="text-xs leading-relaxed" style={{ color: product.accentFrom }}>
                                        {product.aiFeature}
                                    </span>
                                </div>

                                {/* Stat */}
                                <div className="pt-5 border-t border-white/8 flex items-end justify-between">
                                    <div>
                                        <div className="text-3xl font-bold font-heading" style={{ color: product.accentFrom }}>
                                            {product.stat.value}
                                        </div>
                                        <div className="text-xs text-white/55 mt-0.5">{product.stat.label}</div>
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ border: `1px solid ${product.accentFrom}40` }}
                                    >
                                        <Icon size={14} style={{ color: product.accentFrom }} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Divisor animado */}
                <div ref={lineRef} className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-16" />

                {/* Impact items */}
                <div ref={impactRef} className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                    {impactItems.map((item) => {
                        const { icon: ItemIcon } = item
                        return (
                            <div key={item.label} className="space-y-2 group">
                                <div className="flex justify-center mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center group-hover:border-daylight-sky/30 group-hover:bg-daylight-sky/5 transition-all duration-300">
                                        <ItemIcon size={18} className="text-white/60 group-hover:text-daylight-sky transition-colors duration-300" />
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-white/80">{item.label}</div>
                                <div className="text-xs text-white/60">{item.sub}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
