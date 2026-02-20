'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Send, MessageCircle, CheckCircle } from 'lucide-react'

interface ContactCTAProps {
    whatsappNumber?: string | null
    whatsappMessage?: string | null
}

export default function ContactCTA({
    whatsappNumber = "5491163515966",
    whatsappMessage = "Hola, me gustaría agendar un Diagnóstico de Madurez Digital"
}: ContactCTAProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Try to save to DB
            await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    whatsapp: formData.phone,
                    conversationSummary: `Formulario de contacto: ${formData.message || 'Sin mensaje'}. Empresa: ${formData.company || 'No especificó'}`
                })
            }).catch(() => { /* DB might not be available */ })
        } catch {
            /* continue anyway */
        }

        // Always redirect to WhatsApp as the main action
        const message = `Hola, soy ${formData.name}${formData.company ? ` de ${formData.company}` : ''}. Me gustaría agendar un Diagnóstico de Madurez Digital.${formData.message ? `\n\n${formData.message}` : ''}`
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')

        setIsSubmitting(false)
        setIsSubmitted(true)
        setTimeout(() => setIsSubmitted(false), 5000)
    }

    const handleWhatsAppClick = () => {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage || '')}`, '_blank')
    }

    return (
        <section id="contacto" className="py-28 bg-gray-50/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Side - Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-sm font-medium tracking-widest uppercase text-daylight-sky mb-4 block">
                            Contacto
                        </span>
                        <h2 className="text-3xl md:text-4xl font-heading font-bold text-egyptian mb-6 leading-tight">
                            Agenda tu Diagnóstico de Madurez Digital
                        </h2>
                        <p className="text-lg text-slate mb-10 font-light leading-relaxed">
                            Descubrí el potencial de transformación digital de tu organización con una evaluación gratuita y personalizada.
                        </p>

                        <div className="space-y-6 mb-10">
                            {[
                                { step: '01', title: 'Análisis Inicial', desc: 'Evaluamos el estado actual de tu organización' },
                                { step: '02', title: 'Propuesta Personalizada', desc: 'Diseñamos una hoja de ruta adaptada a tus necesidades' },
                                { step: '03', title: 'Implementación', desc: 'Te acompañamos en cada paso del proceso' },
                            ].map((item) => (
                                <div key={item.step} className="flex items-start gap-4">
                                    <span className="text-xs font-bold text-daylight-sky bg-daylight-sky/10 px-2.5 py-1 rounded-full mt-0.5">
                                        {item.step}
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-egyptian text-sm">{item.title}</h4>
                                        <p className="text-sm text-slate">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* WhatsApp CTA */}
                        <button
                            onClick={handleWhatsAppClick}
                            className="group flex items-center gap-3 px-6 py-4 rounded-2xl border border-gray-200 hover:border-tiffany/30 hover:bg-tiffany/5 transition-all duration-300 w-full"
                        >
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <MessageCircle className="text-green-500" size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-egyptian">¿Preferís WhatsApp?</p>
                                <p className="text-xs text-slate">Contactanos directamente y agenda tu diagnóstico</p>
                            </div>
                        </button>
                    </motion.div>

                    {/* Right Side - Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8 space-y-5">
                            {isSubmitted && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 bg-tiffany/10 border border-tiffany/20 rounded-xl p-3"
                                >
                                    <CheckCircle className="text-tiffany" size={18} />
                                    <span className="text-sm text-egyptian font-medium">¡Mensaje enviado! Te contactaremos pronto.</span>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="contact-name" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                        Nombre *
                                    </label>
                                    <input
                                        id="contact-name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Juan Pérez"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                        Email *
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@empresa.com"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="contact-phone" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                        Teléfono
                                    </label>
                                    <input
                                        id="contact-phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+57 300 000 0000"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contact-company" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                        Empresa
                                    </label>
                                    <input
                                        id="contact-company"
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Mi Empresa S.A.S."
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="contact-message" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                    Mensaje
                                </label>
                                <textarea
                                    id="contact-message"
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Contanos sobre tu proyecto o necesidad..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-daylight-sky focus:ring-2 focus:ring-daylight-sky/10 outline-none transition-all text-sm resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-[#0a0f1e] hover:bg-egyptian text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 hover:shadow-lg"
                            >
                                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                                <Send size={16} />
                            </button>

                            <p className="text-xs text-slate text-center">
                                Al enviar, aceptás nuestra <a href="/privacidad" className="text-daylight-sky hover:underline">Política de Privacidad</a>
                            </p>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
