'use client'

import Link from 'next/link'
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

    const socialLinks = [
        { url: linkedinUrl, icon: Linkedin, label: 'LinkedIn', hoverClass: 'hover:bg-blue-600' },
        { url: instagramUrl, icon: Instagram, label: 'Instagram', hoverClass: 'hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500' },
        { url: facebookUrl, icon: Facebook, label: 'Facebook', hoverClass: 'hover:bg-blue-600' },
        { url: twitterUrl, icon: Twitter, label: 'Twitter', hoverClass: 'hover:bg-sky-500' },
    ].filter(s => s.url)

    return (
        <footer className="bg-[#0a0f1e] text-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Company Info */}
                    <div className="md:col-span-5">
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
                                            className={`flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 ${social.hoverClass} transition-all duration-300`}
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
                    <div className="md:col-span-3">
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
                                    <Link href={link.href} className="text-sm text-white/40 hover:text-daylight-sky transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="md:col-span-4">
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
                <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
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
