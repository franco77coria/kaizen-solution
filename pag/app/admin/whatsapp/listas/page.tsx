"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Search, Trash2, Edit } from "lucide-react"

export default function ListasPage() {
    const [lists, setLists] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingListId, setEditingListId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    const fetchLists = async () => {
        try {
            const res = await fetch("/api/whatsapp/lists")
            const data = await res.json()
            setLists(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLists()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingListId ? `/api/whatsapp/lists/${editingListId}` : "/api/whatsapp/lists"
            const method = editingListId ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            })
            if (res.ok) {
                closeModal()
                fetchLists()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta lista? Los contactos seguirán existiendo en tu directorio general, pero perderán esta etiqueta.")) return
        try {
            const res = await fetch(`/api/whatsapp/lists/${id}`, { method: "DELETE" })
            if (res.ok) {
                fetchLists()
            } else {
                alert("Error al eliminar la lista.")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const openEditModal = (list: any) => {
        setEditingListId(list.id)
        setName(list.name)
        setDescription(list.description || "")
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingListId(null)
        setName("")
        setDescription("")
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Listas de Audiencia
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona tus segmentos y listas de contactos para campañas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-sm"
                >
                    <Plus size={18} />
                    <span>Crear Lista</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando listas...</div>
            ) : lists.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay listas creadas</h3>
                    <p className="text-gray-500 mb-4 text-sm">Crea tu primera lista para empezar a segmentar tus contactos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map((list) => (
                        <div key={list.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                                <span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full border border-green-200 flex items-center gap-1">
                                    <Users size={12} />
                                    {list._count.subscribers}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                                {list.description || "Sin descripción"}
                            </p>
                            <div className="flex gap-2.5 pt-4 border-t border-gray-100">
                                <a href={`/admin/whatsapp/contactos?list=${list.id}`} className="text-xs text-blue-600 hover:text-blue-900 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md flex-1 text-center font-medium">
                                    Ver Contactos
                                </a>
                                <button onClick={() => openEditModal(list)} className="text-xs text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md" title="Editar Lista">
                                    <Edit size={14} />
                                </button>
                                <button onClick={() => handleDelete(list.id)} className="text-xs text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md" title="Eliminar Lista">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Lista */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">{editingListId ? "Editar Lista" : "Nueva Lista"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la lista</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                    placeholder="Ej: Clientes VIP, Leads Mayo..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 h-24 resize-none"
                                    placeholder="Descripción de la audiencia para esta lista"
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    {editingListId ? "Guardar Cambios" : "Guardar Lista"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
