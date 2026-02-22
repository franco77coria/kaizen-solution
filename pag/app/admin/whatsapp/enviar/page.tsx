"use client"

import { useState, useEffect } from "react"
import { SendHorizonal, Plus, PlayCircle, PauseCircle, Trash2 } from "lucide-react"

export default function CampanasPage() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [lists, setLists] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [voices, setVoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newCampaign, setNewCampaign] = useState({
        name: "",
        type: "template" as "template" | "audio",
        listId: "",
        templateId: "",
        mapping: {} as Record<string, string>,
        audioConfig: { voiceId: "", prompt: "" }
    })

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
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
                // Set default voice id
                setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, voiceId: voiceData.voices[0].voice_id } }))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
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
            // Validaciones
            if (newCampaign.type === "template" && !newCampaign.templateId) {
                return alert("Seleccioná una plantilla")
            }
            if (newCampaign.type === "audio" && (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt)) {
                return alert("Falta configurar la voz o el texto del audio")
            }

            const payload = { ...newCampaign }
            if (payload.type === "template") {
                payload.audioConfig = { voiceId: "", prompt: "" }; // Clear
            } else {
                payload.templateId = ""; // Clear
            }

            const res = await fetch("/api/whatsapp/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                setIsModalOpen(false)
                setNewCampaign({
                    name: "", type: "template", listId: "", templateId: "", mapping: {},
                    audioConfig: { voiceId: voices[0]?.voice_id || "", prompt: "" }
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
            // Validaciones
            if (newCampaign.type === "template" && !newCampaign.templateId) {
                return alert("Seleccioná una plantilla")
            }
            if (newCampaign.type === "audio" && (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt)) {
                return alert("Falta configurar la voz o el texto del audio")
            }

            const payload = { ...newCampaign, testPhone }
            if (payload.type === "template") {
                payload.audioConfig = { voiceId: "", prompt: "" };
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'running': return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">En Progreso</span>
            case 'completed': return <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Completada</span>
            case 'paused': return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">Pausada</span>
            case 'failed': return <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">Fallida</span>
            default: return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 text-xs rounded-full border border-gray-500/20">Borrador</span>
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-[#1A1D24] border border-[#2A2D35] p-6 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <SendHorizonal className="text-teal-400" />
                        Campañas Masivas
                    </h1>
                    <p className="text-gray-400 mt-1">Crea secuencias de envío programadas usando tus listas y plantillas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-lg transition-all font-medium shadow-lg shadow-teal-500/20"
                >
                    <Plus size={18} />
                    Nueva Campaña
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-20 bg-[#1A1D24] border border-[#2A2D35] rounded-xl flex flex-col items-center">
                    <SendHorizonal className="h-16 w-16 text-gray-600 mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Empieza a enviar mensajes</h3>
                    <p className="text-gray-400 max-w-sm">No tienes campañas creadas. Asegúrate de tener Listas y Plantillas listas antes de empezar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {campaigns.map((camp) => {
                        const stats = JSON.parse(camp.stats || "{}")
                        const progress = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0

                        return (
                            <div key={camp.id} className="bg-[#1A1D24] border border-[#2A2D35] p-5 rounded-xl flex items-center justify-between hover:border-teal-500/50 transition-colors group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-white">{camp.name}</h3>
                                        {getStatusBadge(camp.status)}
                                        {camp.type === 'audio' && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/30">🎙️ Audio IA Libre</span>}
                                    </div>
                                    <div className="text-sm text-gray-500 flex gap-4">
                                        <span>Lista: <strong className="text-gray-300">{camp.list?.name || 'Desconocida'}</strong></span>
                                        <span>Template: <strong className="text-gray-300">{camp.type === 'audio' ? 'Ninguno (Audio Libre)' : (camp.template?.name || 'Desconocido')}</strong></span>
                                    </div>
                                </div>

                                <div className="w-48 px-6 border-l border-[#2A2D35]">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Progreso</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-[#111318] rounded-full h-2">
                                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                                        <span className="text-green-400" title="Entregados">{stats.delivered || 0} D</span>
                                        <span className="text-blue-400" title="Leídos">{stats.read || 0} R</span>
                                        <span className="text-red-400" title="Fallidos">{stats.failed || 0} F</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pl-6">
                                    {camp.status === 'draft' || camp.status === 'paused' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'start')} className="p-2 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors" title="Iniciar Envío">
                                            <PlayCircle size={24} />
                                        </button>
                                    ) : camp.status === 'running' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'pause')} className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Pausar Envío">
                                            <PauseCircle size={24} />
                                        </button>
                                    ) : null}
                                    <button onClick={() => handleStatusChange(camp.id, 'cancel')} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Cancelar / Eliminar">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1A1D24] border border-[#2A2D35] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">Configurar Nueva Campaña</h2>

                        <form onSubmit={handleCreateCampaign} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Envío</label>
                                    <div className="flex bg-[#111318] rounded-xl border border-[#2A2D35] p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "template", mapping: {} })}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'template' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]'}`}
                                        >
                                            📨 Plantilla Aprobada (Meta)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "audio", mapping: {} })}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'audio' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-[#1A1D24]'}`}
                                        >
                                            🎙️ Audio Dinámico IA (Libre)
                                        </button>
                                    </div>
                                    {newCampaign.type === 'audio' && (
                                        <p className="text-xs text-yellow-500/80 mt-2 text-center bg-yellow-500/10 py-1.5 rounded-lg border border-yellow-500/20">
                                            ⚠️ Requiere que el cliente haya respondido en las últimas 24hs para que le llegue.
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Campaña</label>
                                    <input
                                        type="text" required
                                        value={newCampaign.name}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                        className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white focus:border-teal-500 outline-none"
                                        placeholder="Ej. Promoción Verano 2026"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Audiencia (Lista)</label>
                                    <select required value={newCampaign.listId} onChange={(e) => setNewCampaign({ ...newCampaign, listId: e.target.value })} className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white outline-none">
                                        <option value="">Seleccione una lista...</option>
                                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l._count?.subscribers || 0} contactos)</option>)}
                                    </select>
                                </div>

                                {newCampaign.type === 'template' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Plantilla de Meta</label>
                                        <select required={newCampaign.type === 'template'} value={newCampaign.templateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white outline-none">
                                            <option value="">Seleccione aprobada...</option>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Voz (ElevenLabs)</label>
                                        <select required={newCampaign.type === 'audio'} value={newCampaign.audioConfig.voiceId} onChange={(e) => setNewCampaign({ ...newCampaign, audioConfig: { ...newCampaign.audioConfig, voiceId: e.target.value } })} className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-2 text-white outline-none">
                                            {voices.length === 0 && <option value="">Sin configurar</option>}
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {newCampaign.type === 'audio' && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Texto a Narrar Automáticamente (Podés usar variables como <code className="bg-[#2A2D35] px-1 rounded">{'{name}'}</code>)</label>
                                    <textarea
                                        required={newCampaign.type === 'audio'}
                                        value={newCampaign.audioConfig.prompt}
                                        onChange={(e) => {
                                            const prompt = e.target.value
                                            setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, prompt } }))
                                        }}
                                        rows={4}
                                        className="w-full bg-[#111318] border border-[#2A2D35] rounded-lg p-4 text-white focus:border-purple-500 outline-none resize-none font-mono text-sm"
                                        placeholder="Hola {name}, te recordamos tu cita en Kaizen Solution para el día..."
                                    ></textarea>
                                </div>
                            )}

                            {/* Variables mapping para Type = Template */}
                            {newCampaign.type === 'template' && selectedTemplate && (
                                <div className="p-4 bg-[#111318] rounded-xl border border-[#2A2D35] space-y-4">
                                    <h4 className="text-sm font-medium text-teal-400">Personalización de Variables de Plantilla</h4>
                                    <p className="text-xs text-gray-500">Mapea las variables de la plantilla <code>{"{{1}}, {{2}}"}</code> a columnas de tu lista.</p>

                                    {JSON.parse(selectedTemplate.variables || "[]").length === 0 ? (
                                        <div className="text-sm text-gray-400 italic">Esta plantilla no requiere variables personalizadas.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {JSON.parse(selectedTemplate.variables || "[]").map((v: string) => (
                                                <div key={v} className="flex items-center gap-4">
                                                    <span className="w-16 text-center bg-[#2A2D35] px-2 py-1 rounded text-gray-300 text-xs font-mono">{`{{${v}}}`}</span>
                                                    <span className="text-gray-500 text-sm">reemplazar con</span>
                                                    <select
                                                        required
                                                        value={newCampaign.mapping[v] || ""}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, mapping: { ...newCampaign.mapping, [v]: e.target.value } })}
                                                        className="flex-1 bg-[#1A1D24] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                                                    >
                                                        <option value="">Columna del CSV/Contacto</option>
                                                        {mockColumns.map(mc => <option key={mc} value={mc}>{mc}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-4 p-3 bg-black/40 border border-teal-500/20 rounded-lg">
                                        <p className="text-xs font-mono text-gray-400 whitespace-pre-wrap">{selectedTemplate.bodyText}</p>
                                    </div>
                                </div>
                            )}

                            {/* Variables mapping para Type = Audio */}
                            {newCampaign.type === 'audio' && (() => {
                                const matches = newCampaign.audioConfig.prompt.match(/\{(\w+)\}/g)
                                const vars = matches ? Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, "")))) : []
                                if (vars.length === 0) return null

                                return (
                                    <div className="p-4 bg-[#111318] rounded-xl border border-[#2A2D35] space-y-4">
                                        <h4 className="text-sm font-medium text-purple-400">Personalización de Variables de Audio IA</h4>
                                        <p className="text-xs text-gray-500">Hemos detectado estas variables en tu texto. Mapealas a Excel.</p>
                                        <div className="space-y-3">
                                            {vars.map((v: string) => (
                                                <div key={v} className="flex items-center gap-4">
                                                    <span className="w-auto min-w-[4rem] text-center bg-[#2A2D35] px-2 py-1 rounded text-gray-300 text-xs font-mono">{`{${v}}`}</span>
                                                    <span className="text-gray-500 text-sm">reemplazar con</span>
                                                    <select
                                                        required
                                                        value={newCampaign.mapping[v] || ""}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, mapping: { ...newCampaign.mapping, [v]: e.target.value } })}
                                                        className="flex-1 bg-[#1A1D24] border border-[#2A2D35] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-purple-500"
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
                                const selectedListObj = lists.find(l => l.id === newCampaign.listId);
                                const subsCount = selectedListObj?._count?.subscribers || 0;
                                if (subsCount === 0) return null;
                                const estMeta = subsCount * 0.06;
                                const estEleven = newCampaign.type === 'audio' ? subsCount * 0.015 : 0;
                                const estTotal = estMeta + estEleven;

                                return (
                                    <div className="col-span-2 flex items-center justify-between p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-teal-400">💡 Inversión Estimada</p>
                                            <p className="text-xs text-teal-500/80 mt-0.5">Calculado para impactar a {subsCount} contactos en base a tarifas promedio.</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-teal-400">${estTotal.toFixed(2)} <span className="text-sm font-medium">USD</span></p>
                                            {newCampaign.type === 'audio' && <p className="text-[10px] text-teal-500/70 font-medium tracking-wide">META: ${estMeta.toFixed(2)} + ELEVENLABS: ${estEleven.toFixed(2)}</p>}
                                        </div>
                                    </div>
                                )
                            })()}

                            <div className="col-span-2 flex gap-3 justify-end pt-4 border-t border-[#2A2D35]">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
                                <button type="button" onClick={handleTestCampaign} disabled={!newCampaign.listId || (newCampaign.type === 'template' && !newCampaign.templateId)} className="px-5 py-2 text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white disabled:opacity-50 rounded-lg transition-colors">
                                    Enviar Prueba a Mi WA
                                </button>
                                <button type="submit" disabled={!newCampaign.listId || (newCampaign.type === 'template' && !newCampaign.templateId)} className="px-5 py-2 text-sm bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg transition-colors">
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
