'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export interface ActiveSender {
    id: string
    name: string
    phoneNumber: string
    accountSid?: string
    authToken?: string
    isActive: boolean
    isHealthy: boolean
    maxMps: number
    mode: 'global' | 'sender' // 'global' = config page credentials, 'sender' = specific TwilioSender
}

interface SenderContextType {
    activeSender: ActiveSender | null
    senders: ActiveSender[]
    loading: boolean
    setActiveSenderId: (id: string | null) => void
    refresh: () => Promise<void>
}

const SenderContext = createContext<SenderContextType>({
    activeSender: null,
    senders: [],
    loading: true,
    setActiveSenderId: () => { },
    refresh: async () => { },
})

export function useSender() {
    return useContext(SenderContext)
}

const STORAGE_KEY = 'kaizen-active-sender-id'

export function SenderProvider({ children }: { children: ReactNode }) {
    const [senders, setSenders] = useState<ActiveSender[]>([])
    const [activeSenderId, setActiveSenderIdState] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [initialized, setInitialized] = useState(false)

    const loadSenders = useCallback(async () => {
        try {
            // Load configured TwilioSenders
            const res = await fetch('/api/whatsapp/senders')
            let senderList: ActiveSender[] = []

            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    senderList = data
                        .filter((s: any) => s.isActive)
                        .map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            phoneNumber: s.phoneNumber,
                            isActive: s.isActive,
                            isHealthy: s.isHealthy,
                            maxMps: s.maxMps,
                            mode: 'sender' as const,
                        }))
                }
            }

            // Always add "Config Global" option using the config page credentials
            const globalSender: ActiveSender = {
                id: 'global',
                name: 'Config. Global',
                phoneNumber: '',
                isActive: true,
                isHealthy: true,
                maxMps: 1,
                mode: 'global',
            }

            // Try to get the global phone from config
            try {
                const cfgRes = await fetch('/api/whatsapp/config')
                if (cfgRes.ok) {
                    const cfgData = await cfgRes.json()
                    if (cfgData.twilioNumber) {
                        globalSender.phoneNumber = cfgData.twilioNumber
                        globalSender.name = `Config. Global (${cfgData.twilioNumber})`
                    }
                }
            } catch { }

            const allSenders = [globalSender, ...senderList]
            setSenders(allSenders)

            // Restore from localStorage on first load
            if (!initialized) {
                const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
                const validSaved = savedId && allSenders.find(s => s.id === savedId)
                setActiveSenderIdState(validSaved ? savedId : 'global')
                setInitialized(true)
            }
        } catch (e) {
            console.error('[SenderContext] Error loading senders:', e)
        } finally {
            setLoading(false)
        }
    }, [initialized])

    useEffect(() => {
        loadSenders()
    }, [loadSenders])

    const setActiveSenderId = useCallback((id: string | null) => {
        const newId = id || 'global'
        setActiveSenderIdState(newId)
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, newId)
        }
    }, [])

    const activeSender = senders.find(s => s.id === activeSenderId) || senders[0] || null

    return (
        <SenderContext.Provider value={{
            activeSender,
            senders,
            loading,
            setActiveSenderId,
            refresh: loadSenders,
        }}>
            {children}
        </SenderContext.Provider>
    )
}
