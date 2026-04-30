'use client'

import { useEffect, useRef, useState } from 'react'


export default function CustomCursor() {
    const dotRef = useRef<HTMLDivElement>(null)
    const ringRef = useRef<HTMLDivElement>(null)
    const [isPointer, setIsPointer] = useState(false)

    useEffect(() => {
        // Solo activar en dispositivos con puntero preciso (desktop)
        if (!window.matchMedia('(pointer: fine)').matches) return

        let ctx: { revert: () => void } | null = null

        const initGSAP = async () => {
            const { gsap } = await import('@/lib/gsap-init')

            // Ocultar cursor nativo
            document.body.style.cursor = 'none'

            ctx = gsap.context(() => {
                // quickTo: crea funciones de animación re-llamables de alta performance
                const xDot = gsap.quickTo(dotRef.current, 'x', { duration: 0.06, ease: 'none' })
                const yDot = gsap.quickTo(dotRef.current, 'y', { duration: 0.06, ease: 'none' })
                const xRing = gsap.quickTo(ringRef.current, 'x', { duration: 0.18, ease: 'power2.out' })
                const yRing = gsap.quickTo(ringRef.current, 'y', { duration: 0.18, ease: 'power2.out' })

                const onMove = (e: MouseEvent) => {
                    xDot(e.clientX)
                    yDot(e.clientY)
                    xRing(e.clientX)
                    yRing(e.clientY)
                }

                const onEnterInteractive = () => {
                    setIsPointer(true)
                    gsap.to(ringRef.current, { scale: 1.8, duration: 0.25, ease: 'power2.out' })
                }

                const onLeaveInteractive = () => {
                    setIsPointer(false)
                    gsap.to(ringRef.current, { scale: 1, duration: 0.25, ease: 'power2.out' })
                }

                const onMouseDown = () => {
                    gsap.to([dotRef.current, ringRef.current], { scale: 0.7, duration: 0.1 })
                }
                const onMouseUp = () => {
                    gsap.to([dotRef.current, ringRef.current], { scale: 1, duration: 0.2 })
                }

                window.addEventListener('mousemove', onMove)
                window.addEventListener('mousedown', onMouseDown)
                window.addEventListener('mouseup', onMouseUp)

                // Detectar elementos interactivos
                const interactiveEls = document.querySelectorAll('a, button, [role="button"]')
                interactiveEls.forEach((el) => {
                    el.addEventListener('mouseenter', onEnterInteractive)
                    el.addEventListener('mouseleave', onLeaveInteractive)
                })

                return () => {
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mousedown', onMouseDown)
                    window.removeEventListener('mouseup', onMouseUp)
                    interactiveEls.forEach((el) => {
                        el.removeEventListener('mouseenter', onEnterInteractive)
                        el.removeEventListener('mouseleave', onLeaveInteractive)
                    })
                    document.body.style.cursor = ''
                }
            })
        }

        initGSAP()

        return () => {
            ctx?.revert()
            document.body.style.cursor = ''
        }
    }, [])

    return (
        <>
            {/* Dot central — sigue el mouse al instante */}
            <div
                ref={dotRef}
                className="fixed top-0 left-0 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-daylight-sky pointer-events-none z-[9999] mix-blend-difference"
                style={{ willChange: 'transform' }}
            />
            {/* Ring exterior — sigue con lag suave */}
            <div
                ref={ringRef}
                className={`fixed top-0 left-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none z-[9999] transition-colors duration-200 ${
                    isPointer
                        ? 'border-tiffany bg-tiffany/10'
                        : 'border-white/40'
                }`}
                style={{ willChange: 'transform' }}
            />
        </>
    )
}
