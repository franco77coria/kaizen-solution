'use client'

import { useEffect, useRef } from 'react'

import { motion } from 'framer-motion'
import { ShieldCheck, Map, Users, CheckCircle2, LucideIcon } from 'lucide-react'

interface StackTag {
    label: string
}

interface Stat {
    value: string
    label: string
}

interface ElectoralProject {
    id: string
    badge: string
    badgeGradient: string
    title: string
    subtitle: string
    client: string
    description: string
    features: string[]
    stack: string[]
    Icon: LucideIcon
    stat: Stat
    accentColor: string
    borderColor: string
}

const projects: ElectoralProject[] = [
    {
        id: 'testigos-pl',
        badge: 'Gestión Electoral',
        badgeGradient: 'from-egyptian to-daylight-sky',
        title: 'Testigos-PL',
        subtitle: 'Sistema de Testigos Electorales',
        client: 'Partido Liberal — Cundinamarca 2026',
        description:
            'Dashboard en tiempo real para gestión de testigos en mesas electorales. Captura digital de actas E-14, KPIs en vivo, y control multi-rol para coordinadores, líderes y analistas.',
        features: [
            'Dashboard de mesas en tiempo real',
            'Captura de actas E-14 + fotos',
            'Roles: Testigo / Líder / Analista / Admin',
            'KPIs electorales actualizados en vivo',
        ],
        stack: ['Next.js 16', 'Supabase', 'React 19', 'PostgreSQL'],
        Icon: ShieldCheck,
        stat: { value: '4', label: 'franjas horarias monitoreadas' },
        accentColor: 'text-daylight-sky',
        borderColor: 'hover:border-daylight-sky/30',
    },
    {
        id: 'geodemografico',
        badge: 'Análisis Territorial',
        badgeGradient: 'from-tiffany to-daylight-sky',
        title: 'Geodemográfico',
        subtitle: 'Dashboard de Segmentación Electoral',
        client: 'Cambio Radical Colombia',
        description:
            'Análisis geodemográfico avanzado para campañas políticas. Segmentación por departamentos, municipios y provincias. Cruce de variables: edad, género, ocupación y comportamiento electoral.',
        features: [
            'Mapa interactivo por municipio/provincia',
            'Segmentación demográfica multivariable',
            'Análisis de comportamiento por territorio',
            'Dashboard exportable para equipos de campaña',
        ],
        stack: ['Google Apps Script', 'Google Sheets', 'JavaScript'],
        Icon: Map,
        stat: { value: '32', label: 'departamentos' },
        accentColor: 'text-tiffany',
        borderColor: 'hover:border-tiffany/30',
    },
    {
        id: 'formulario-dash',
        badge: 'CRM Político',
        badgeGradient: 'from-daylight-sky to-tiffany',
        title: 'Dash Rojo',
        subtitle: 'CRM de Aliados Políticos',
        client: 'Partido Liberal Colombia',
        description:
            'Captura inteligente de aliados y círculos de confianza. Formulario con autocomplete de líderes, cascada departamento → municipio, y dashboard de cobertura territorial por zona.',
        features: [
            'Autocomplete de líderes registrados',
            'Cascada departamento → municipio',
            'Dashboard de cobertura por región',
            'Gestión de círculos de confianza',
        ],
        stack: ['Google Apps Script', 'Google Sheets', 'HTML/CSS'],
        Icon: Users,
        stat: { value: '∞', label: 'escalable sin límite' },
        accentColor: 'text-daylight-sky',
        borderColor: 'hover:border-daylight-sky/20',
    },
]

const impactMetrics = [
    { label: 'Cundinamarca 2026', sub: 'Cobertura electoral total' },
    { label: 'Partido Liberal COL', sub: 'Aliados y testigos gestionados' },
    { label: 'Cambio Radical COL', sub: 'Análisis geodemográfico' },
]

export default function PublicSectorSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const headerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const metricsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            ctx = gsap.context(() => {
                // Header reveal
                if (headerRef.current) {
                    gsap.from(headerRef.current, {
                        opacity: 0,
                        y: 40,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: headerRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                    })
                }

                const isDesktop = window.innerWidth >= 1024

                if (isDesktop && trackRef.current && sectionRef.current) {
                    // Scroll horizontal pinned en desktop
                    const track = trackRef.current
                    const totalScroll = track.scrollWidth - window.innerWidth + 120

                    gsap.to(track, {
                        x: -totalScroll,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top top',
                            end: `+=${totalScroll}`,
                            pin: true,
                            scrub: 0.8,
                            anticipatePin: 1,
                        },
                    })
                } else {
                    // Mobile: fade-in stagger vertical
                    cardRefs.current.forEach((card, i) => {
                        if (!card) return
                        gsap.from(card, {
                            opacity: 0,
                            y: 50,
                            duration: 0.7,
                            ease: 'power3.out',
                            delay: i * 0.12,
                            scrollTrigger: {
                                trigger: card,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })
                    })
                }

                // Métricas de impacto
                if (metricsRef.current) {
                    gsap.from(metricsRef.current.children, {
                        opacity: 0,
                        y: 30,
                        stagger: 0.15,
                        duration: 0.7,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: metricsRef.current,
                            start: 'top 85%',
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

    return (
        <section
            ref={sectionRef}
            id="sector-publico"
            className="bg-[#0a0f1e] text-white overflow-hidden"
        >
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Header */}
            <div
                ref={headerRef}
                className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 text-center"
            >
                <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2 mb-6">
                    Sector Público · Tecnología Electoral
                </span>
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
                    Donde la Tecnología{' '}
                    <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">
                        Impacta a Millones
                    </span>
                </h2>
                <p className="text-lg text-white/50 max-w-2xl mx-auto font-light">
                    Desarrollamos plataformas de misión crítica para campañas políticas y gestión electoral
                    en Colombia. Precisión, tiempo real y seguridad cuando más importa.
                </p>
            </div>

            {/* Cards — scroll horizontal en desktop, vertical en mobile */}
            <div className="relative z-10 overflow-visible">
                <div
                    ref={trackRef}
                    className="flex gap-6 px-4 sm:px-6 lg:px-20 pb-28 lg:pb-36 flex-col lg:flex-row"
                >
                    {projects.map((project, index) => {
                        const { Icon } = project
                        return (
                            <div
                                key={project.id}
                                ref={(el) => { cardRefs.current[index] = el }}
                                className={`flex-shrink-0 w-full lg:w-[460px] rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8 transition-all duration-500 ${project.borderColor} hover:bg-white/[0.06] group`}
                            >
                                {/* Badge + Client */}
                                <div className="flex items-start justify-between mb-6">
                                    <span
                                        className={`text-xs font-semibold tracking-wider uppercase bg-gradient-to-r ${project.badgeGradient} bg-clip-text text-transparent border border-white/10 rounded-full px-3 py-1.5`}
                                    >
                                        {project.badge}
                                    </span>
                                    <span className="text-xs text-white/30 font-medium text-right max-w-[140px] leading-tight">
                                        {project.client}
                                    </span>
                                </div>

                                {/* Icon */}
                                <div
                                    className={`w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}
                                >
                                    <Icon className={project.accentColor} size={28} />
                                </div>

                                {/* Title */}
                                <h3 className="text-2xl font-heading font-bold mb-1">{project.title}</h3>
                                <p className="text-sm text-white/40 mb-4 font-medium">{project.subtitle}</p>

                                {/* Description */}
                                <p className="text-sm text-white/55 leading-relaxed mb-6">
                                    {project.description}
                                </p>

                                {/* Features */}
                                <ul className="space-y-2.5 mb-6">
                                    {project.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2.5">
                                            <CheckCircle2
                                                className={`${project.accentColor} flex-shrink-0 mt-0.5`}
                                                size={15}
                                            />
                                            <span className="text-sm text-white/65">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Stack tags */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {project.stack.map((tech) => (
                                        <span
                                            key={tech}
                                            className="text-xs text-white/40 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>

                                {/* Stat */}
                                <div className="pt-5 border-t border-white/8 flex items-end justify-between">
                                    <div>
                                        <div className={`text-3xl font-bold font-heading ${project.accentColor}`}>
                                            {project.stat.value}
                                        </div>
                                        <div className="text-xs text-white/35 mt-1">{project.stat.label}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-daylight-sky/40 transition-colors">
                                        <Icon className="text-white/30 group-hover:text-daylight-sky transition-colors" size={14} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Métricas de impacto */}
            <div className="relative z-10 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div
                        ref={metricsRef}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center"
                    >
                        {impactMetrics.map((metric) => (
                            <div key={metric.label} className="space-y-1">
                                <div className="text-base font-semibold text-white/80">{metric.label}</div>
                                <div className="text-xs text-white/35 tracking-wide">{metric.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
