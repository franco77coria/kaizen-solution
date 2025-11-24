'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Edit } from 'lucide-react'

export default function ProjectsPage() {
    const router = useRouter()
    const { status } = useSession()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        clientName: '',
        results: '',
        tags: [''],
        order: 0,
    })

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            fetchProjects()
        }
    }, [status, router])

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects')
            const data = await res.json()
            setProjects(data)
        } catch (error) {
            console.error('Error fetching projects:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/projects/${editingId}` : '/api/projects'
            const method = editingId ? 'PUT' : 'POST'

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            setFormData({ title: '', description: '', category: '', clientName: '', results: '', tags: [''], order: 0 })
            setEditingId(null)
            fetchProjects()
            alert('Proyecto guardado exitosamente!')
        } catch (error) {
            alert('Error al guardar el proyecto')
        }
    }

    const handleEdit = (project: any) => {
        setFormData(project)
        setEditingId(project.id)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proyecto?')) return

        try {
            await fetch(`/api/projects/${id}`, { method: 'DELETE' })
            fetchProjects()
        } catch (error) {
            alert('Error al eliminar el proyecto')
        }
    }

    const addTag = () => {
        setFormData({ ...formData, tags: [...formData.tags, ''] })
    }

    const updateTag = (index: number, value: string) => {
        const newTags = [...formData.tags]
        newTags[index] = value
        setFormData({ ...formData, tags: newTags })
    }

    const removeTag = (index: number) => {
        setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) })
    }

    if (loading || status === 'loading') {
        return <div className="p-8">Cargando...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-egyptian">Proyectos</h2>
                    <p className="text-sm text-slate">Gestiona las soluciones a medida</p>
                </div>
                <Button onClick={() => router.push('/admin')}>Volver</Button>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>{editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}</CardTitle>
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
                                placeholder="ERP/CRM, E-commerce, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-egyptian mb-2">Cliente</label>
                            <Input
                                value={formData.clientName || ''}
                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-egyptian mb-2">Resultados</label>
                            <Input
                                value={formData.results || ''}
                                onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                                placeholder="Reducción del 40% en tiempo..."
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
                        <label className="block text-sm font-medium text-egyptian mb-2">Tags</label>
                        {formData.tags.map((tag, index) => (
                            <div key={index} className="flex items-center space-x-2 mb-2">
                                <Input
                                    value={tag}
                                    onChange={(e) => updateTag(index, e.target.value)}
                                    placeholder="Tag"
                                />
                                <Button variant="ghost" size="sm" onClick={() => removeTag(index)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addTag}>
                            <Plus size={16} className="mr-2" />
                            Agregar Tag
                        </Button>
                    </div>

                    <div className="flex justify-end space-x-2">
                        {editingId && (
                            <Button variant="outline" onClick={() => {
                                setEditingId(null)
                                setFormData({ title: '', description: '', category: '', clientName: '', results: '', tags: [''], order: 0 })
                            }}>
                                Cancelar
                            </Button>
                        )}
                        <Button variant="primary" onClick={handleSave}>
                            {editingId ? 'Actualizar' : 'Crear'} Proyecto
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {projects.map((project) => (
                    <Card key={project.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-egyptian">{project.title}</h3>
                                    <p className="text-sm text-slate mt-1">{project.description}</p>
                                    {project.clientName && (
                                        <p className="text-sm text-egyptian mt-2">Cliente: {project.clientName}</p>
                                    )}
                                    {project.results && (
                                        <p className="text-sm text-daylight-sky mt-1">📊 {project.results}</p>
                                    )}
                                    <div className="mt-2">
                                        {project.tags.map((tag: string, idx: number) => (
                                            <span key={idx} className="inline-block bg-teal/10 text-teal text-xs px-2 py-1 rounded mr-2 mb-1">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                                        <Edit size={16} />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)}>
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
