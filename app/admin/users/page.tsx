'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'

export default function UsersPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        role: 'ADMIN',
    })

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            // Only SUPER_ADMIN can manage users
            if (session?.user?.role !== 'SUPER_ADMIN') {
                router.push('/admin')
                return
            }
            fetchUsers()
        }
    }, [status, session, router])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users')
            const data = await res.json()
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        try {
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            setFormData({ email: '', name: '', password: '', role: 'ADMIN' })
            setShowForm(false)
            fetchUsers()
            alert('Usuario creado exitosamente!')
        } catch (error) {
            alert('Error al crear el usuario')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return

        try {
            await fetch(`/api/users/${id}`, { method: 'DELETE' })
            fetchUsers()
        } catch (error) {
            alert('Error al eliminar el usuario')
        }
    }

    if (loading || status === 'loading') {
        return <div className="p-8">Cargando...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-egyptian">Usuarios</h2>
                    <p className="text-sm text-slate">Gestiona los administradores del sistema</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus size={16} className="mr-2" />
                        Nuevo Usuario
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/admin')}>Volver</Button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nuevo Usuario Admin</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Nombre</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Contraseña</label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-egyptian mb-2">Rol</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleCreate}>
                                Crear Usuario
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {users.map((user) => (
                    <Card key={user.id}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-lg font-semibold text-egyptian">{user.name || user.email}</h3>
                                        <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                        {!user.isActive && <Badge variant="outline">Inactivo</Badge>}
                                    </div>
                                    <p className="text-sm text-slate mt-1">{user.email}</p>
                                    <p className="text-xs text-slate mt-1">
                                        Creado: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {user.role !== 'SUPER_ADMIN' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
