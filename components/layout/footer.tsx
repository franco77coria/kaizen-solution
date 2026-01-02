'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin, Linkedin, Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react'
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
    email = "kaizensolution25@gmail.com",
    phone = "+57 300 000 0000",
    address = "Bogotá D.C., Colombia",
    linkedinUrl = "https://www.linkedin.com/company/kaizen-solution",
    instagramUrl = "https://www.instagram.com/kaizensolution",
    facebookUrl = null,
    twitterUrl = null
}: FooterProps) {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-denim text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                            <KaizenLogo className="h-12 w-12" />
                            <div>
                                <h3 className="text-2xl font-heading font-bold">
                                    <span className="gradient-text">Kaizen</span> Solution
                                </h3>
                                <p className="text-xs text-gray-400">Consulting & Data Management</p>
                            </div>
                        </div>
                        <p className="text-gray-300 mb-6">
                            Transformación Digital con Propósito. Soluciones digitales a medida para tu negocio y la gestión pública.
                        </p>

                        {/* Social Media */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3 text-gray-200">Síguenos</h4>
                            <div className="flex space-x-4">
                                {linkedinUrl && (
                                    <a
                                        href={linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-tiffany transition-all duration-300"
                                        aria-label="LinkedIn"
                                    >
                                        <Linkedin size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                    </a>
                                )}
                                {instagramUrl && (
                                    <a
                                        href={instagramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
                                        aria-label="Instagram"
                                    >
                                        <Instagram size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                    </a>
                                )}
                                {facebookUrl && (
                                    <a
                                        href={facebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-blue-600 transition-all duration-300"
                                        aria-label="Facebook"
                                    >
                                        <Facebook size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                    </a>
                                )}
                                {twitterUrl && (
                                    <a
                                        href={twitterUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-sky-500 transition-all duration-300"
                                        aria-label="Twitter"
                                    >
                                        <Twitter size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="#servicios" className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    Servicios
                                </Link>
                            </li>
                            <li>
                                <Link href="#soluciones" className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    Soluciones
                                </Link>
                            </li>
                            <li>
                                <Link href="#ia" className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    Inteligencia Artificial
                                </Link>
                            </li>
                            <li>
                                <Link href="#contacto" className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    Contacto
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Contacto</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start space-x-2">
                                <MapPin size={18} className="mt-1 flex-shrink-0 text-daylight-sky" />
                                <div className="text-gray-300">
                                    <p>Buenos Aires, Argentina</p>
                                    <p className="text-sm">Bogotá D.C., Colombia</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-2">
                                <Mail size={18} className="mt-1 flex-shrink-0 text-daylight-sky" />
                                <a href={`mailto:${email}`} className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    {email}
                                </a>
                            </li>
                            <li className="flex items-start space-x-2">
                                <MessageCircle size={18} className="mt-1 flex-shrink-0 text-daylight-sky" />
                                <div className="text-gray-300 space-y-1">
                                    <a
                                        href="https://wa.me/5491163515966"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:text-daylight-sky transition-colors"
                                    >
                                        +54 9 11 6351-5966 (ARG)
                                    </a>
                                    <a
                                        href="https://wa.me/573212050514"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:text-daylight-sky transition-colors"
                                    >
                                        +57 321 205 0514 (COL)
                                    </a>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
                    <p>© {currentYear} {companyName}. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    )
}
