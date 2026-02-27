"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Users, Trash2, Edit, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, UserPlus } from "lucide-react"
import Papa from "papaparse"

export default function ListasPage() {
    const [lists, setLists] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingListId, setEditingListId] = useState<string | null>(null)

    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    // Import state
    const [importListId, setImportListId] = useState<string | null>(null)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importColumns, setImportColumns] = useState<string[]>([])
    const [importPreview, setImportPreview] = useState<any[]>([])
    const [importMapping, setImportMapping] = useState<{ phone: string; name: string }>({ phone: "", name: "" })
    const [importStatus, setImportStatus] = useState<"idle" | "mapping" | "uploading" | "success" | "error">("idle")
    const [importResults, setImportResults] = useState<{ success: number; errors: any[] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Add manual contact
    const [addContactListId, setAddContactListId] = useState<string | null>(null)
    const [manualPhone, setManualPhone] = useState("")
    const [manualName, setManualName] = useState("")
    const [addingContact, setAddingContact] = useState(false)

    const fetchLists = async () => {
        try {
            const res = await fetch("/api/whatsapp/lists")
            const data = await res.json()
            setLists(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchLists() }, [])

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
            } else {
                alert("Error al guardar la lista")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta lista? Los contactos seguirán en el directorio general.")) return
        try {
            const res = await fetch(`/api/whatsapp/lists/${id}`, { method: "DELETE" })
            if (res.ok) fetchLists()
            else alert("Error al eliminar la lista.")
        } catch (error) { console.error(error) }
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

    const openImportModal = (listId: string) => {
        setImportListId(listId)
        setImportFile(null)
        setImportColumns([])
        setImportPreview([])
        setImportMapping({ phone: "", name: "" })
        setImportStatus("idle")
        setImportResults(null)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = e.target.files[0]
            setImportFile(selected)

            Papa.parse(selected, {
                header: true,
                skipEmptyLines: true,
                preview: 5,
                complete: (results) => {
                    const fields = results.meta.fields || []
                    setImportColumns(fields)
                    setImportPreview(results.data)

                    const lower = fields.map(f => f.toLowerCase())
                    let phone = "", namecol = ""
                    const pi = lower.findIndex(c => c.includes("telefon") || c.includes("phone") || c.includes("celular") || c.includes("numero") || c.includes("whatsapp"))
                    if (pi !== -1) phone = fields[pi]
                    const ni = lower.findIndex(c => c.includes("nombre") || c.includes("name") || c.includes("contacto"))
                    if (ni !== -1) namecol = fields[ni]

                    setImportMapping({ phone, name: namecol })
                    setImportStatus("mapping")
                }
            })
        }
    }

    const handleImportUpload = () => {
        if (!importFile || !importMapping.phone || !importListId) return
        setImportStatus("uploading")

        Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const payload = results.data.map((row: any) => ({
                    phone: row[importMapping.phone],
                    name: importMapping.name ? row[importMapping.name] : null,
                }))

                try {
                    const res = await fetch("/api/whatsapp/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contacts: payload, listId: importListId }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                        setImportResults({ success: data.successCount, errors: data.errors || [] })
                        setImportStatus("success")
                        fetchLists()
                    } else {
                        setImportResults({ success: 0, errors: [{ error: data.error }] })
                        setImportStatus("error")
                    }
                } catch (err: any) {
                    setImportResults({ success: 0, errors: [{ error: err.message }] })
                    setImportStatus("error")
                }
            }
        })
    }

    const handleAddManualContact = async () => {
        if (!manualPhone || !addContactListId) return
        setAddingContact(true)
        try {
            const res = await fetch("/api/whatsapp/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contacts: [{ phone: manualPhone.replace(/[^0-9]/g, ""), name: manualName || null }],
                    listId: addContactListId,
                }),
            })
            if (res.ok) {
                setAddContactListId(null)
                setManualPhone("")
                setManualName("")
                fetchLists()
            } else {
                const data = await res.json()
                alert(data.error || "Error al agregar contacto")
            }
        } catch (e) { console.error(e) }
        finally { setAddingContact(false) }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Listas de Audiencia</h1>
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
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : lists.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <Users className="mx-auto h-14 w-14 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay listas creadas</h3>
                    <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">Crea tu primera lista para empezar a segmentar tus contactos y enviar campañas.</p>
                    <button onClick={() => setIsModalOpen(true)} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium">
                        <Plus size={16} className="inline mr-1" /> Crear mi primera lista
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map((list) => (
                        <div key={list.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                                <span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full border border-green-200 flex items-center gap-1 shrink-0">
                                    <Users size={12} />
                                    {list._count?.subscribers || 0}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                {list.description || "Sin descripción"}
                            </p>

                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openImportModal(list.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <Upload size={14} /> Importar CSV
                                    </button>
                                    <button
                                        onClick={() => { setAddContactListId(list.id); setManualPhone(""); setManualName("") }}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <UserPlus size={14} /> Agregar Manual
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <a href={`/admin/whatsapp/contactos?list=${list.id}`} className="flex-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-center font-medium transition-colors">
                                        Ver Contactos
                                    </a>
                                    <button onClick={() => openEditModal(list)} className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors" title="Editar">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(list.id)} className="text-xs text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear/Editar Lista */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">{editingListId ? "Editar Lista" : "Nueva Lista"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la lista</label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                    placeholder="Ej: Clientes VIP, Leads Mayo..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 h-24 resize-none"
                                    placeholder="Descripción de la audiencia para esta lista" />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                                    {editingListId ? "Guardar Cambios" : "Guardar Lista"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Importar CSV */}
            {importListId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-gray-900">Importar Contactos desde CSV</h2>
                            <button onClick={() => setImportListId(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>

                        {importStatus === "idle" && (
                            <div className="space-y-4">
                                <input type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50/50 transition-all group">
                                    <FileSpreadsheet className="w-12 h-12 text-gray-400 group-hover:text-green-600 mb-3 transition-colors" />
                                    <span className="text-sm font-medium text-gray-600">Arrastrá o seleccioná tu archivo .CSV</span>
                                    <span className="text-xs text-gray-400 mt-1">El archivo debe tener una columna con los números de teléfono</span>
                                </button>
                                <p className="text-xs text-gray-400 text-center">Formatos soportados: CSV, TXT separado por comas</p>
                            </div>
                        )}

                        {importStatus === "mapping" && (
                            <div className="space-y-5">
                                {importFile && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                        <span className="text-sm text-green-700 truncate">{importFile.name}</span>
                                        <span className="text-xs text-green-600 ml-auto">{importPreview.length} filas detectadas</span>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Mapeá las columnas de tu archivo:</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-red-600 mb-1 font-medium">Teléfono (obligatorio) *</label>
                                            <select value={importMapping.phone} onChange={(e) => setImportMapping({ ...importMapping, phone: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                                                <option value="">Seleccionar columna...</option>
                                                {importColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-500 mb-1 font-medium">Nombre (opcional)</label>
                                            <select value={importMapping.name} onChange={(e) => setImportMapping({ ...importMapping, name: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                                                <option value="">Seleccionar columna...</option>
                                                {importColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {importPreview.length > 0 && (
                                    <div>
                                        <h4 className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Vista Previa</h4>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                                    <tr>
                                                        <th className="px-4 py-2">Teléfono</th>
                                                        <th className="px-4 py-2">Nombre</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {importPreview.map((row, i) => (
                                                        <tr key={i} className="border-b border-gray-100">
                                                            <td className="px-4 py-2 text-gray-900 font-mono text-xs">{importMapping.phone ? row[importMapping.phone] : "-"}</td>
                                                            <td className="px-4 py-2 text-gray-600">{importMapping.name ? row[importMapping.name] : "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end pt-2">
                                    <button onClick={() => { setImportStatus("idle"); setImportFile(null) }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                                        Cambiar archivo
                                    </button>
                                    <button onClick={handleImportUpload} disabled={!importMapping.phone}
                                        className="px-5 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 font-medium">
                                        <Upload size={16} /> Importar Contactos
                                    </button>
                                </div>
                            </div>
                        )}

                        {importStatus === "uploading" && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
                                <p className="text-gray-600 font-medium">Importando contactos...</p>
                            </div>
                        )}

                        {importStatus === "success" && importResults && (
                            <div className="text-center space-y-4 py-6">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Importación Completada</h3>
                                <p className="text-green-600 font-medium">{importResults.success} contactos agregados a la lista.</p>
                                {importResults.errors.length > 0 && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                                        <p className="text-red-700 text-sm font-medium flex items-center gap-1.5"><AlertCircle size={14} /> {importResults.errors.length} filas omitidas</p>
                                        <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                                            {importResults.errors.slice(0, 3).map((err: any, i: number) => <li key={i}>{err.phone || "Fila"}: {err.error}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <button onClick={() => setImportListId(null)} className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">Cerrar</button>
                            </div>
                        )}

                        {importStatus === "error" && importResults && (
                            <div className="text-center space-y-4 py-6">
                                <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
                                <h3 className="text-lg font-bold text-gray-900">Error en la importación</h3>
                                <p className="text-red-600 text-sm">{importResults.errors[0]?.error || "Error desconocido"}</p>
                                <button onClick={() => { setImportStatus("idle"); setImportFile(null) }} className="mt-3 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">Reintentar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Agregar Contacto Manual */}
            {addContactListId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-green-600" /> Agregar Contacto</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (con código de país) *</label>
                                <input type="text" required value={manualPhone} onChange={(e) => setManualPhone(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                    placeholder="Ej: 5491122334455" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
                                <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                    placeholder="Nombre del contacto" />
                            </div>
                            <div className="flex gap-3 justify-end pt-3">
                                <button type="button" onClick={() => setAddContactListId(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                                <button onClick={handleAddManualContact} disabled={!manualPhone || addingContact}
                                    className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-medium">
                                    {addingContact ? "Agregando..." : "Agregar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
