'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Calendar, Package, Zap, TrendingUp, LucideIcon, Briefcase } from 'lucide-react'

// Map categories to icons
const iconMap: Record<string, LucideIcon> = {
    'ERP/CRM': Package,
    'Agendamiento': Calendar,
    'E-commerce': ShoppingCart,
    'Automatización': Zap,
    'General': Briefcase
}

interface Project {
    id: string
    title: string
    description: string
    category: string
    tags: string // JSON string
    clientName: string | null
    results: string | null
}

interface CustomSolutionsProps {
    projects?: Project[]
}

const defaultSolutions = [
    {
        id: '1',
        title: 'Sistemas de Gestión Integral (ERP/CRM)',
        description: 'Sistemas completos para gestión de ventas, control de stock, órdenes de venta, producción personalizada y gestión de clientes.',
        category: 'ERP/CRM',
        tags: '["Ventas", "Stock", "CRM", "Producción"]',
        clientName: 'Lubricentro',
        results: '40% reducción en tiempo administrativo',
    },
    {
        id: '2',
        title: 'Sistemas de Reservación y Agendamiento',
        description: 'Gestión de citas y turnos en tiempo real con agenda automatizada, respuestas inteligentes y formularios avanzados.',
        category: 'Agendamiento',
        tags: '["Reservas", "Turnos", "Automatización"]',
        clientName: 'Sistema de Turnos',
        results: '70% reducción en llamadas',
    },
    {
        id: '3',
        title: 'Comercio Electrónico y E-commerce',
        description: 'Páginas de venta con seguimiento de inventario automatizado y panel de administración personalizado.',
        category: 'E-commerce',
        tags: '["Tienda Online", "Inventario", "Pagos"]',
        clientName: 'E-commerce Personalizado',
        results: '150% aumento en ventas online',
    },
    {
        id: '4',
        title: 'Automatización de Procesos',
        description: 'Reducción de tareas repetitivas, optimización de tiempo administrativo y flujos automáticos personalizados.',
        category: 'Automatización',
        tags: '["Bots", "Workflows", "Eficiencia"]',
        clientName: 'Automatización Colaborativa',
        results: '80% ahorro de tiempo',
    },
]

export default function CustomSolutions({ projects = defaultSolutions }: CustomSolutionsProps) {
    return (
        <section id="soluciones" className="py-24 bg-gradient-to-b from-gray-50 to-white">
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
                        Soluciones 100% a Medida
                    </h2>
                    <p className="text-xl text-slate max-w-3xl mx-auto">
                        Desarrollamos sistemas robustos adaptados a las necesidades específicas de tu negocio
                    </p>
                </motion.div>

                {/* Solutions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
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
                            >
                                <Card className="h-full hover-lift hover-glow group">
                                    <CardHeader>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <Icon className="text-white" size={28} />
                                            </div>
                                            <Badge variant="secondary">{project.category}</Badge>
                                        </div>
                                        <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
                                        <CardDescription>{project.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2">
                                            {tagsList.map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Examples/Results */}
                                        {(project.clientName || project.results) && (
                                            <div className="space-y-3 pt-4 border-t border-gray-200">
                                                <div className="space-y-1">
                                                    {project.clientName && (
                                                        <div className="flex items-center space-x-2">
                                                            <TrendingUp className="text-teal flex-shrink-0" size={16} />
                                                            <span className="font-semibold text-sm text-egyptian">{project.clientName}</span>
                                                        </div>
                                                    )}
                                                    {project.results && (
                                                        <p className="text-xs font-semibold text-daylight-sky pl-6">{project.results}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
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
