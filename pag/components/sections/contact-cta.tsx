'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react'

interface ContactCTAProps {
    whatsappNumber?: string | null
    whatsappMessage?: string | null
}

export default function ContactCTA({
    whatsappNumber = "5491163515966",
    whatsappMessage = "Hola, me gustaría agendar un Diagnóstico de Madurez Digital"
}: ContactCTAProps) {
    const sectionRef = useRef<HTMLElement>(null)
    const leftColRef = useRef<HTMLDivElement>(null)
    const rightColRef = useRef<HTMLDivElement>(null)
    const stepsRef = useRef<HTMLDivElement>(null)
    const formFieldsRef = useRef<HTMLFormElement>(null)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        website: '', // honeypot — oculto para personas, tentador para bots
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            const mm = gsap.matchMedia()

            mm.add(
                {
                    isDesktop: '(min-width: 1024px)',
                    isMobile: '(max-width: 1023px)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { isDesktop, reduceMotion } = context.conditions!
                    const dur = reduceMotion ? 0 : undefined

                    // ── Left column: slide from left (desktop) or fade up (mobile) ──
                    if (leftColRef.current) {
                        gsap.from(leftColRef.current, {
                            opacity: 0,
                            x: isDesktop ? -60 : 0,
                            y: isDesktop ? 0 : 30,
                            filter: reduceMotion ? 'none' : 'blur(6px)',
                            duration: dur ?? 0.9,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: sectionRef.current,
                                start: 'top 75%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Steps: staggered reveal with line connector ──
                    if (stepsRef.current && !reduceMotion) {
                        const steps = stepsRef.current.querySelectorAll('.contact-step')
                        gsap.from(steps, {
                            opacity: 0,
                            x: isDesktop ? -30 : -16,
                            duration: 0.6,
                            stagger: 0.15,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: stepsRef.current,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Right column (form): slide from right (desktop) or fade up (mobile) ──
                    if (rightColRef.current) {
                        gsap.from(rightColRef.current, {
                            opacity: 0,
                            x: isDesktop ? 60 : 0,
                            y: isDesktop ? 0 : 30,
                            scale: reduceMotion ? 1 : 0.96,
                            duration: dur ?? 0.9,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: isDesktop ? sectionRef.current : rightColRef.current,
                                start: isDesktop ? 'top 75%' : 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Form fields: stagger from below ──
                    if (formFieldsRef.current && !reduceMotion) {
                        const fields = formFieldsRef.current.querySelectorAll('.form-field')
                        gsap.from(fields, {
                            opacity: 0,
                            y: 20,
                            stagger: 0.06,
                            duration: 0.5,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: formFieldsRef.current,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                            delay: 0.3,
                        })
                    }

                    return () => {}
                }
            )

            ctx = { revert: () => mm.revert() }
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    // Link a WhatsApp precargado con los datos del formulario. Se renderiza como
    // <a> en el estado de éxito en vez de abrirse con window.open: después de un
    // await ya no estamos dentro del gesto del usuario y Safari bloquea el popup.
    const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Hola, soy ${formData.name}${formData.company ? ` de ${formData.company}` : ''}. Me gustaría agendar un Diagnóstico de Madurez Digital.${formData.message ? `\n\n${formData.message}` : ''}`
    )}`

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return

        setIsSubmitting(true)
        setErrorMsg(null)

        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    whatsapp: formData.phone,
                    company: formData.company,
                    message: formData.message,
                    website: formData.website,
                }),
            })

            if (!res.ok) {
                setErrorMsg(
                    res.status === 429
                        ? 'Enviaste varias solicitudes seguidas. Esperá unos minutos o escribinos por WhatsApp.'
                        : 'No pudimos registrar tu solicitud. Probá de nuevo o escribinos por WhatsApp.'
                )
                return
            }

            setIsSubmitted(true)
        } catch {
            setErrorMsg('Hubo un problema de conexión. Probá de nuevo o escribinos por WhatsApp.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleWhatsAppClick = () => {
        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage || '')}`, '_blank')
    }

    return (
        <section ref={sectionRef} id="contacto" className="py-28 bg-gray-50/50 overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Side - Info */}
                    <div ref={leftColRef}>
                        <span className="text-sm font-medium tracking-widest uppercase text-accent-ink mb-4 block">
                            Contacto
                        </span>
                        <h2 className="text-3xl md:text-4xl font-heading font-bold text-egyptian mb-6 leading-tight">
                            Agenda tu Diagnóstico de Madurez Digital
                        </h2>
                        <p className="text-lg text-slate mb-10 font-light leading-relaxed">
                            Descubrí el potencial de transformación digital de tu organización con una evaluación gratuita y personalizada.
                        </p>

                        <div ref={stepsRef} className="space-y-6 mb-10">
                            {[
                                { step: '01', title: 'Análisis Inicial', desc: 'Evaluamos el estado actual de tu organización' },
                                { step: '02', title: 'Propuesta Personalizada', desc: 'Diseñamos una hoja de ruta adaptada a tus necesidades' },
                                { step: '03', title: 'Implementación', desc: 'Te acompañamos en cada paso del proceso' },
                            ].map((item) => (
                                <div key={item.step} className="contact-step flex items-start gap-4">
                                    <span className="text-xs font-bold text-accent-ink bg-daylight-sky/10 px-2.5 py-1 rounded-full mt-0.5">
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
                    </div>

                    {/* Right Side - Form */}
                    <div ref={rightColRef}>
                        {isSubmitted ? (
                            <div
                                role="status"
                                className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8 text-center"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle className="text-teal-700" size={26} />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-egyptian mb-2">
                                    Recibimos tu solicitud, {formData.name.split(' ')[0]}
                                </h3>
                                <p className="text-sm text-outer-space mb-7 leading-relaxed">
                                    Te vamos a contactar dentro de las próximas 24 horas hábiles. Si preferís
                                    adelantar la conversación, escribinos ahora por WhatsApp.
                                </p>
                                <a
                                    href={whatsappHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 w-full bg-[#0a0f1e] hover:bg-egyptian text-white font-semibold py-4 rounded-xl transition-colors duration-300"
                                >
                                    <MessageCircle size={18} />
                                    Continuar por WhatsApp
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSubmitted(false)
                                        setFormData({ name: '', email: '', phone: '', company: '', message: '', website: '' })
                                    }}
                                    className="mt-4 text-sm text-outer-space hover:text-egyptian underline underline-offset-4"
                                >
                                    Enviar otra solicitud
                                </button>
                            </div>
                        ) : (
                        <form ref={formFieldsRef} onSubmit={handleSubmit} noValidate={false} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8 space-y-5">
                            {errorMsg && (
                                <div
                                    role="alert"
                                    className="form-field flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
                                >
                                    <AlertCircle className="text-red-700 flex-shrink-0 mt-0.5" size={18} />
                                    <span className="text-sm text-red-800">{errorMsg}</span>
                                </div>
                            )}

                            {/* Honeypot: fuera de pantalla, no en display:none (algunos bots lo detectan) */}
                            <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden">
                                <label htmlFor="contact-website">No completar este campo</label>
                                <input
                                    id="contact-website"
                                    type="text"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>

                            <div className="form-field grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-accent-ink focus:ring-2 focus:ring-accent-ink/20 outline-none transition-all text-sm"
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-accent-ink focus:ring-2 focus:ring-accent-ink/20 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="form-field grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-accent-ink focus:ring-2 focus:ring-accent-ink/20 outline-none transition-all text-sm"
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-accent-ink focus:ring-2 focus:ring-accent-ink/20 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="form-field">
                                <label htmlFor="contact-message" className="block text-xs font-medium text-outer-space mb-1.5 uppercase tracking-wider">
                                    Mensaje
                                </label>
                                <textarea
                                    id="contact-message"
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Contanos sobre tu proyecto o necesidad..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-accent-ink focus:ring-2 focus:ring-accent-ink/20 outline-none transition-all text-sm resize-none"
                                />
                            </div>

                            <div className="form-field">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    aria-busy={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 bg-[#0a0f1e] hover:bg-egyptian text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                                    <Send size={16} />
                                </button>
                            </div>

                            <p className="text-xs text-outer-space text-center">
                                Al enviar, aceptás nuestra <a href="/privacidad" className="text-teal-700 underline underline-offset-2 hover:text-egyptian">Política de Privacidad</a>
                            </p>
                        </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
