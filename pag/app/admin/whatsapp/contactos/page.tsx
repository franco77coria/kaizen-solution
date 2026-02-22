"use client"

import { useState, useRef, useEffect } from "react"
import Papa from "papaparse"
import { Upload, Users, FileSpreadsheet, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function ContactosPage() {
    const [lists, setLists] = useState<any[]>([])
    const [contacts, setContacts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Tabs: 'list' | 'import'
    const [activeTab, setActiveTab] = useState<"list" | "import">("list")

    // Import State
    const [selectedList, setSelectedList] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [mapping, setMapping] = useState<{ [key: string]: string }>({ phone: "", name: "" })
    const [status, setStatus] = useState<"idle" | "parsing" | "mapping" | "uploading" | "success" | "error">("idle")
    const [results, setResults] = useState<{ success: number; errors: any[] } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadContacts()
        fetchLists()
    }, [])

    const loadContacts = async () => {
        try {
            const res = await fetch("/api/whatsapp/contacts")
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
            setLists(data)
        } catch (e) {
            console.error(e)
        }
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
                    setColumns(results.meta.fields || [])
                    setPreviewData(results.data)

                    const ObjectKeysCaseInsensitive = (results.meta.fields || []).map(f => f.toLowerCase())
                    let newPhone = "", newName = ""

                    const phoneIndex = ObjectKeysCaseInsensitive.findIndex(c => c.includes("telefon") || c.includes("phone") || c.includes("celular"))
                    if (phoneIndex !== -1) newPhone = (results.meta.fields || [])[phoneIndex]

                    const nameIndex = ObjectKeysCaseInsensitive.findIndex(c => c.includes("nombre") || c.includes("name") || c.includes("contacto"))
                    if (nameIndex !== -1) newName = (results.meta.fields || [])[nameIndex]

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
                        setResults({ success: data.successCount, errors: data.errors })
                        setStatus("success")
                        loadContacts() // recargar tabla
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
        return c.phone.includes(q) || c.name?.toLowerCase().includes(q)
    })

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1A1D24] border border-[#2A2D35] p-6 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="text-teal-400" />
                        Agenda y Contactos
                    </h1>
                    <p className="text-gray-400 mt-1">Administra tu base de datos de usuarios o importa nuevos desde CSV.</p>
                </div>

                <div className="flex bg-[#111318] p-1 rounded-lg border border-[#2A2D35]">
                    <button
                        onClick={() => setActiveTab("list")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "list"
                                ? "bg-[#2A2D35] text-white shadow"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Directorio
                    </button>
                    <button
                        onClick={() => setActiveTab("import")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === "import"
                                ? "bg-teal-500/10 text-teal-400 shadow border border-teal-500/20"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <Upload size={16} /> Importar CSV
                    </button>
                </div>
            </div>

            {activeTab === "list" && (
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o teléfono..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-md bg-[#111318] border border-[#2A2D35] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    />

                    <Card className="border-[#2A2D35] bg-[#1A1D24]">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-16 text-sm text-gray-400">
                                    {search ? 'Sin resultados' : 'No hay contactos aún. Importa un CSV para comenzar.'}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[#111318] text-gray-400 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">Contacto</th>
                                                <th className="px-6 py-4 font-semibold">Teléfono</th>
                                                <th className="px-6 py-4 font-semibold">Origen</th>
                                                <th className="px-6 py-4 font-semibold">Mensajes</th>
                                                <th className="px-6 py-4 font-semibold">Estado (Ventana)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#2A2D35]">
                                            {filtered.map((c) => (
                                                <tr key={c.id} className="hover:bg-[#20242B] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 flex flex-shrink-0 items-center justify-center font-bold text-xs border border-teal-500/20">
                                                                {c.name ? c.name.substring(0, 2).toUpperCase() : '?'}
                                                            </div>
                                                            <span className="font-medium text-white">{c.name || 'Sin Nombre'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300 font-mono">+{c.phone}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-[#2A2D35] text-gray-300 px-2 py-1 rounded text-xs">
                                                            {c.source || 'Recibido'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400">{c.totalMessages}</td>
                                                    <td className="px-6 py-4">
                                                        {c.hasWindow ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                                Activo (Ventana)
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500 bg-[#111318] px-2.5 py-1 rounded-full border border-[#2A2D35]">
                                                                Cerrada
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}


            {activeTab === "import" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ... (Igual que el componente CSV creado anteriormente) ... */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="bg-[#1A1D24] p-5 rounded-xl border border-[#2A2D35]">
                            <h3 className="text-lg font-semibold text-white mb-4">1. Destino</h3>
                            <label className="block text-sm text-gray-400 mb-2">Seleccionar Lista (Opcional)</label>
                            <select
                                value={selectedList}
                                onChange={(e) => setSelectedList(e.target.value)}
                                className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                            >
                                <option value="">Base de Datos General</option>
                                {lists.map(list => (
                                    <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-[#1A1D24] p-5 rounded-xl border border-[#2A2D35]">
                            <h3 className="text-lg font-semibold text-white mb-4">2. Archivo CSV</h3>

                            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#2A2D35] rounded-xl hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group"
                            >
                                <FileSpreadsheet className="w-10 h-10 text-gray-500 group-hover:text-teal-400 mb-3 transition-colors" />
                                <span className="text-sm font-medium text-gray-300">Seleccionar Archivo .CSV</span>
                                <span className="text-xs text-gray-500 mt-1">Max 5MB</span>
                            </button>

                            {file && (
                                <div className="mt-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-teal-400 truncate pr-4">{file.name}</span>
                                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {status === "idle" && (
                            <div className="h-full min-h-[300px] border border-[#2A2D35] border-dashed rounded-xl flex items-center justify-center text-gray-500 bg-[#1A1D24]">
                                Sube un archivo para comenzar el mapeo
                            </div>
                        )}

                        {status === "mapping" && (
                            <div className="bg-[#1A1D24] p-5 rounded-xl border border-[#2A2D35] space-y-4">
                                <h3 className="text-lg font-semibold text-white">3. Mapeo de Columnas</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-red-400 mb-1">Teléfono (Requerido) *</label>
                                        <select
                                            value={mapping.phone}
                                            onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                                            className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="">Seleccionar Columna</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                                        <select
                                            value={mapping.name}
                                            onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                                            className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="">Seleccionar Columna</option>
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h4 className="text-sm text-gray-400 mb-2">Vista Previa (5 filas)</h4>
                                    <div className="overflow-x-auto rounded-lg border border-[#2A2D35]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-[#111318] text-gray-400 uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-2">Teléfono Extraído</th>
                                                    <th className="px-4 py-2">Nombre Extraído</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="border-b border-[#2A2D35] bg-[#1A1D24]">
                                                        <td className="px-4 py-2 text-white">{mapping.phone ? row[mapping.phone] : "-"}</td>
                                                        <td className="px-4 py-2 text-gray-300">{mapping.name ? row[mapping.name] : "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpload}
                                    disabled={!mapping.phone}
                                    className="w-full mt-4 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
                                >
                                    <Upload size={18} />
                                    Iniciar Importación
                                </button>
                            </div>
                        )}

                        {status === "uploading" && (
                            <div className="bg-[#1A1D24] p-10 min-h-[300px] rounded-xl border border-[#2A2D35] flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                                <h3 className="text-white font-medium text-lg">Procesando y Guardando Contactos...</h3>
                            </div>
                        )}

                        {status === "success" && results && (
                            <div className="bg-[#1A1D24] p-8 rounded-xl border border-green-500/30 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">¡Importación Completada!</h3>
                                <p className="text-green-400">{results.success} contactos listos en la base de datos.</p>

                                {results.errors.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                                        <h4 className="text-red-400 font-medium flex items-center gap-2 mb-2">
                                            <AlertCircle size={16} /> Hubo {results.errors.length} filas omitidas
                                        </h4>
                                        <ul className="text-xs text-red-300 space-y-1 max-h-32 overflow-y-auto">
                                            {results.errors.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err.phone || "Fila"}: {err.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button
                                    onClick={() => { setStatus("idle"); setFile(null); setResults(null); }}
                                    className="mt-6 px-6 py-2 bg-[#2A2D35] hover:bg-[#343842] text-white rounded-lg transition"
                                >
                                    Subir otro archivo
                                </button>
                            </div>
                        )}

                        {status === "error" && results && (
                            <div className="bg-[#1A1D24] p-8 rounded-xl border border-red-500/30 text-center space-y-4">
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white">Fallo en la importación</h3>
                                <p className="text-red-400">{results.errors[0]?.error || "Error desconocido"}</p>
                                <button onClick={() => setStatus("idle")} className="mt-4 px-6 py-2 bg-[#2A2D35] text-white rounded-lg">Reintentar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
