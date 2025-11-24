'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send } from 'lucide-react'

interface ContactCTAProps {
    whatsappNumber?: string | null
    whatsappMessage?: string | null
}

export default function ContactCTA({
    whatsappNumber = "573000000000",
    whatsappMessage = "Hola, me gustaría agendar un Diagnóstico de Madurez Digital"
}: ContactCTAProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement form submission
        const message = `Hola, me gustaría agendar un Diagnóstico de Madurez Digital. Mi nombre es ${formData.name}, empresa: ${formData.company}`
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')
    }

    const handleWhatsAppClick = () => {
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage || '')}`
        window.open(url, '_blank')
    }

    return (
        <section id="contacto" className="py-24 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left Side - Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-heading font-bold text-egyptian mb-6">
                            Agenda tu Diagnóstico de Madurez Digital
                        </h2>
                        <p className="text-xl text-slate mb-8">
                            Descubre el potencial de transformación digital de tu organización con una evaluación gratuita y personalizada.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white text-xs font-bold">1</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-egyptian mb-1">Análisis Inicial</h4>
                                    <p className="text-sm text-slate">Evaluamos el estado actual de tu organización</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white text-xs font-bold">2</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-egyptian mb-1">Propuesta Personalizada</h4>
                                    <p className="text-sm text-slate">Diseñamos una hoja de ruta adaptada a tus necesidades</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-daylight-sky to-turquoise flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white text-xs font-bold">3</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-egyptian mb-1">Implementación y Soporte</h4>
                                    <p className="text-sm text-slate">Te acompañamos en cada paso del proceso</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-6 bg-gradient-to-br from-egyptian/5 to-daylight-sky/5 rounded-xl border border-daylight-sky/20">
                            <div className="flex items-center space-x-3 mb-2">
                                <MessageSquare className="text-daylight-sky" size={24} />
                                <h4 className="font-semibold text-egyptian">¿Prefieres WhatsApp?</h4>
                            </div>
                            <p className="text-sm text-slate mb-4">
                                Contáctanos directamente y agenda tu diagnóstico
                            </p>
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={handleWhatsAppClick}
                            >
                                <MessageSquare size={18} className="mr-2" />
                                Abrir WhatsApp
                            </Button>
                        </div>
                    </motion.div>

                    {/* Right Side - Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-egyptian mb-2">
                                    Nombre completo *
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-egyptian mb-2">
                                    Correo electrónico *
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="juan@empresa.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-egyptian mb-2">
                                    Teléfono
                                </label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+57 300 000 0000"
                                />
                            </div>

                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-egyptian mb-2">
                                    Empresa
                                </label>
                                <Input
                                    id="company"
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    placeholder="Mi Empresa S.A.S."
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-egyptian mb-2">
                                    Mensaje
                                </label>
                                <Textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Cuéntanos sobre tu proyecto o necesidad..."
                                />
                            </div>

                            <Button type="submit" size="lg" variant="primary" className="w-full">
                                Enviar Solicitud
                                <Send size={18} className="ml-2" />
                            </Button>

                            <p className="text-xs text-slate text-center">
                                Al enviar este formulario, aceptas que nos pongamos en contacto contigo
                            </p>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
