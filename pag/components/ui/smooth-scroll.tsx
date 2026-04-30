'use client'

import { useEffect } from 'react'

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        let lenis: import('lenis').default | null = null

        const init = async () => {
            const [{ default: Lenis }, { ScrollTrigger }] = await Promise.all([
                import('lenis'),
                import('@/lib/gsap-init'),
            ])

            const { gsap } = await import('@/lib/gsap-init')

            lenis = new Lenis({
                duration: 1.4,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                touchMultiplier: 1.5,
            })

            lenis.on('scroll', ScrollTrigger.update)

            gsap.ticker.add((time: number) => {
                lenis?.raf(time * 1000)
            })
            gsap.ticker.lagSmoothing(0)
        }

        init()

        return () => {
            lenis?.destroy()
        }
    }, [])

    return <>{children}</>
}
