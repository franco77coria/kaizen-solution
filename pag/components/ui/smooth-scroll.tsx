'use client'

import { useEffect } from 'react'

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Quien pidió menos movimiento no quiere scroll con inercia: le dejamos
        // el scroll nativo del navegador.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        let lenis: import('lenis').default | null = null
        let onAnchorClick: ((e: MouseEvent) => void) | null = null
        let tickerFn: ((time: number) => void) | null = null

        const init = async () => {
            const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
                import('lenis'),
                import('@/lib/gsap-init'),
            ])

            lenis = new Lenis({
                duration: 1.4,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                touchMultiplier: 1.5,
            })

            lenis.on('scroll', ScrollTrigger.update)

            tickerFn = (time: number) => {
                lenis?.raf(time * 1000)
            }
            gsap.ticker.add(tickerFn)
            gsap.ticker.lagSmoothing(0)

            // Con Lenis activo, `scroll-behavior: smooth` de CSS ya no aplica.
            // Los links de ancla (navbar y footer) tienen que pasar por Lenis
            // o saltan de golpe.
            onAnchorClick = (e: MouseEvent) => {
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return

                const anchor = (e.target as HTMLElement | null)?.closest('a')
                if (!anchor) return

                const href = anchor.getAttribute('href')
                if (!href || !href.startsWith('#') || href === '#') return

                const target = document.querySelector(href)
                if (!target) return

                e.preventDefault()
                lenis?.scrollTo(target as HTMLElement, { offset: -80 }) // alto de la navbar fija
                history.pushState(null, '', href)
            }

            document.addEventListener('click', onAnchorClick)
        }

        init()

        return () => {
            if (onAnchorClick) document.removeEventListener('click', onAnchorClick)
            if (tickerFn) {
                import('@/lib/gsap-init').then(({ gsap }) => gsap.ticker.remove(tickerFn!))
            }
            lenis?.destroy()
        }
    }, [])

    return <>{children}</>
}
