'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Brain, Bot, Workflow, Sparkles } from 'lucide-react'

const aiFeatures = [
    {
        icon: Brain,
        title: 'Modelos Predictivos',
        description: 'Análisis avanzado de datos con machine learning para predecir tendencias y optimizar decisiones de negocio.',
    },
    {
        icon: Bot,
        title: 'Asistentes Digitales y Bots',
        description: 'Chatbots inteligentes y asistentes virtuales que mejoran la atención al cliente y automatizan respuestas.',
    },
    {
        icon: Workflow,
        title: 'Automatización Avanzada con IA',
        description: 'Procesos inteligentes que aprenden y se adaptan, reduciendo errores y aumentando la eficiencia operativa.',
    },
    {
        icon: Sparkles,
        title: 'Integraciones Inteligentes',
        description: 'Conexión de sistemas existentes con capacidades de IA para flujos automáticos y análisis en tiempo real.',
    },
]

export default function AISection() {
    return (
        <section id="ia" className="py-24 bg-gradient-to-br from-egyptian via-indigo to-denim text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-daylight-sky/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-turquoise/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-6">
                        <Sparkles className="text-daylight-sky" size={20} />
                        <span className="font-medium">Inteligencia Artificial</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
                        Potencia tu Negocio con IA
                    </h2>
                    <p className="text-xl text-white/80 max-w-3xl mx-auto">
                        Implementamos soluciones de inteligencia artificial que transforman datos en decisiones estratégicas
                    </p>
                </motion.div>

                {/* AI Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {aiFeatures.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                            >
                                <div className="glass rounded-xl p-6 h-full hover-lift hover-glow group">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Icon className="text-white" size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-white/70">{feature.description}</p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-16"
                >
                    <p className="text-lg text-white/90 mb-6">
                        ¿Listo para implementar IA en tu organización?
                    </p>
                    <button className="bg-white text-egyptian px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-300 shadow-xl">
                        Consultar Soluciones de IA
                    </button>
                </motion.div>
            </div>
        </section>
    )
}
