'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'

interface HeroProps {
    title?: string
    subtitle?: string
    ctaText?: string
    whatsappNumber?: string
}

export default function Hero({
    title = "Soluciones digitales a medida para tu negocio",
    subtitle = "Impulsamos la mejora continua, la eficiencia y la adopción inteligente de tecnología. Sistemas y herramientas digitales robustas, creadas 100% a medida.",
    ctaText = "Agenda tu Diagnóstico Gratuito",
    whatsappNumber = "5491163515966"
}: HeroProps) {

    const handleCTA = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital")
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
    }

    const scrollToServices = () => {
        document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0f1e]">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
            }} />

            {/* Minimal gradient orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-egyptian/20 via-daylight-sky/5 to-transparent rounded-full blur-3xl" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="text-center space-y-10">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="inline-block text-sm font-medium tracking-widest uppercase text-daylight-sky/80 border border-daylight-sky/20 rounded-full px-5 py-2">
                            Transformación Digital con Propósito
                        </span>
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-white leading-[1.1] tracking-tight"
                    >
                        {title.split(' ').map((word, i) => {
                            const accentWords = ['digitales', 'medida', 'negocio']
                            if (accentWords.includes(word.toLowerCase())) {
                                return <span key={i} className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">{word} </span>
                            }
                            return <span key={i}>{word} </span>
                        })}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {subtitle}
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <button
                            onClick={handleCTA}
                            className="group flex items-center gap-2 bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
                        >
                            {ctaText}
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                        </button>
                        <button
                            onClick={scrollToServices}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-medium px-6 py-4 rounded-full border border-white/10 hover:border-white/25 transition-all duration-300"
                        >
                            Conocer más
                        </button>
                    </motion.div>

                    {/* Minimal Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="flex items-center justify-center gap-12 md:gap-16 pt-16"
                    >
                        {[
                            { value: '100%', label: 'A Medida' },
                            { value: '24/7', label: 'Soporte' },
                            { value: '+50', label: 'Proyectos' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-xs md:text-sm text-white/40 uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <motion.button
                onClick={scrollToServices}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ArrowDown size={24} />
                </motion.div>
            </motion.button>
        </section>
    )
}
