'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import KaizenLogo from '@/components/ui/kaizen-logo'

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const navRef = useRef<HTMLElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const linksRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // ── GSAP: scroll progress bar + nav links entrance ──
    useEffect(() => {
        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap, ScrollTrigger } = await import('@/lib/gsap-init')

            const mm = gsap.matchMedia()

            mm.add(
                {
                    isDesktop: '(min-width: 768px)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { isDesktop, reduceMotion } = context.conditions!

                    // ── Scroll progress bar ──
                    if (progressRef.current) {
                        gsap.to(progressRef.current, {
                            scaleX: 1,
                            ease: 'none',
                            scrollTrigger: {
                                trigger: document.body,
                                start: 'top top',
                                end: 'bottom bottom',
                                scrub: 0.3,
                            },
                        })
                    }

                    // ── Desktop nav links stagger entrance ──
                    if (linksRef.current && isDesktop && !reduceMotion) {
                        const links = linksRef.current.querySelectorAll('.nav-link')
                        gsap.from(links, {
                            opacity: 0,
                            y: -12,
                            stagger: 0.06,
                            duration: 0.5,
                            ease: 'power2.out',
                            delay: 1.8,  // after hero animations
                        })

                        // CTA button
                        const cta = linksRef.current.querySelector('.nav-cta')
                        if (cta) {
                            gsap.from(cta, {
                                opacity: 0,
                                scale: 0.8,
                                duration: 0.5,
                                ease: 'back.out(2)',
                                delay: 2.2,
                            })
                        }
                    }

                    return () => {}
                }
            )

            ctx = { revert: () => mm.revert() }
        }

        initGSAP()
        return () => { ctx?.revert() }
    }, [])

    // ── GSAP: animate mobile menu open/close ──
    useEffect(() => {
        if (!mobileMenuRef.current) return

        let ctx: { revert: () => void } | null = null

        const animateMenu = async () => {
            const { gsap } = await import('@/lib/gsap-init')

            ctx = gsap.context(() => {
                if (isMobileMenuOpen) {
                    gsap.fromTo(
                        mobileMenuRef.current,
                        { height: 0, opacity: 0 },
                        { height: 'auto', opacity: 1, duration: 0.4, ease: 'power3.out' }
                    )
                    const items = mobileMenuRef.current?.querySelectorAll('.mobile-nav-item')
                    if (items) {
                        gsap.from(items, {
                            opacity: 0,
                            x: -20,
                            stagger: 0.05,
                            duration: 0.3,
                            ease: 'power2.out',
                            delay: 0.1,
                        })
                    }
                }
            })
        }

        animateMenu()
        return () => { ctx?.revert() }
    }, [isMobileMenuOpen])

    const navLinks = [
        { href: '#servicios', label: 'Servicios' },
        { href: '#soluciones', label: 'Soluciones' },
        { href: '#sector-publico', label: 'Sector Público' },
        { href: '#ia', label: 'IA & WhatsApp' },
        { href: '#beneficios', label: 'Beneficios' },
        { href: '#contacto', label: 'Contacto' },
    ]

    const handleCTA = () => {
        const message = encodeURIComponent("Hola, me gustaría agendar un Diagnóstico de Madurez Digital")
        window.open(`https://wa.me/5491163515966?text=${message}`, '_blank')
    }

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100/50'
                : 'bg-transparent'
                }`}
        >
            {/* Scroll progress bar */}
            <div
                ref={progressRef}
                className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-daylight-sky via-tiffany to-daylight-sky origin-left"
                style={{ transform: 'scaleX(0)' }}
            />

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
                    <div ref={linksRef} className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-link text-sm font-medium transition-colors duration-300 hover:text-daylight-sky relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-daylight-sky after:transition-all after:duration-300 hover:after:w-full ${isScrolled ? 'text-outer-space/70' : 'text-white/70'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button
                            onClick={handleCTA}
                            className="nav-cta text-sm font-semibold bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] px-5 py-2.5 rounded-full hover:shadow-lg hover:shadow-daylight-sky/25 transition-all duration-300 hover:scale-[1.02]"
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
                <div ref={mobileMenuRef} className="md:hidden bg-white border-t border-gray-100 shadow-xl overflow-hidden">
                    <div className="px-4 py-6 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="mobile-nav-item block text-outer-space/70 hover:text-daylight-sky font-medium transition-colors text-sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button
                            onClick={() => { handleCTA(); setIsMobileMenuOpen(false) }}
                            className="mobile-nav-item w-full text-sm font-semibold bg-gradient-to-r from-daylight-sky to-tiffany text-[#0a0f1e] px-5 py-3 rounded-full"
                        >
                            Agendar Diagnóstico
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
