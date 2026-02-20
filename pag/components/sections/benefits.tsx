'use client'

import { motion } from 'framer-motion'
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
    const handleDiagnostico = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital gratuito")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <section id="beneficios" className="py-28 bg-white">
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
                        Beneficios
                    </span>
                    <h2 className="text-3xl md:text-5xl font-heading font-bold text-egyptian mb-5">
                        Resultados Tangibles
                    </h2>
                    <p className="text-lg text-slate max-w-2xl mx-auto font-light">
                        Impacto directo en el crecimiento de tu organización
                    </p>
                </motion.div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit, index) => {
                        const Icon = benefit.icon
                        return (
                            <motion.div
                                key={benefit.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.08 }}
                                className="group"
                            >
                                <div className="flex items-start gap-4 p-6 rounded-2xl hover:bg-gray-50/80 transition-all duration-300">
                                    <div className="w-11 h-11 rounded-xl bg-[#0a0f1e] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <Icon className="text-tiffany" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-egyptian mb-1">{benefit.title}</h3>
                                        <p className="text-sm text-slate leading-relaxed">{benefit.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-20 text-center bg-[#0a0f1e] rounded-3xl p-12 md:p-16 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-radial from-daylight-sky/10 to-transparent opacity-50" />
                    <div className="relative z-10">
                        <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">
                            ¿Listo para transformar tu negocio?
                        </h3>
                        <p className="text-white/50 mb-8 max-w-lg mx-auto font-light">
                            Comienza con un diagnóstico gratuito de madurez digital
                        </p>
                        <button
                            onClick={handleDiagnostico}
                            className="bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
                        >
                            Agendar Diagnóstico Gratuito
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
