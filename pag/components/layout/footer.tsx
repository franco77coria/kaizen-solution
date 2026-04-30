'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Mail, MapPin, Linkedin, Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react'
import KaizenLogo from '@/components/ui/kaizen-logo'

interface FooterProps {
    companyName?: string
    email?: string
    phone?: string
    address?: string
    linkedinUrl?: string | null
    instagramUrl?: string | null
    facebookUrl?: string | null
    twitterUrl?: string | null
}

export default function Footer({
    companyName = "KAIZEN SOLUTION S.A.S.",
    email = "gerencia@kaizensolutionscol.com",
    linkedinUrl = "https://www.linkedin.com/company/kaizen-solution",
    instagramUrl = "https://www.instagram.com/kaizensolution",
    facebookUrl = null,
    twitterUrl = null
}: FooterProps) {
    const currentYear = new Date().getFullYear()
    const footerRef = useRef<HTMLElement>(null)
    const logoRef = useRef<HTMLDivElement>(null)
    const colsRef = useRef<HTMLDivElement>(null)
    const dividerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            const mm = gsap.matchMedia()

            mm.add(
                {
                    isDesktop: '(min-width: 768px)',
                    isMobile: '(max-width: 767px)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { isDesktop, reduceMotion } = context.conditions!
                    const dur = reduceMotion ? 0 : undefined

                    // ── Logo block: fade up ──
                    if (logoRef.current) {
                        gsap.from(logoRef.current, {
                            opacity: 0,
                            y: isDesktop ? 40 : 20,
                            duration: dur ?? 0.8,
                            ease: 'power4.out',
                            scrollTrigger: {
                                trigger: footerRef.current,
                                start: 'top 90%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Columns: stagger from below ──
                    if (colsRef.current && !reduceMotion) {
                        const columns = colsRef.current.querySelectorAll('.footer-col')
                        gsap.from(columns, {
                            opacity: 0,
                            y: 30,
                            stagger: 0.15,
                            duration: 0.7,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: colsRef.current,
                                start: 'top 90%',
                                toggleActions: 'play none none none',
                            },
                            delay: 0.2,
                        })
                    }

                    // ── Divider line: scale from center ──
                    if (dividerRef.current && !reduceMotion) {
                        gsap.from(dividerRef.current, {
                            scaleX: 0,
                            duration: 1,
                            ease: 'power3.inOut',
                            scrollTrigger: {
                                trigger: dividerRef.current,
                                start: 'top 95%',
                                toggleActions: 'play none none none',
                            },
                        })
                    }

                    // ── Bottom bar: fade in ──
                    if (bottomRef.current && !reduceMotion) {
                        gsap.from(bottomRef.current, {
                            opacity: 0,
                            y: 10,
                            duration: 0.5,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: bottomRef.current,
                                start: 'top 95%',
                                toggleActions: 'play none none none',
                            },
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

    const socialLinks = [
        { url: linkedinUrl, icon: Linkedin, label: 'LinkedIn', hoverClass: 'hover:bg-blue-600' },
        { url: instagramUrl, icon: Instagram, label: 'Instagram', hoverClass: 'hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500' },
        { url: facebookUrl, icon: Facebook, label: 'Facebook', hoverClass: 'hover:bg-blue-600' },
        { url: twitterUrl, icon: Twitter, label: 'Twitter', hoverClass: 'hover:bg-sky-500' },
    ].filter(s => s.url)

    return (
        <footer ref={footerRef} className="bg-[#0a0f1e] text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div ref={colsRef} className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Company Info */}
                    <div ref={logoRef} className="footer-col md:col-span-5">
                        <Link href="/" className="flex items-center gap-3 mb-5">
                            <KaizenLogo className="h-10 w-10" />
                            <div>
                                <h3 className="text-xl font-heading font-bold">
                                    <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">Kaizen</span>{' '}
                                    Solution
                                </h3>
                                <p className="text-[11px] text-white/30 tracking-wider uppercase">Consulting & Data Management</p>
                            </div>
                        </Link>
                        <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-sm">
                            Transformación Digital con Propósito. Soluciones digitales a medida para tu negocio y la gestión pública.
                        </p>

                        {/* Social */}
                        {socialLinks.length > 0 && (
                            <div className="flex gap-3">
                                {socialLinks.map((social) => {
                                    const Icon = social.icon
                                    return (
                                        <a
                                            key={social.label}
                                            href={social.url!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 ${social.hoverClass} transition-all duration-300 hover:scale-110`}
                                            aria-label={social.label}
                                        >
                                            <Icon size={16} className="text-white/50 hover:text-white" />
                                        </a>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="footer-col md:col-span-3">
                        <h4 className="text-xs font-semibold mb-5 text-white/30 uppercase tracking-widest">Navegación</h4>
                        <ul className="space-y-3">
                            {[
                                { href: '#servicios', label: 'Servicios' },
                                { href: '#soluciones', label: 'Soluciones' },
                                { href: '#ia', label: 'Inteligencia Artificial' },
                                { href: '#beneficios', label: 'Beneficios' },
                                { href: '#contacto', label: 'Contacto' },
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-white/40 hover:text-daylight-sky transition-colors hover:translate-x-1 inline-block">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-col md:col-span-4">
                        <h4 className="text-xs font-semibold mb-5 text-white/30 uppercase tracking-widest">Contacto</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-daylight-sky/50" />
                                <div className="text-sm text-white/40">
                                    <p>Buenos Aires, Argentina</p>
                                    <p>Bogotá D.C., Colombia</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Mail size={16} className="mt-0.5 flex-shrink-0 text-daylight-sky/50" />
                                <a href={`mailto:${email}`} className="text-sm text-white/40 hover:text-daylight-sky transition-colors">
                                    {email}
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <MessageCircle size={16} className="mt-0.5 flex-shrink-0 text-daylight-sky/50" />
                                <div className="text-sm text-white/40 space-y-1">
                                    <a href="https://wa.me/5491163515966" target="_blank" rel="noopener noreferrer" className="block hover:text-daylight-sky transition-colors">
                                        +54 9 11 6351-5966 (ARG)
                                    </a>
                                    <a href="https://wa.me/573212050514" target="_blank" rel="noopener noreferrer" className="block hover:text-daylight-sky transition-colors">
                                        +57 321 205 0514 (COL)
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div ref={dividerRef} className="border-t border-white/5 mt-12 origin-center" />
                <div ref={bottomRef} className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-white/25">
                        © {currentYear} {companyName}. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacidad" className="text-xs text-white/25 hover:text-daylight-sky transition-colors">
                            Política de Privacidad
                        </Link>
                        <Link href="/terminos-y-condiciones" className="text-xs text-white/25 hover:text-daylight-sky transition-colors">
                            Términos y Condiciones
                        </Link>
                        <Link href="/eliminacion-de-datos" className="text-xs text-white/25 hover:text-daylight-sky transition-colors">
                            Eliminación de Datos
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
