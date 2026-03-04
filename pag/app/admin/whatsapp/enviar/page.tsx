"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { SendHorizonal, Plus, PlayCircle, PauseCircle, Trash2, Clock, ImageIcon, Zap, Upload, ExternalLink } from "lucide-react"

export default function CampanasPage() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [lists, setLists] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [voices, setVoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newCampaign, setNewCampaign] = useState({
        name: "",
        type: "template" as "template" | "audio" | "image" | "sequence",
        audienceMode: "list" as "list" | "active_window",
        listId: "",
        templateId: "",
        mapping: {} as Record<string, string>,
        audioConfig: { voiceId: "", prompt: "", imageUrl: "", imageCaption: "", caption: "", preRecordedAudioUrl: "" } as any,
        scheduledFor: ""
    })

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
    const [activeWindowContacts, setActiveWindowContacts] = useState<any[]>([])
    const [loadingWindow, setLoadingWindow] = useState(false)
    const [excludedContactIds, setExcludedContactIds] = useState<Set<string>>(new Set())
    const [imageInputMode, setImageInputMode] = useState<"url" | "file">("url")
    const [uploadingImage, setUploadingImage] = useState(false)
    const [audioMode, setAudioMode] = useState<"full_ai" | "ai_plus_recorded">("full_ai")
    const [uploadingAudio, setUploadingAudio] = useState(false)
    const mockColumns = ["phone", "name", "tags", "source", "externalId"]

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [campRes, listRes, tempRes, voiceRes] = await Promise.all([
                fetch("/api/whatsapp/campaigns"),
                fetch("/api/whatsapp/lists"),
                fetch("/api/whatsapp/templates/sync"),
                fetch("/api/elevenlabs/voices")
            ])

            const [campData, listData, tempData, voiceData] = await Promise.all([
                campRes.json(), listRes.json(), tempRes.json(), voiceRes.json()
            ])

            setCampaigns(Array.isArray(campData) ? campData : [])
            setLists(Array.isArray(listData) ? listData : [])
            setTemplates(Array.isArray(tempData) ? tempData.filter((t: any) => t.status === 'APPROVED') : [])
            if (voiceData?.success && voiceData?.voices?.length > 0) {
                setVoices(voiceData.voices)
                setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, voiceId: voiceData.voices[0].voice_id } }))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleImageFileUpload = async (file: File) => {
        setUploadingImage(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/whatsapp/media-upload", { method: "POST", body: fd })
            const data = await res.json()
            if (data.success) {
                setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, imageUrl: data.url } }))
            } else {
                alert(data.error || "Error al subir la imagen")
            }
        } catch {
            alert("Error al subir la imagen")
        } finally {
            setUploadingImage(false)
        }
    }

    const handleAudioFileUpload = async (file: File) => {
        setUploadingAudio(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/whatsapp/media-upload", { method: "POST", body: fd })
            const data = await res.json()
            if (data.success) {
                setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, preRecordedAudioUrl: data.url } }))
            } else {
                alert(data.error || "Error al subir el audio")
            }
        } catch {
            alert("Error al subir el audio")
        } finally {
            setUploadingAudio(false)
        }
    }

    const fetchActiveWindowContacts = async () => {
        setLoadingWindow(true)
        try {
            const res = await fetch("/api/whatsapp/contacts/active-window")
            const data = await res.json()
            setActiveWindowContacts(data.contacts || [])
            setExcludedContactIds(new Set())
        } catch { setActiveWindowContacts([]) }
        finally { setLoadingWindow(false) }
    }

    const toggleExcludeContact = (id: string) => {
        setExcludedContactIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleExcludeAll = () => {
        if (excludedContactIds.size === activeWindowContacts.length) {
            setExcludedContactIds(new Set())
        } else {
            setExcludedContactIds(new Set(activeWindowContacts.map((c: any) => c.id)))
        }
    }

    const handleTemplateSelect = (tempId: string) => {
        const temp = templates.find(t => t.id === tempId)
        setSelectedTemplate(temp)
        setNewCampaign({ ...newCampaign, templateId: tempId, mapping: {} })
    }

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (newCampaign.type === "template" && !newCampaign.templateId) {
                return alert("Seleccioná una plantilla")
            }
            if (newCampaign.type === "audio" && (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt)) {
                return alert("Falta configurar la voz o el texto del audio")
            }
            if (newCampaign.type === "image" && !newCampaign.audioConfig.imageUrl) {
                return alert("Falta la imagen (URL o archivo subido)")
            }
            if (newCampaign.type === "sequence") {
                if (!newCampaign.templateId) return alert("Seleccioná una plantilla para el primer mensaje")
                if (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt) return alert("Falta configurar la voz o el texto del audio")
            }

            const payload: any = { ...newCampaign }
            if (payload.type === "template") {
                payload.audioConfig = { voiceId: "", prompt: "", imageUrl: "", imageCaption: "", caption: "" };
            } else if (payload.type !== "sequence") {
                payload.templateId = "";
            }
            if (newCampaign.audienceMode === 'active_window' && excludedContactIds.size > 0) {
                payload.excludedContactIds = Array.from(excludedContactIds)
            }

            const res = await fetch("/api/whatsapp/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                setIsModalOpen(false)
                setNewCampaign({
                    name: "", type: "template", audienceMode: "list", listId: "", templateId: "", mapping: {},
                    audioConfig: { voiceId: voices[0]?.voice_id || "", prompt: "", imageUrl: "", imageCaption: "", caption: "" },
                    scheduledFor: ""
                })
                fetchData()
            } else {
                alert("Error creando la campaña")
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleTestCampaign = async (e: React.FormEvent) => {
        e.preventDefault()
        const testPhone = prompt("Ingrese su número de WhatsApp con código de país para probar (Ej: 5491122334455):")
        if (!testPhone) return;

        try {
            if (newCampaign.type === "template" && !newCampaign.templateId) {
                return alert("Seleccioná una plantilla")
            }
            if (newCampaign.type === "audio" && (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt)) {
                return alert("Falta configurar la voz o el texto del audio")
            }
            if (newCampaign.type === "image" && !newCampaign.audioConfig.imageUrl) {
                return alert("Falta la imagen (URL o archivo subido)")
            }

            const payload = { ...newCampaign, testPhone }
            if (payload.type === "template") {
                payload.audioConfig = { voiceId: "", prompt: "", imageUrl: "", imageCaption: "", caption: "" };
            } else {
                payload.templateId = "";
            }

            const res = await fetch("/api/whatsapp/campaigns/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                alert("Prueba enviada exitosamente")
            } else {
                const data = await res.json()
                alert(`Error en prueba: ${data.error || 'Desconocido'}`)
            }
        } catch (e) {
            console.error(e)
            alert("Error ejecutando la prueba")
        }
    }

    const handleStatusChange = async (id: string, action: 'start' | 'pause' | 'cancel') => {
        try {
            await fetch(`/api/whatsapp/campaigns/${id}/${action}`, { method: 'POST' })
            fetchData()
        } catch (e) { console.error(e) }
    }

    const handleDeleteCampaign = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción no se puede deshacer.`)) return
        try {
            await fetch(`/api/whatsapp/campaigns/${id}`, { method: 'DELETE' })
            fetchData()
        } catch (e) { console.error(e) }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'running': return <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-200">En Progreso</span>
            case 'completed': return <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">Completada</span>
            case 'paused': return <span className="px-2 py-1 bg-yellow-50 text-yellow-600 text-xs rounded-full border border-yellow-200">Pausada</span>
            case 'failed': return <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full border border-red-200">Fallida</span>
            default: return <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">Borrador</span>
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <SendHorizonal className="text-green-600" />
                        Campañas Masivas
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Crea secuencias de envío programadas usando tus listas y plantillas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg transition-all font-medium shadow-sm"
                >
                    <Plus size={18} />
                    Nueva Campaña
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center">
                    <SendHorizonal className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Empieza a enviar mensajes</h3>
                    <p className="text-gray-500 max-w-sm text-sm">No tienes campañas creadas. Asegúrate de tener Listas y Plantillas listas antes de empezar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {campaigns.map((camp) => {
                        let stats: any = {}
                        try { stats = JSON.parse(camp.stats || "{}") } catch { }
                        const progress = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0

                        return (
                            <div key={camp.id} className="bg-white border border-gray-200 p-5 rounded-xl flex items-center justify-between hover:border-green-300 transition-colors group shadow-sm">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{camp.name}</h3>
                                        {getStatusBadge(camp.status)}
                                        {camp.type === 'audio' && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md border border-purple-200">Audio IA</span>}
                                        {camp.type === 'image' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-200">Imagen + Texto</span>}
                                        {camp.type === 'sequence' && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-200">Secuencia</span>}
                                    </div>
                                    <div className="text-sm text-gray-500 flex gap-4">
                                        <span>Lista: <strong className="text-gray-700">{camp.list?.name || 'Desconocida'}</strong></span>
                                        <span>Template: <strong className="text-gray-700">{camp.type === 'audio' ? 'Ninguno (Audio Libre)' : (camp.template?.name || 'Desconocido')}</strong></span>
                                    </div>
                                </div>

                                <div className="w-48 px-6 border-l border-gray-200">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Progreso</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                                        <span className="text-green-600" title="Entregados">{stats.delivered || 0} D</span>
                                        <span className="text-blue-600" title="Leídos">{stats.read || 0} R</span>
                                        <span className="text-red-600" title="Fallidos">{stats.failed || 0} F</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pl-6">
                                    <Link href={`/admin/whatsapp/campanas/${camp.id}`} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Ver detalle">
                                        <ExternalLink size={18} />
                                    </Link>
                                    {camp.status === 'draft' || camp.status === 'paused' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'start')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Iniciar Envío">
                                            <PlayCircle size={24} />
                                        </button>
                                    ) : camp.status === 'running' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'pause')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Pausar Envío">
                                            <PauseCircle size={24} />
                                        </button>
                                    ) : null}
                                    <button onClick={() => handleDeleteCampaign(camp.id, camp.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar campaña">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* MODAL CREAR CAMPAÑA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Configurar Nueva Campaña</h2>

                        <form onSubmit={handleCreateCampaign} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Envío</label>
                                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "template", mapping: {} })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'template' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Plantilla
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "image", mapping: {} })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'image' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Imagen + Texto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "audio", mapping: {} })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'audio' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Audio IA
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "sequence", mapping: {} })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'sequence' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Secuencia
                                        </button>
                                    </div>
                                    {(newCampaign.type === 'audio' || newCampaign.type === 'image') && (
                                        <p className="text-xs text-yellow-700 mt-2 text-center bg-yellow-50 py-1.5 rounded-lg border border-yellow-200">
                                            Requiere que el cliente haya respondido en las últimas 24hs (ventana abierta).
                                        </p>
                                    )}
                                    {newCampaign.type === 'sequence' && (
                                        <p className="text-xs text-indigo-700 mt-2 text-center bg-indigo-50 py-1.5 rounded-lg border border-indigo-200">
                                            Envía un template → espera respuesta → envía audio + imagen automáticamente. Expira en 5hs sin respuesta.
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Campaña</label>
                                    <input
                                        type="text" required
                                        value={newCampaign.name}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none"
                                        placeholder="Ej. Promoción Verano 2026"
                                    />
                                </div>

                                {(newCampaign.type === 'image' || newCampaign.type === 'audio' || newCampaign.type === 'sequence') && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Audiencia</label>
                                        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setNewCampaign({ ...newCampaign, audienceMode: "list", listId: "" })}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.audienceMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Lista específica
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewCampaign({ ...newCampaign, audienceMode: "active_window", listId: "__active_window__" })
                                                    if (activeWindowContacts.length === 0) fetchActiveWindowContacts()
                                                }}
                                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${newCampaign.audienceMode === 'active_window' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <Zap size={14} />
                                                Ventana Activa (24hs)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(newCampaign.type === 'template' || newCampaign.audienceMode === 'list') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {newCampaign.type === 'template' ? 'Audiencia (Lista)' : 'Lista'}
                                        </label>
                                        <select required={newCampaign.audienceMode === 'list'} value={newCampaign.listId === '__active_window__' ? '' : newCampaign.listId} onChange={(e) => setNewCampaign({ ...newCampaign, listId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                            <option value="">Seleccione una lista...</option>
                                            {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l._count?.subscribers || 0} contactos)</option>)}
                                        </select>
                                    </div>
                                )}

                                {newCampaign.audienceMode === 'active_window' && (newCampaign.type === 'image' || newCampaign.type === 'audio' || newCampaign.type === 'sequence') && (
                                    <div className="col-span-2">
                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={16} className="text-emerald-600" />
                                                    <span className="text-sm font-medium text-emerald-800">Contactos con ventana activa</span>
                                                </div>
                                                <button type="button" onClick={fetchActiveWindowContacts} className="text-xs text-emerald-600 hover:text-emerald-800 underline">
                                                    {loadingWindow ? 'Cargando...' : 'Refrescar'}
                                                </button>
                                            </div>
                                            {loadingWindow ? (
                                                <div className="flex justify-center py-3">
                                                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-lg font-bold text-emerald-700">
                                                            {activeWindowContacts.length - excludedContactIds.size}
                                                            <span className="text-sm font-normal"> / {activeWindowContacts.length} seleccionados</span>
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={toggleExcludeAll}
                                                            className="text-xs text-emerald-700 hover:text-emerald-900 underline"
                                                        >
                                                            {excludedContactIds.size === activeWindowContacts.length ? 'Seleccionar todos' : 'Deseleccionar todos'}
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-emerald-600 mb-2">Desmarcá los contactos que no querés incluir en el envío.</p>
                                                    {activeWindowContacts.length > 0 && (
                                                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                            {activeWindowContacts.map((c: any) => {
                                                                const excluded = excludedContactIds.has(c.id)
                                                                return (
                                                                    <label
                                                                        key={c.id}
                                                                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${excluded ? 'bg-gray-100 opacity-50' : 'bg-white/70 hover:bg-white'}`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!excluded}
                                                                                onChange={() => toggleExcludeContact(c.id)}
                                                                                className="accent-emerald-600"
                                                                            />
                                                                            <span className="text-gray-800 font-medium">{c.name || 'Sin nombre'}</span>
                                                                        </div>
                                                                        <span className="text-gray-400 font-mono">{c.phone}</span>
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {(newCampaign.type === 'template' || newCampaign.type === 'sequence') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {newCampaign.type === 'sequence' ? 'Plantilla inicial (1er mensaje)' : 'Plantilla'}
                                        </label>
                                        <select required value={newCampaign.templateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                            <option value="">Seleccione una plantilla aprobada...</option>
                                            {templates.map(t => {
                                                const isTw = typeof t.wabaId === "string" && t.wabaId.startsWith("HX")
                                                return <option key={t.id} value={t.id}>[{isTw ? "Twilio" : "Meta"}] {t.name}</option>
                                            })}
                                        </select>
                                        {templates.length === 0 && (
                                            <p className="text-xs text-amber-600 mt-1">No hay plantillas sincronizadas. Andá a la página de Plantillas y sincronizá primero.</p>
                                        )}
                                    </div>
                                )}
                                {(newCampaign.type === 'audio' || newCampaign.type === 'sequence') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {newCampaign.type === 'sequence' ? 'Voz para audio de respuesta (ElevenLabs)' : 'Voz (ElevenLabs)'}
                                        </label>
                                        <select required value={newCampaign.audioConfig.voiceId} onChange={(e) => setNewCampaign({ ...newCampaign, audioConfig: { ...newCampaign.audioConfig, voiceId: e.target.value } })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                                            {voices.length === 0 && <option value="">Sin configurar</option>}
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {newCampaign.type === 'image' && (
                                    <div className="col-span-2" />
                                )}
                            </div>

                            {/* Programar envío */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                    <Clock size={14} />
                                    Programar envío (opcional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newCampaign.scheduledFor}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduledFor: e.target.value })}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {newCampaign.scheduledFor
                                        ? `Se enviará el ${new Date(newCampaign.scheduledFor).toLocaleString('es-AR')}`
                                        : 'Dejá vacío para enviar manualmente'
                                    }
                                </p>
                            </div>

                            {(newCampaign.type === 'audio' || newCampaign.type === 'sequence') && (
                                <div className="col-span-2 space-y-3">
                                    {/* Audio mode toggle */}
                                    {(newCampaign.type === 'sequence' || newCampaign.type === 'audio') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Audio</label>
                                            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setAudioMode("full_ai")}
                                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${audioMode === 'full_ai' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    🤖 IA Completa
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAudioMode("ai_plus_recorded")}
                                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${audioMode === 'ai_plus_recorded' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                >
                                                    🤖+🎙️ IA + Grabado
                                                </button>
                                            </div>
                                            {audioMode === 'ai_plus_recorded' && (
                                                <p className="text-xs text-indigo-600 mt-1.5 bg-indigo-50 py-1.5 px-3 rounded-lg border border-indigo-200">
                                                    💡 La parte personalizada (ej: &quot;Hola Juan&quot;) se genera con IA. El mensaje principal se envía con tu audio grabado. <strong>Ahorro ~90% en ElevenLabs.</strong>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {audioMode === 'ai_plus_recorded' ? 'Texto personalizado IA (saludo corto)' : (newCampaign.type === 'sequence' ? 'Texto del audio (se envía al responder)' : 'Texto a Narrar')}
                                            {' '}<span className="text-gray-400 font-normal">(podés usar <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>)</span>
                                        </label>
                                        <textarea
                                            required
                                            value={newCampaign.audioConfig.prompt}
                                            onChange={(e) => {
                                                const prompt = e.target.value
                                                setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, prompt } }))
                                            }}
                                            rows={audioMode === 'ai_plus_recorded' ? 2 : 4}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none resize-none font-mono text-sm"
                                            placeholder={audioMode === 'ai_plus_recorded' ? '¡Hola, {Nombre}!, ¡un placer saludarte!' : 'Hola {name}, te recordamos tu cita en Kaizen Solution para el día...'}
                                        ></textarea>
                                    </div>

                                    {/* Pre-recorded audio upload */}
                                    {audioMode === 'ai_plus_recorded' && (newCampaign.type === 'sequence' || newCampaign.type === 'audio') && (
                                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                                            <p className="text-xs font-medium text-purple-700">🎙️ Audio Pregrabado (mensaje principal — mismo para todos)</p>
                                            <label className={`flex flex-col items-center justify-center w-full py-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingAudio ? 'border-purple-300 bg-purple-100/50' : (newCampaign.audioConfig as any).preRecordedAudioUrl ? 'border-green-300 bg-green-50' : 'border-purple-200 hover:border-purple-400 hover:bg-purple-100/30'}`}>
                                                {uploadingAudio ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                                                        <span className="text-xs text-purple-600">Subiendo audio...</span>
                                                    </>
                                                ) : (newCampaign.audioConfig as any).preRecordedAudioUrl ? (
                                                    <>
                                                        <span className="text-green-600 text-sm font-medium">✅ Audio subido correctamente</span>
                                                        <span className="text-xs text-gray-500 mt-1">Clic para reemplazar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={20} className="text-purple-400 mb-1" />
                                                        <span className="text-xs text-purple-600 font-medium">Clic para subir tu audio grabado</span>
                                                        <span className="text-[10px] text-gray-400 mt-0.5">Solo MP3 · Máx 10 MB</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="audio/mpeg,.mp3"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) {
                                                            if (!f.name.toLowerCase().endsWith('.mp3') && f.type !== 'audio/mpeg') {
                                                                alert('Solo se aceptan archivos MP3 en modo IA + Grabado (necesario para concatenar con el audio IA)');
                                                                return;
                                                            }
                                                            handleAudioFileUpload(f);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {newCampaign.type === 'sequence' && (
                                <div className="space-y-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                    <p className="text-xs font-medium text-indigo-700">Imagen de seguimiento (opcional — se envía 3 segundos después del audio)</p>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">URL de imagen</label>
                                        <input
                                            type="url"
                                            value={newCampaign.audioConfig.imageUrl}
                                            onChange={(e) => setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, imageUrl: e.target.value } }))}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                            placeholder="https://ejemplo.com/imagen.jpg (opcional)"
                                        />
                                    </div>
                                    {newCampaign.audioConfig.imageUrl && (
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Texto de la imagen <span className="text-gray-400">(opcional)</span></label>
                                            <input
                                                type="text"
                                                value={newCampaign.audioConfig.imageCaption}
                                                onChange={(e) => setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, imageCaption: e.target.value } }))}
                                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                                placeholder="Texto que acompaña la imagen..."
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {newCampaign.type === 'image' && (
                                <div className="space-y-4">
                                    {/* Toggle URL / Archivo */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen *</label>
                                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 mb-2 w-fit">
                                            <button type="button" onClick={() => setImageInputMode("url")}
                                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${imageInputMode === 'url' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                                URL
                                            </button>
                                            <button type="button" onClick={() => setImageInputMode("file")}
                                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${imageInputMode === 'file' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                                <Upload size={11} /> Subir archivo
                                            </button>
                                        </div>

                                        {imageInputMode === 'url' ? (
                                            <>
                                                <input
                                                    type="url"
                                                    required={imageInputMode === 'url'}
                                                    value={newCampaign.audioConfig.imageUrl}
                                                    onChange={(e) => setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, imageUrl: e.target.value } }))}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
                                                    placeholder="https://ejemplo.com/imagen.jpg"
                                                />
                                                <p className="text-[11px] text-gray-400 mt-1">URL pública accesible (HTTPS). Formatos: JPG, PNG.</p>
                                            </>
                                        ) : (
                                            <>
                                                <label className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingImage ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/40'}`}>
                                                    {uploadingImage ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                                                            <span className="text-xs text-blue-600">Subiendo imagen...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-xs text-gray-500">Clic para seleccionar o arrastrá la imagen</span>
                                                            <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP · Máx 5 MB</span>
                                                        </>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => { if (e.target.files?.[0]) handleImageFileUpload(e.target.files[0]) }}
                                                    />
                                                </label>
                                                {newCampaign.audioConfig.imageUrl && (
                                                    <p className="text-[11px] text-green-600 mt-1">Imagen subida correctamente</p>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {newCampaign.audioConfig.imageUrl && (
                                        <div className="flex justify-center">
                                            <img
                                                src={newCampaign.audioConfig.imageUrl}
                                                alt="Preview"
                                                className="max-h-40 rounded-lg border border-gray-200 object-contain"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Texto acompañante <span className="text-gray-400 font-normal">(Opcional — podés usar <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>)</span></label>
                                        <textarea
                                            value={newCampaign.audioConfig.caption}
                                            onChange={(e) => setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, caption: e.target.value } }))}
                                            rows={3}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none text-sm"
                                            placeholder="Hola {name}, mirá esta promoción especial..."
                                        ></textarea>
                                    </div>
                                </div>
                            )}

                            {/* Variables mapping para Type = Template */}
                            {newCampaign.type === 'template' && selectedTemplate && (() => {
                                const detectedVars: string[] = []
                                try {
                                    const comps = selectedTemplate.components ? (typeof selectedTemplate.components === 'string' ? JSON.parse(selectedTemplate.components) : selectedTemplate.components) : []
                                    for (const c of comps) {
                                        const namedParams = c.example?.header_text_named_params || c.example?.body_text_named_params || []
                                        for (const p of namedParams) {
                                            if (p.param_name && !detectedVars.includes(p.param_name)) detectedVars.push(p.param_name)
                                        }
                                    }
                                } catch { }
                                if (detectedVars.length === 0) {
                                    try {
                                        const dbVars = JSON.parse(selectedTemplate.variables || "[]")
                                        for (const v of dbVars) { if (!detectedVars.includes(v)) detectedVars.push(v) }
                                    } catch { }
                                }

                                return (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        <h4 className="text-sm font-medium text-green-700">Personalización de Variables de Plantilla</h4>
                                        <p className="text-xs text-gray-500">Mapea las variables de la plantilla a los datos de tus contactos.</p>

                                        {detectedVars.length === 0 ? (
                                            <div className="text-sm text-gray-400 italic">Esta plantilla no requiere variables personalizadas.</div>
                                        ) : (
                                            <div className="space-y-3">
                                                {detectedVars.map((v: string) => (
                                                    <div key={v} className="flex items-center gap-4">
                                                        <span className="w-auto min-w-[4rem] text-center bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs font-mono">{`{{${v}}}`}</span>
                                                        <span className="text-gray-500 text-sm">reemplazar con</span>
                                                        <select
                                                            required
                                                            value={newCampaign.mapping[v] || ""}
                                                            onChange={(e) => setNewCampaign({ ...newCampaign, mapping: { ...newCampaign.mapping, [v]: e.target.value } })}
                                                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                                                        >
                                                            <option value="">Columna del CSV/Contacto</option>
                                                            {mockColumns.map(mc => <option key={mc} value={mc}>{mc}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                                            <p className="text-xs font-mono text-gray-500 whitespace-pre-wrap">{selectedTemplate.bodyText}</p>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Variables mapping para Type = Audio / Image */}
                            {(newCampaign.type === 'audio' || newCampaign.type === 'image' || newCampaign.type === 'sequence') && (() => {
                                const textToScan = newCampaign.type === 'audio' || newCampaign.type === 'sequence'
                                    ? newCampaign.audioConfig.prompt
                                    : (newCampaign.audioConfig.caption || "")
                                const matches = textToScan.match(/\{(\w+)\}/g)
                                const vars: string[] = matches ? Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, "")))) : []
                                if (vars.length === 0) return null

                                return (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        <h4 className={`text-sm font-medium ${newCampaign.type === 'audio' ? 'text-purple-700' : 'text-blue-700'}`}>
                                            Personalización de Variables
                                        </h4>
                                        <p className="text-xs text-gray-500">Variables detectadas en tu texto. Mapealas a datos del contacto.</p>
                                        <div className="space-y-3">
                                            {vars.map((v: string) => (
                                                <div key={v} className="flex items-center gap-4">
                                                    <span className="w-auto min-w-[4rem] text-center bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs font-mono">{`{${v}}`}</span>
                                                    <span className="text-gray-500 text-sm">reemplazar con</span>
                                                    <select
                                                        required
                                                        value={newCampaign.mapping[v] || ""}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, mapping: { ...newCampaign.mapping, [v]: e.target.value } })}
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                                                    >
                                                        <option value="">Columna del CSV/Contacto</option>
                                                        {mockColumns.map(mc => <option key={mc} value={mc}>{mc}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}

                            {(() => {
                                const isWindow = newCampaign.audienceMode === 'active_window';
                                const selectedListObj = lists.find(l => l.id === newCampaign.listId);
                                const subsCount = isWindow ? (activeWindowContacts.length - excludedContactIds.size) : (selectedListObj?._count?.subscribers || 0);
                                if (subsCount === 0) return null;
                                const isFreeType = newCampaign.type === 'image' || newCampaign.type === 'audio';
                                const estMeta = (isFreeType && newCampaign.type !== 'sequence') ? 0 : subsCount * 0.0773;
                                const estEleven = (newCampaign.type === 'audio' || newCampaign.type === 'sequence') ? (audioMode === 'ai_plus_recorded' ? subsCount * 0.002 : subsCount * 0.015) : 0;
                                const estTotal = estMeta + estEleven;

                                return (
                                    <div className="col-span-2 flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-green-700">Inversión Estimada</p>
                                            <p className="text-xs text-green-600 mt-0.5">Calculado para impactar a {subsCount} contactos en base a tarifas promedio.</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-green-700">${estTotal.toFixed(2)} <span className="text-sm font-medium">USD</span></p>
                                            {newCampaign.type === 'audio' && <p className="text-[10px] text-green-600 font-medium tracking-wide">META: ${estMeta.toFixed(2)} + ELEVENLABS: ${estEleven.toFixed(2)}</p>}
                                        </div>
                                    </div>
                                )
                            })()}

                            <div className="col-span-2 flex gap-3 justify-end pt-4 border-t border-gray-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                                <button type="button" onClick={handleTestCampaign} disabled={(!newCampaign.listId && newCampaign.audienceMode !== 'active_window') || (newCampaign.type === 'template' && !newCampaign.templateId) || (newCampaign.type === 'image' && !newCampaign.audioConfig.imageUrl)} className="px-5 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 rounded-lg transition-colors">
                                    Enviar Prueba a Mi WA
                                </button>
                                <button type="submit" disabled={(!newCampaign.listId && newCampaign.audienceMode !== 'active_window') || (newCampaign.type === 'template' && !newCampaign.templateId) || (newCampaign.type === 'image' && !newCampaign.audioConfig.imageUrl) || (newCampaign.audienceMode === 'active_window' && (activeWindowContacts.length - excludedContactIds.size) === 0)} className="px-5 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition-colors">
                                    Guardar Borrador
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
