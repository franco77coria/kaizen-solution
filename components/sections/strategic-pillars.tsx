'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Lightbulb, BarChart3, Cloud, CheckCircle, LucideIcon } from 'lucide-react'

// Map icon names to components
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
    features: string // JSON string
    // We can add color mapping logic if needed, or cycle through colors
}

interface StrategicPillarsProps {
    services?: Service[]
}

const defaultServices = [
    {
        id: '1',
        icon: 'Lightbulb',
        title: 'Consultoría Estratégica en TI',
        description: 'Diseño y estructuración de PETI (Planes Estratégicos de TI), alineación estratégica tecnología-negocio.',
        features: '["Diseño de PETI", "Alineación estratégica", "Diagnóstico de madurez", "Asesoría en seguridad"]',
    },
    {
        id: '2',
        icon: 'BarChart3',
        title: 'Analítica y Business Intelligence',
        description: 'Implementación de tableros interactivos y KPIs, visualización en tiempo real del desempeño.',
        features: '["Tableros interactivos", "KPIs en tiempo real", "Análisis de datos", "Oportunidades de mejora"]',
    },
    {
        id: '3',
        icon: 'Cloud',
        title: 'Adopción e Implementación',
        description: 'Despliegue de herramientas productivas, migración de correo y datos, automatización.',
        features: '["Google Workspace", "Migración a la nube", "Automatización", "Capacitación"]',
    }
]

const colors = [
    'from-egyptian to-azure',
    'from-daylight-sky to-turquoise',
    'from-tiffany to-teal'
]

export default function StrategicPillars({ services = defaultServices }: StrategicPillarsProps) {
    return (
        <section id="servicios" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-heading font-bold text-egyptian mb-4">
                        Pilares Estratégicos
                    </h2>
                    <p className="text-xl text-slate max-w-3xl mx-auto">
                        Servicios especializados para impulsar la transformación digital de tu organización
                    </p>
                </motion.div>

                {/* Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((service, index) => {
                        const Icon = (service.icon && iconMap[service.icon]) ? iconMap[service.icon] : Lightbulb
                        const featuresList = JSON.parse(service.features) as string[]
                        const color = colors[index % colors.length]

                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                            >
                                <Card className="h-full hover-lift hover-glow group">
                                    <CardHeader>
                                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="text-white" size={32} />
                                        </div>
                                        <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                                        <CardDescription className="text-base">{service.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {featuresList.map((feature, i) => (
                                                <li key={i} className="flex items-start space-x-2">
                                                    <CheckCircle className="text-daylight-sky flex-shrink-0 mt-0.5" size={18} />
                                                    <span className="text-sm text-slate">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
