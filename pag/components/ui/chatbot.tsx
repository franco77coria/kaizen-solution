'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

/**
 * Launcher del chat. Es HTML plano a propósito: el panel (que se lleva
 * framer-motion, ~34 kB gzip) se carga recién cuando el usuario abre el chat.
 * Antes viajaba en el bundle inicial de la landing sin que nadie lo pidiera.
 */
const ChatPanel = dynamic(() => import('./chatbot-panel'), { ssr: false })

const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
)

export default function ChatBot() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    if (pathname?.startsWith('/politica')) {
        return null
    }
    // Una vez abierto, el panel queda montado para no perder la conversación
    // al cerrarlo y volver a abrirlo.
    const [hasOpened, setHasOpened] = useState(false)

    const open = () => {
        setHasOpened(true)
        setIsOpen(true)
    }

    return (
        <>
            {!isOpen && (
                <button
                    type="button"
                    onClick={open}
                    // Precarga el chunk al primer hover/touch: para cuando hace
                    // click, el panel ya está descargado.
                    onMouseEnter={() => { void import('./chatbot-panel') }}
                    onTouchStart={() => { void import('./chatbot-panel') }}
                    className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 h-14 w-14 rounded-full bg-[#0a0f1e] text-daylight-sky shadow-2xl shadow-daylight-sky/10 hover:shadow-daylight-sky/20 hover:scale-105 transition-all duration-300 flex items-center justify-center border border-white/10 animate-scale-in"
                    aria-label="Abrir chat con KaiBot"
                >
                    <BotIcon />
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-tiffany rounded-full border-2 border-white animate-ping-slow motion-reduce:animate-none" />
                </button>
            )}

            {hasOpened && <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />}
        </>
    )
}
