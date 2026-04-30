'use client'

import { useEffect, useRef } from 'react'

import { motion } from 'framer-motion'
import { ShoppingCart, Calendar, Package, Zap, TrendingUp, LucideIcon, Briefcase, Smartphone, Globe, LayoutDashboard } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
    'ERP/CRM': Package,
    'Agendamiento': Calendar,
    'E-commerce': ShoppingCart,
    'Automatización': Zap,
    'App Móvil': Smartphone,
    'Desarrollo Web': Globe,
    'Dashboard': LayoutDashboard,
    'General': Briefcase
}

interface Project {
    id: string
    title: string
    description: string
    category: string
    tags: string
    clientName: string | null
    results: string | null
}

interface CustomSolutionsProps {
    projects?: Project[]
}

const defaultSolutions = [
    {
        id: '1',
        title: 'Aplicaciones Móviles Nativas',
        description: 'Apps iOS y Android a medida con experiencia de usuario premium. Desde MVPs hasta plataformas de escala con integraciones de pago, notificaciones push y backend propio.',
        category: 'App Móvil',
        tags: '["iOS", "Android", "React Native", "UX Premium"]',
        clientName: null,
        results: '3x más retención vs apps genéricas',
    },
    {
        id: '2',
        title: 'Plataformas Web Full-Stack',
        description: 'Sitios y sistemas web de alto rendimiento: landing pages, portales corporativos, SaaS y marketplaces. SEO técnico, velocidad de carga optimizada y diseño que convierte.',
        category: 'Desarrollo Web',
        tags: '["Next.js", "SEO", "Performance", "CMS"]',
        clientName: null,
        results: '90+ Lighthouse score garantizado',
    },
    {
        id: '3',
        title: 'Dashboards y Paneles de Control',
        description: 'Visualización de datos en tiempo real, KPIs ejecutivos, reportes interactivos y business intelligence. Conectamos tus fuentes de datos y los convertimos en decisiones.',
        category: 'Dashboard',
        tags: '["BI", "Tiempo Real", "KPIs", "Analytics"]',
        clientName: null,
        results: '+60% velocidad de decisión',
    },
    {
        id: '4',
        title: 'Sistemas ERP/CRM a Medida',
        description: 'Gestión integral de ventas, stock, producción y clientes. Sin licencias costosas: software 100% propio que crece con tu empresa y se adapta a tus procesos.',
        category: 'ERP/CRM',
        tags: '["Ventas", "Inventario", "CRM", "Producción"]',
        clientName: null,
        results: '40% reducción en tiempo administrativo',
    },
    {
        id: '5',
        title: 'E-commerce y Tiendas Online',
        description: 'Plataformas de venta online con gestión de inventario automatizada, múltiples medios de pago, panel de administración y estrategia de conversión integrada.',
        category: 'E-commerce',
        tags: '["Tienda Online", "Pagos", "Inventario", "Conversión"]',
        clientName: null,
        results: '150% aumento en ventas online',
    },
    {
        id: '6',
        title: 'Automatización de Procesos',
        description: 'Eliminamos tareas repetitivas con flujos automáticos, bots e integraciones entre sistemas. Desde notificaciones hasta pipelines de datos complejos sin intervención humana.',
        category: 'Automatización',
        tags: '["Bots", "Workflows", "Integraciones", "Eficiencia"]',
        clientName: null,
        results: '80% ahorro de tiempo operativo',
    },
]

export default function CustomSolutions({ projects = defaultSolutions }: CustomSolutionsProps) {
    const sectionRef = useRef<HTMLElement>(null)
    const labelRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')
            ctx = gsap.context(() => {
                if (labelRef.current) {
                    gsap.from(labelRef.current, {
                        x: -30,
                        opacity: 0,
                        duration: 0.7,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 80%',
                            toggleActions: 'play none none none',
                        },
                    })
                }
            })
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    return (
        <section ref={sectionRef} id="soluciones" className="py-28 bg-gray-50/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span ref={labelRef} className="text-sm font-medium tracking-widest uppercase text-daylight-sky mb-4 block">
                        Soluciones
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold text-egyptian mb-5">
                        100% a Medida
                    </h2>
                    <p className="text-lg text-slate max-w-2xl mx-auto font-light">
                        Sistemas robustos adaptados a las necesidades específicas de tu negocio
                    </p>
                </motion.div>

                {/* Solutions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project, index) => {
                        const Icon = iconMap[project.category] || Briefcase
                        const tagsList = JSON.parse(project.tags) as string[]

                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="h-full p-8 rounded-2xl border border-gray-100 bg-white hover:border-daylight-sky/30 hover:shadow-xl hover:shadow-daylight-sky/5 transition-all duration-500">
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-[#0a0f1e] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                            <Icon className="text-tiffany" size={24} />
                                        </div>
                                        <span className="text-xs font-medium tracking-wider uppercase text-daylight-sky bg-daylight-sky/10 px-3 py-1.5 rounded-full">
                                            {project.category}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-heading font-bold text-egyptian mb-3">
                                        {project.title}
                                    </h3>
                                    <p className="text-slate text-sm leading-relaxed mb-5">
                                        {project.description}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {tagsList.map((tag) => (
                                            <span key={tag} className="text-xs text-outer-space bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Results */}
                                    {project.results && (
                                        <div className="flex items-center gap-2 pt-5 border-t border-gray-100">
                                            <TrendingUp className="text-tiffany flex-shrink-0" size={16} />
                                            <span className="text-sm font-semibold text-egyptian">{project.results}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
