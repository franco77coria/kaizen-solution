'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    LayoutDashboard,
    MessageCircle,
    Send,
    Users,
    List,
    FileText,
    Settings,
    Mic,
    BarChart3,
    LogOut,
    ArrowLeft,
    Menu,
    X,
    type LucideIcon
} from 'lucide-react'

interface NavItem {
    href: string
    label: string
    icon: LucideIcon
}

const publicNavItems: NavItem[] = [
    { href: '/admin/whatsapp', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/whatsapp/mensajes', label: 'Mensajes', icon: MessageCircle },
    { href: '/admin/whatsapp/enviar', label: 'Envío Masivo', icon: Send },
    { href: '/admin/whatsapp/contactos', label: 'Agenda / CRM', icon: Users },
    { href: '/admin/whatsapp/listas', label: 'Listas', icon: List },
    { href: '/admin/whatsapp/plantillas', label: 'Plantillas', icon: FileText },
]

const adminOnlyNavItems: NavItem[] = [
    { href: '/admin/whatsapp/config', label: 'Configuración', icon: Settings },
    { href: '/admin/whatsapp/config-elevenlabs', label: 'Audio IA', icon: Mic },
    { href: '/admin/whatsapp/uso-api', label: 'Uso API', icon: BarChart3 },
]

function WhatsAppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()
    const [mobileOpen, setMobileOpen] = useState(false)

    const userRole = (session?.user as any)?.role || 'VIEWER'
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    const navItems = isAdmin ? [...publicNavItems, ...adminOnlyNavItems] : publicNavItems

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                        <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors">Kaizen WA</h1>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">WhatsApp Business</p>
                    </div>
                </Link>
                {/* Mobile close button */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/admin/whatsapp' && pathname.startsWith(item.href))
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-green-50 text-green-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-2">
                <button
                    onClick={() => router.push('/admin')}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
                >
                    <ArrowLeft size={14} />
                    Volver al Admin
                </button>
                <div className="px-4 py-1">
                    <div className="text-[10px] text-gray-300 truncate">
                        {session?.user?.email}
                    </div>
                    {!isAdmin && (
                        <div className="text-[9px] text-gray-300 mt-0.5">Modo lectura</div>
                    )}
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg font-medium"
                >
                    <LogOut size={16} />
                    Salir
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile header bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                    <Menu size={22} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                        <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Kaizen WA</span>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar - desktop always visible, mobile slide-in */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen
                w-64 bg-white border-r border-gray-200 flex flex-col
                transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {sidebarContent}
            </aside>
        </>
    )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { status, data: session } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const userRole = (session.user as any)?.role || 'VIEWER'
            const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
            const restrictedPaths = ['/admin/whatsapp/config', '/admin/whatsapp/config-elevenlabs', '/admin/whatsapp/uso-api']
            const isRestricted = restrictedPaths.some(p => pathname.startsWith(p))
            if (!isAdmin && isRestricted) {
                router.push('/admin/whatsapp')
            }
        }
    }, [status, session, pathname, router])

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
            <AuthGuard>
                <div className="flex min-h-screen bg-gray-50">
                    <WhatsAppSidebar />
                    <main className="flex-1 overflow-auto pt-14 lg:pt-0">
                        {children}
                    </main>
                </div>
            </AuthGuard>
    )
}
