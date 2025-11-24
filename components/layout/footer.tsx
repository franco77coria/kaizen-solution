'use client'

import Link from 'next/link'
import { Mail, Phone, MapPin, Linkedin, Instagram, Facebook, Twitter } from 'lucide-react'

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
    email = "1133985163f@gmail.com",
    phone = "+57 300 000 0000",
    address = "Bogotá D.C., Colombia",
    linkedinUrl,
    instagramUrl,
    facebookUrl,
    twitterUrl
}: FooterProps) {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-denim text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-heading font-bold mb-4">
                            <span className="gradient-text">Kaizen</span> Solution
                        </h3>
                        <p className="text-gray-300 mb-4">
                            Transformación Digital con Propósito. Soluciones digitales a medida para tu negocio y la gestión pública.
                        </p>
                        <div className="flex space-x-4">
                            {linkedinUrl && (
                                <a
                                    href={linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-daylight-sky transition-colors"
                                >
                                    <Linkedin size={20} />
                                </a>
                            )}
                            {instagramUrl && (
                                <a
                                    href={instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-daylight-sky transition-colors"
                                >
                                    <Instagram size={20} />
                                </a>
                            )}
                            {facebookUrl && (
                                <a
                                    href={facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-daylight-sky transition-colors"
                                >
                                    <Facebook size={20} />
                                </a>
                            )}
                            {twitterUrl && (
                                <a
                                    href={twitterUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-daylight-sky transition-colors"
                                >
                                    <Twitter size={20} />
                                </a>
                            )}
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
                                <span className="text-gray-300">{address}</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <Mail size={18} className="mt-1 flex-shrink-0 text-daylight-sky" />
                                <a href={`mailto:${email}`} className="text-gray-300 hover:text-daylight-sky transition-colors">
                                    {email}
                                </a>
                            </li>
                            <li className="flex items-start space-x-2">
                                <Phone size={18} className="mt-1 flex-shrink-0 text-daylight-sky" />
                                <span className="text-gray-300">{phone}</span>
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
