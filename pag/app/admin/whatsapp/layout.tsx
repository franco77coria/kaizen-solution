'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SessionProvider, useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const navItems = [
    { href: '/admin/whatsapp', label: 'Dashboard', icon: '📊' },
    { href: '/admin/whatsapp/mensajes', label: 'Mensajes', icon: '💬' },
    { href: '/admin/whatsapp/enviar', label: 'Envío Masivo', icon: '📤' },
    { href: '/admin/whatsapp/contactos', label: 'Agenda / CRM', icon: '👥' },
    { href: '/admin/whatsapp/listas', label: 'Listas', icon: '📋' },
    { href: '/admin/whatsapp/plantillas', label: 'Plantillas', icon: '📨' },
    { href: '/admin/whatsapp/config', label: 'Configuración', icon: '⚙️' },
    { href: '/admin/whatsapp/config-elevenlabs', label: 'Audio IA', icon: '🎙️' },
    { href: '/admin/whatsapp/uso-api', label: 'Uso API', icon: '📈' },
]

function WhatsAppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/admin" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-lg shadow-sm">
                        💬
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors">Kaizen WA</h1>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">WhatsApp Business</p>
                    </div>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/admin/whatsapp' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-green-50 text-green-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-2">
                <button
                    onClick={() => router.push('/admin')}
                    className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
                >
                    ← Volver al Admin
                </button>
                <div className="px-4 py-2 text-[10px] text-gray-300">
                    {session?.user?.email}
                </div>
            </div>
        </aside>
    )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Cargando...</p>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated') return null

    return <>{children}</>
}

export default function WhatsAppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SessionProvider>
            <AuthGuard>
                <div className="flex min-h-screen bg-gray-50">
                    <WhatsAppSidebar />
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </AuthGuard>
        </SessionProvider>
    )
}
