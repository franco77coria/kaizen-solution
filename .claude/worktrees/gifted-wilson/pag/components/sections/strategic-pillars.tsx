'use client'

import { motion } from 'framer-motion'
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
    return (
        <section id="servicios" className="py-28 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="text-sm font-medium tracking-widest uppercase text-daylight-sky mb-4 block">
                        Servicios
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold text-egyptian mb-5">
                        Pilares Estratégicos
                    </h2>
                    <p className="text-lg text-slate max-w-2xl mx-auto font-light">
                        Servicios especializados para impulsar la transformación digital de tu organización
                    </p>
                </motion.div>

                {/* Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service, index) => {
                        const Icon = (service.icon && iconMap[service.icon]) ? iconMap[service.icon] : Lightbulb
                        const featuresList = JSON.parse(service.features) as string[]

                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                className="group"
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
                                            <li key={i} className="flex items-center gap-2.5">
                                                <CheckCircle className="text-tiffany flex-shrink-0" size={16} />
                                                <span className="text-sm text-outer-space">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
