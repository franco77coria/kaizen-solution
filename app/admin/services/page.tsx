'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Edit } from 'lucide-react'

export default function ServicesPage() {
    const router = useRouter()
    const { status } = useSession()
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        icon: '',
        category: '',
        features: [''],
        order: 0,
    })

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            fetchServices()
        }
    }, [status, router])

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services')
            const data = await res.json()
            setServices(data)
        } catch (error) {
            console.error('Error fetching services:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/services/${editingId}` : '/api/services'
            const method = editingId ? 'PUT' : 'POST'

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            setFormData({ title: '', description: '', icon: '', category: '', features: [''], order: 0 })
            setEditingId(null)
            fetchServices()
            alert('Servicio guardado exitosamente!')
        } catch (error) {
            alert('Error al guardar el servicio')
        }
    }

    const handleEdit = (service: any) => {
        setFormData(service)
        setEditingId(service.id)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return

        try {
            await fetch(`/api/services/${id}`, { method: 'DELETE' })
            fetchServices()
        } catch (error) {
            alert('Error al eliminar el servicio')
        }
    }

    const addFeature = () => {
        setFormData({ ...formData, features: [...formData.features, ''] })
    }

    const updateFeature = (index: number, value: string) => {
        const newFeatures = [...formData.features]
        newFeatures[index] = value
        setFormData({ ...formData, features: newFeatures })
    }

    const removeFeature = (index: number) => {
        setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) })
    }

    if (loading || status === 'loading') {
        return <div className="p-8">Cargando...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-egyptian">Servicios</h2>
                    <p className="text-sm text-slate">Gestiona los pilares estratégicos</p>
                </div>
                <Button onClick={() => router.push('/admin')}>Volver</Button>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-egyptian mb-2">Título</label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-egyptian mb-2">Categoría</label>
                            <Input
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="consulting, analytics, etc."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-egyptian mb-2">Descripción</label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-egyptian mb-2">Características</label>
                        {formData.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2 mb-2">
                                <Input
                                    value={feature}
                                    onChange={(e) => updateFeature(index, e.target.value)}
                                    placeholder="Característica"
                                />
                                <Button variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addFeature}>
                            <Plus size={16} className="mr-2" />
                            Agregar Característica
                        </Button>
                    </div>

                    <div className="flex justify-end space-x-2">
                        {editingId && (
                            <Button variant="outline" onClick={() => {
                                setEditingId(null)
                                setFormData({ title: '', description: '', icon: '', category: '', features: [''], order: 0 })
                            }}>
                                Cancelar
                            </Button>
                        )}
                        <Button variant="primary" onClick={handleSave}>
                            {editingId ? 'Actualizar' : 'Crear'} Servicio
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {services.map((service) => (
                    <Card key={service.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-egyptian">{service.title}</h3>
                                    <p className="text-sm text-slate mt-1">{service.description}</p>
                                    <div className="mt-2">
                                        {service.features.map((feature: string, idx: number) => (
                                            <span key={idx} className="inline-block bg-daylight-sky/10 text-daylight-sky text-xs px-2 py-1 rounded mr-2 mb-1">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
