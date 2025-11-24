'use client'

import { motion } from 'framer-motion'
import { TrendingUp, FileCheck, Rocket, Users, DollarSign, Clock } from 'lucide-react'

const benefits = [
    {
        icon: TrendingUp,
        title: 'Mayor Productividad y Colaboración',
        description: 'Herramientas que potencian el trabajo en equipo y aumentan la eficiencia operativa.',
    },
    {
        icon: FileCheck,
        title: 'Procesos Documentados y Estandarizados',
        description: 'Metodologías claras que aseguran la calidad y consistencia en cada proyecto.',
    },
    {
        icon: Rocket,
        title: 'Transformación Digital Accesible',
        description: 'Soluciones escalables y prácticas adaptadas a tu presupuesto y necesidades.',
    },
    {
        icon: Users,
        title: 'Acompañamiento Integral',
        description: 'Desde la planeación hasta la operación, estamos contigo en cada paso.',
    },
    {
        icon: DollarSign,
        title: 'Ahorro en Costos',
        description: 'Optimización de recursos y reducción de gastos operativos innecesarios.',
    },
    {
        icon: Clock,
        title: 'Ahorro de Tiempo',
        description: 'Automatización de tareas repetitivas para enfocarte en lo que realmente importa.',
    },
]

export default function Benefits() {
    return (
        <section id="beneficios" className="py-24 bg-white">
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
                        Beneficios Tangibles
                    </h2>
                    <p className="text-xl text-slate max-w-3xl mx-auto">
                        Resultados medibles que impactan directamente en el crecimiento de tu organización
                    </p>
                </motion.div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {benefits.map((benefit, index) => {
                        const Icon = benefit.icon
                        return (
                            <motion.div
                                key={benefit.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="group"
                            >
                                <div className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-gradient-to-br hover:from-sky/10 hover:to-tiffany/10 transition-all duration-300 hover-lift">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Icon className="text-white" size={28} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-egyptian mb-2">{benefit.title}</h3>
                                    <p className="text-slate">{benefit.description}</p>
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
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-16 text-center bg-gradient-to-r from-egyptian to-daylight-sky rounded-2xl p-12 text-white"
                >
                    <h3 className="text-3xl font-heading font-bold mb-4">
                        ¿Listo para transformar tu negocio?
                    </h3>
                    <p className="text-lg mb-6 text-white/90">
                        Comienza con un diagnóstico gratuito de madurez digital
                    </p>
                    <button className="bg-white text-egyptian px-8 py-4 rounded-lg font-semibold hover:scale-105 transition-transform duration-300 shadow-xl">
                        Agendar Diagnóstico Gratuito
                    </button>
                </motion.div>
            </div>
        </section>
    )
}
