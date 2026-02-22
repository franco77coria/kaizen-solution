"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Search, Trash2, Edit } from "lucide-react"

export default function ListasPage() {
    const [lists, setLists] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

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
            const res = await fetch("/api/whatsapp/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            })
            if (res.ok) {
                setIsModalOpen(false)
                setName("")
                setDescription("")
                fetchLists()
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-green-500">
                        Listas de Audiencia
                    </h1>
                    <p className="text-gray-400">Gestiona tus segmentos y listas de contactos para campañas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-teal-500/20 hover:from-green-500/30 hover:to-teal-500/30 text-teal-400 border border-teal-500/50 px-4 py-2 rounded-lg transition-all"
                >
                    <Plus size={18} />
                    <span>Crear Lista</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando listas...</div>
            ) : lists.length === 0 ? (
                <div className="text-center py-12 bg-[#1A1D24] border border-[#2A2D35] rounded-xl">
                    <Users className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No hay listas creadas</h3>
                    <p className="text-gray-400 mb-4">Crea tu primera lista para empezar a segmentar tus contactos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map((list) => (
                        <div key={list.id} className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl p-6 hover:border-teal-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                                <span className="bg-teal-500/10 text-teal-400 text-xs px-2 py-1 rounded-full border border-teal-500/20 flex items-center gap-1">
                                    <Users size={12} />
                                    {list._count.subscribers}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
                                {list.description || "Sin descripción"}
                            </p>
                            <div className="flex gap-2.5 pt-4 border-t border-[#2A2D35]">
                                <a href={`/admin/whatsapp/contactos?list=${list.id}`} className="text-xs text-gray-400 hover:text-white transition-colors bg-[#2A2D35] px-3 py-1.5 rounded-md flex-1 text-center">
                                    Ver Contactos
                                </a>
                                <button className="text-xs text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-md">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Lista */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Nueva Lista</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la lista</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                                    placeholder="Ej: Clientes VIP, Leads Mayo..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 h-24 resize-none"
                                    placeholder="Descripción de la audiencia para esta lista"
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
                                >
                                    Guardar Lista
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
