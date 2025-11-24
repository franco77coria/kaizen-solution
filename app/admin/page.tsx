'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function AdminPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            fetchConfig()
        }
    }, [status, router])

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config')
            const data = await res.json()
            setConfig(data)
        } catch (error) {
            console.error('Error fetching config:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            alert('Configuración guardada exitosamente!')
        } catch (error) {
            alert('Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Cargando...</p>
            </div>
        )
    }

    if (!config) return null

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-heading font-bold gradient-text">Panel de Administración</h1>
                        <p className="text-sm text-slate">Bienvenido, {session?.user?.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" onClick={() => router.push('/')}>
                            Ver Sitio
                        </Button>
                        <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Información de la Empresa */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de la Empresa</CardTitle>
                            <CardDescription>Datos de contacto y redes sociales</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-egyptian mb-2">Nombre de la Empresa</label>
                                    <Input
                                        value={config.companyName}
                                        onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-egyptian mb-2">Email</label>
                                    <Input
                                        type="email"
                                        value={config.email}
                                        onChange={(e) => setConfig({ ...config, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-egyptian mb-2">Teléfono</label>
                                    <Input
                                        value={config.phone || ''}
                                        onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-egyptian mb-2">WhatsApp (número)</label>
                                    <Input
                                        value={config.whatsappNumber || ''}
                                        onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
                                        placeholder="573000000000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Mensaje de WhatsApp</label>
                                <Textarea
                                    value={config.whatsappMessage || ''}
                                    onChange={(e) => setConfig({ ...config, whatsappMessage: e.target.value })}
                                    placeholder="Hola, me gustaría agendar un Diagnóstico de Madurez Digital"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hero Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sección Hero (Principal)</CardTitle>
                            <CardDescription>Textos principales de la página de inicio</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Título Principal</label>
                                <Input
                                    value={config.heroTitle}
                                    onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Subtítulo</label>
                                <Textarea
                                    value={config.heroSubtitle}
                                    onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Texto del Botón CTA</label>
                                <Input
                                    value={config.ctaText}
                                    onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button
                            size="lg"
                            variant="primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>

                    {/* Quick Links */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Gestión de Contenido</CardTitle>
                            <CardDescription>Accede a las diferentes secciones del panel</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => router.push('/admin/services')}
                                    className="p-6 border-2 border-daylight-sky/20 rounded-xl hover:border-daylight-sky hover:bg-daylight-sky/5 transition-all text-left"
                                >
                                    <h3 className="font-semibold text-egyptian text-lg mb-2">📊 Servicios</h3>
                                    <p className="text-sm text-slate">Gestiona los pilares estratégicos</p>
                                </button>

                                <button
                                    onClick={() => router.push('/admin/projects')}
                                    className="p-6 border-2 border-teal/20 rounded-xl hover:border-teal hover:bg-teal/5 transition-all text-left"
                                >
                                    <h3 className="font-semibold text-egyptian text-lg mb-2">💼 Proyectos</h3>
                                    <p className="text-sm text-slate">Gestiona las soluciones a medida</p>
                                </button>

                                {session?.user?.role === 'SUPER_ADMIN' && (
                                    <button
                                        onClick={() => router.push('/admin/users')}
                                        className="p-6 border-2 border-egyptian/20 rounded-xl hover:border-egyptian hover:bg-egyptian/5 transition-all text-left"
                                    >
                                        <h3 className="font-semibold text-egyptian text-lg mb-2">👥 Usuarios</h3>
                                        <p className="text-sm text-slate">Gestiona administradores</p>
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
