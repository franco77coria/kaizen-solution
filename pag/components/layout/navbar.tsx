'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import KaizenLogo from '@/components/ui/kaizen-logo'

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { href: '#servicios', label: 'Servicios' },
        { href: '#soluciones', label: 'Soluciones' },
        { href: '#ia', label: 'IA' },
        { href: '#beneficios', label: 'Beneficios' },
        { href: '#contacto', label: 'Contacto' },
    ]

    const handleCTA = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100/50'
                : 'bg-transparent'
                }`}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-18 py-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="transform transition-transform duration-300 group-hover:scale-105">
                            <KaizenLogo className="h-9 w-9" />
                        </div>
                        <div className="text-xl font-heading font-bold">
                            <span className="bg-gradient-to-r from-daylight-sky to-tiffany bg-clip-text text-transparent">Kaizen</span>
                            <span className={`ml-1.5 transition-colors duration-300 ${isScrolled ? 'text-egyptian' : 'text-white'}`}>
                                Solution
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors duration-300 hover:text-daylight-sky ${isScrolled ? 'text-outer-space/70' : 'text-white/70'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button
                            onClick={handleCTA}
                            className="text-sm font-semibold bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
                        >
                            Agendar Diagnóstico
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`md:hidden p-2 rounded-lg transition-colors ${isScrolled ? 'text-outer-space' : 'text-white'}`}
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 shadow-xl">
                    <div className="px-4 py-6 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-outer-space/70 hover:text-daylight-sky font-medium transition-colors text-sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button
                            onClick={() => { handleCTA(); setIsMobileMenuOpen(false) }}
                            className="w-full text-sm font-semibold bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] px-5 py-3 rounded-full"
                        >
                            Agendar Diagnóstico
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
