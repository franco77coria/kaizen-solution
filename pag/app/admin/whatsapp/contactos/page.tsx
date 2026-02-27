"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Papa from "papaparse"
import { Upload, Users, FileSpreadsheet, CheckCircle2, AlertCircle, Plus, Edit2, Trash2, UserMinus, UserPlus, Search } from "lucide-react"

function ContactosPageContent() {
    const [lists, setLists] = useState<any[]>([])
    const [contacts, setContacts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const [activeTab, setActiveTab] = useState<"list" | "import">("list")

    // Import State
    const [selectedList, setSelectedList] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [mapping, setMapping] = useState<{ [key: string]: string }>({ phone: "", name: "" })
    const [status, setStatus] = useState<"idle" | "parsing" | "mapping" | "uploading" | "success" | "error">("idle")
    const [results, setResults] = useState<{ success: number; errors: any[] } | null>(null)

    // Edit State
    const [editingContact, setEditingContact] = useState<any>(null)
    const [editName, setEditName] = useState("")
    const [editPhone, setEditPhone] = useState("")
    const [editSaving, setEditSaving] = useState(false)

    // Add Manual Contact
    const [showAddManual, setShowAddManual] = useState(false)
    const [manualPhone, setManualPhone] = useState("")
    const [manualName, setManualName] = useState("")
    const [addingManual, setAddingManual] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const searchParams = useSearchParams()
    const currentListId = searchParams.get("list")

    useEffect(() => {
        loadContacts()
        fetchLists()
    }, [currentListId])

    const loadContacts = async () => {
        setLoading(true)
        try {
            const url = currentListId ? `/api/whatsapp/contacts?list=${currentListId}` : "/api/whatsapp/contacts"
            const res = await fetch(url)
            const data = await res.json()
            setContacts(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchLists = async () => {
        try {
            const res = await fetch("/api/whatsapp/lists")
            const data = await res.json()
            setLists(Array.isArray(data) ? data : [])
        } catch (e) { console.error(e) }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = e.target.files[0]
            setFile(selected)
            setStatus("parsing")

            Papa.parse(selected, {
                header: true,
                skipEmptyLines: true,
                preview: 5,
                complete: (results) => {
                    const fields = results.meta.fields || []
                    setColumns(fields)
                    setPreviewData(results.data)

                    const lower = fields.map(f => f.toLowerCase())
                    let newPhone = "", newName = ""
                    const pi = lower.findIndex(c => c.includes("telefon") || c.includes("phone") || c.includes("celular") || c.includes("numero") || c.includes("whatsapp"))
                    if (pi !== -1) newPhone = fields[pi]
                    const ni = lower.findIndex(c => c.includes("nombre") || c.includes("name") || c.includes("contacto"))
                    if (ni !== -1) newName = fields[ni]

                    setMapping({ phone: newPhone, name: newName })
                    setStatus("mapping")
                }
            })
        }
    }

    const handleUpload = () => {
        if (!file || !mapping.phone) return
        setStatus("uploading")

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const payload = results.data.map((row: any) => ({
                    phone: row[mapping.phone],
                    name: mapping.name ? row[mapping.name] : null,
                }))

                try {
                    const res = await fetch("/api/whatsapp/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contacts: payload, listId: selectedList || undefined }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                        setResults({ success: data.successCount, errors: data.errors || [] })
                        setStatus("success")
                        loadContacts()
                    } else {
                        setResults({ success: 0, errors: [{ error: data.error }] })
                        setStatus("error")
                    }
                } catch (err: any) {
                    setResults({ success: 0, errors: [{ error: err.message }] })
                    setStatus("error")
                }
            }
        })
    }

    const filtered = contacts.filter((c) => {
        if (!search) return true
        const q = search.toLowerCase()
        return c.phone?.includes(q) || c.name?.toLowerCase().includes(q)
    })

    const handleDeleteContact = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este contacto?")) return
        try {
            const res = await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' })
            if (res.ok) loadContacts()
            else alert("Error al eliminar el contacto.")
        } catch (e) { console.error(e) }
    }

    const handleSaveEdit = async () => {
        if (!editingContact) return
        setEditSaving(true)
        try {
            const res = await fetch(`/api/whatsapp/contacts/${editingContact.id}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, phone: editPhone })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setEditingContact(null)
                loadContacts()
            } else {
                alert(data.error || "Error al actualizar el contacto. Verificá que el teléfono no esté duplicado.")
            }
        } catch (e) {
            console.error(e)
            alert("Error de conexión al actualizar.")
        } finally {
            setEditSaving(false)
        }
    }

    const handleRemoveFromList = async (id: string) => {
        if (!currentListId) return
        if (!confirm("¿Remover este contacto de esta lista? (No se elimina del directorio)")) return
        try {
            const res = await fetch(`/api/whatsapp/lists/${currentListId}/remove-contact?contactId=${id}`, { method: 'DELETE' })
            if (res.ok) loadContacts()
            else alert("Error al remover el contacto de la lista.")
        } catch (e) { console.error(e) }
    }

    const handleAddManualContact = async () => {
        if (!manualPhone) return
        setAddingManual(true)
        try {
            const res = await fetch("/api/whatsapp/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contacts: [{ phone: manualPhone.replace(/[^0-9]/g, ""), name: manualName || null }],
                    listId: currentListId || undefined,
                }),
            })
            if (res.ok) {
                setShowAddManual(false)
                setManualPhone("")
                setManualName("")
                loadContacts()
            } else {
                const data = await res.json()
                alert(data.error || "Error al agregar contacto")
            }
        } catch (e) { console.error(e) }
        finally { setAddingManual(false) }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Users className="text-green-600" />
                        {currentListId ? "Contactos de la Lista" : "Contactos"}
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Administra tu base de contactos o importa nuevos desde CSV.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab("list")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            Directorio
                        </button>
                        <button onClick={() => setActiveTab("import")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "import" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            <Upload size={16} /> Importar CSV
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === "list" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Buscar por nombre o teléfono..."
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                        </div>
                        <button onClick={() => { setShowAddManual(true); setManualPhone(""); setManualName("") }}
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                            <UserPlus size={16} /> Agregar
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-16 text-sm text-gray-400">
                                {search ? 'Sin resultados para tu búsqueda' : 'No hay contactos aún. Importá un CSV o agregá uno manualmente.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Contacto</th>
                                            <th className="px-6 py-3 font-semibold">Teléfono</th>
                                            <th className="px-6 py-3 font-semibold">Origen</th>
                                            <th className="px-6 py-3 font-semibold">Mensajes</th>
                                            <th className="px-6 py-3 font-semibold">Estado (Ventana)</th>
                                            <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filtered.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex flex-shrink-0 items-center justify-center font-bold text-xs border border-green-200">
                                                            {c.name ? c.name.substring(0, 2).toUpperCase() : '?'}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{c.name || 'Sin Nombre'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600 font-mono text-xs">+{c.phone}</td>
                                                <td className="px-6 py-3">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{c.source || 'Recibido'}</span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500">{c.totalMessages || 0}</td>
                                                <td className="px-6 py-3">
                                                    {c.hasWindow ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Activo
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">Cerrada</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => { setEditingContact(c); setEditName(c.name || ""); setEditPhone(c.phone || "") }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                            <Edit2 size={15} />
                                                        </button>
                                                        {currentListId && (
                                                            <button onClick={() => handleRemoveFromList(c.id)}
                                                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Remover de lista">
                                                                <UserMinus size={15} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteContact(c.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && filtered.length > 0 && (
                            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                                Mostrando {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "import" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-6 lg:col-span-1">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Destino</h3>
                            <label className="block text-sm text-gray-500 mb-2">Seleccionar Lista (Opcional)</label>
                            <select value={selectedList} onChange={(e) => setSelectedList(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                <option value="">Base de Datos General</option>
                                {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                            </select>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Archivo CSV</h3>
                            <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                            <button onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50/50 transition-all group">
                                <FileSpreadsheet className="w-10 h-10 text-gray-400 group-hover:text-green-600 mb-3 transition-colors" />
                                <span className="text-sm font-medium text-gray-600">Seleccionar Archivo .CSV</span>
                                <span className="text-xs text-gray-400 mt-1">Debe tener una columna de teléfono</span>
                            </button>
                            {file && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-green-700 truncate pr-4">{file.name}</span>
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {status === "idle" && (
                            <div className="h-full min-h-[300px] border border-gray-200 border-dashed rounded-xl flex items-center justify-center text-gray-400 bg-white">
                                Subí un archivo para comenzar el mapeo
                            </div>
                        )}

                        {(status === "parsing" || status === "mapping") && (
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">3. Mapeo de Columnas</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-red-600 mb-1 font-medium">Teléfono (obligatorio) *</label>
                                        <select value={mapping.phone} onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                                            <option value="">Seleccionar Columna</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-1 font-medium">Nombre (opcional)</label>
                                        <select value={mapping.name} onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20">
                                            <option value="">Seleccionar Columna</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {previewData.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Vista Previa (5 filas)</h4>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                                    <tr>
                                                        <th className="px-4 py-2">Teléfono</th>
                                                        <th className="px-4 py-2">Nombre</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.map((row, i) => (
                                                        <tr key={i} className="border-b border-gray-100">
                                                            <td className="px-4 py-2 text-gray-900 font-mono text-xs">{mapping.phone ? row[mapping.phone] : "-"}</td>
                                                            <td className="px-4 py-2 text-gray-600">{mapping.name ? row[mapping.name] : "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleUpload} disabled={!mapping.phone}
                                    className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition">
                                    <Upload size={18} /> Iniciar Importación
                                </button>
                            </div>
                        )}

                        {status === "uploading" && (
                            <div className="bg-white p-10 min-h-[300px] rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
                                <h3 className="text-gray-900 font-medium text-lg">Procesando contactos...</h3>
                            </div>
                        )}

                        {status === "success" && results && (
                            <div className="bg-white p-8 rounded-xl border border-green-200 shadow-sm text-center space-y-4">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Importación Completada</h3>
                                <p className="text-green-600">{results.success} contactos importados correctamente.</p>
                                {results.errors.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                        <h4 className="text-red-700 font-medium flex items-center gap-2 mb-2">
                                            <AlertCircle size={16} /> {results.errors.length} filas omitidas
                                        </h4>
                                        <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                                            {results.errors.slice(0, 5).map((err: any, i: number) => <li key={i}>{err.phone || "Fila"}: {err.error}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <button onClick={() => { setStatus("idle"); setFile(null); setResults(null) }}
                                    className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
                                    Subir otro archivo
                                </button>
                            </div>
                        )}

                        {status === "error" && results && (
                            <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm text-center space-y-4">
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900">Error en la importación</h3>
                                <p className="text-red-600">{results.errors[0]?.error || "Error desconocido"}</p>
                                <button onClick={() => setStatus("idle")} className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">Reintentar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Editar Contacto */}
            {editingContact && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Editar Contacto</h3>
                            <button onClick={() => setEditingContact(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    placeholder="Nombre del contacto" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    placeholder="Ej. 5491100000000" />
                                <p className="text-xs text-gray-400 mt-1">Si cambiás el teléfono, asegurate que no exista otro contacto con el mismo número.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setEditingContact(null)} className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} disabled={editSaving}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
                                {editSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agregar Contacto Manual */}
            {showAddManual && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus size={18} className="text-green-600" /> Agregar Contacto</h3>
                            <button onClick={() => setShowAddManual(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono (con código de país) *</label>
                                <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    placeholder="Ej: 5491122334455" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre (opcional)</label>
                                <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    placeholder="Nombre del contacto" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setShowAddManual(false)} className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button onClick={handleAddManualContact} disabled={!manualPhone || addingManual}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                                {addingManual ? "Agregando..." : "Agregar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ContactosPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <ContactosPageContent />
        </Suspense>
    )
}
