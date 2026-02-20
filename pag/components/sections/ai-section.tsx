'use client'

import { motion } from 'framer-motion'
import { Brain, Bot, Workflow, Sparkles, LucideIcon } from 'lucide-react'

const aiFeatures: { icon: LucideIcon; title: string; description: string }[] = [
    {
        icon: Brain,
        title: 'Modelos Predictivos',
        description: 'Análisis avanzado de datos con machine learning para predecir tendencias y optimizar decisiones.',
    },
    {
        icon: Bot,
        title: 'Asistentes Digitales y Bots',
        description: 'Chatbots inteligentes y asistentes virtuales que mejoran la atención al cliente.',
    },
    {
        icon: Workflow,
        title: 'Automatización con IA',
        description: 'Procesos inteligentes que aprenden y se adaptan, reduciendo errores humanos.',
    },
    {
        icon: Sparkles,
        title: 'Integraciones Inteligentes',
        description: 'Conexión de sistemas existentes con capacidades de IA para análisis en tiempo real.',
    },
]

export default function AISection() {
    const handleConsultar = () => {
        const message = encodeURIComponent("Hola, me interesa consultar sobre soluciones de Inteligencia Artificial")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <section id="ia" className="py-28 bg-[#0a0f1e] text-white relative overflow-hidden">
            {/* Subtle background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
            }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-daylight-sky/10 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2 mb-6">
                        Inteligencia Artificial
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
                        Potencia tu Negocio con{' '}
                        <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">IA</span>
                    </h2>
                    <p className="text-lg text-white/50 max-w-2xl mx-auto font-light">
                        Soluciones de inteligencia artificial que transforman datos en decisiones estratégicas
                    </p>
                </motion.div>

                {/* AI Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {aiFeatures.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="h-full p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-daylight-sky/20 transition-all duration-500">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-daylight-sky/20 to-tiffany/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                                        <Icon className="text-daylight-sky" size={22} />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
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
                    <button
                        onClick={handleConsultar}
                        className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:scale-[1.02]"
                    >
                        Consultar Soluciones de IA
                    </button>
                </motion.div>
            </div>
        </section>
    )
}
