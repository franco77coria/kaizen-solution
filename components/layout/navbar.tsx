'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? 'bg-white/95 backdrop-blur-md shadow-lg'
                    : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3 group">
                        <div className="text-2xl font-heading font-bold">
                            <span className="gradient-text">Kaizen</span>
                            <span className={`ml-2 ${isScrolled ? 'text-egyptian' : 'text-white'} transition-colors`}>
                                Solution
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-daylight-sky ${isScrolled ? 'text-outer-space' : 'text-white'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Button size="md" variant="primary">
                            Agendar Diagnóstico
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`md:hidden p-2 rounded-lg transition-colors ${isScrolled ? 'text-outer-space' : 'text-white'
                            }`}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
                    <div className="px-4 py-6 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-outer-space hover:text-daylight-sky font-medium transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Button size="md" variant="primary" className="w-full">
                            Agendar Diagnóstico
                        </Button>
                    </div>
                </div>
            )}
        </nav>
    )
}
