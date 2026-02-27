"use client"

import { useState, useEffect } from "react"
import { SendHorizonal, Plus, PlayCircle, PauseCircle, Trash2, Clock } from "lucide-react"

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
        audioConfig: { voiceId: "", prompt: "" },
        scheduledFor: ""
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
            if (newCampaign.type === "template" && !newCampaign.templateId) {
                return alert("Seleccioná una plantilla")
            }
            if (newCampaign.type === "audio" && (!newCampaign.audioConfig.voiceId || !newCampaign.audioConfig.prompt)) {
                return alert("Falta configurar la voz o el texto del audio")
            }

            const payload = { ...newCampaign }
            if (payload.type === "template") {
                payload.audioConfig = { voiceId: "", prompt: "" };
            } else {
                payload.templateId = "";
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
                    audioConfig: { voiceId: voices[0]?.voice_id || "", prompt: "" },
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
                        try { stats = JSON.parse(camp.stats || "{}") } catch {}
                        const progress = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0

                        return (
                            <div key={camp.id} className="bg-white border border-gray-200 p-5 rounded-xl flex items-center justify-between hover:border-green-300 transition-colors group shadow-sm">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{camp.name}</h3>
                                        {getStatusBadge(camp.status)}
                                        {camp.type === 'audio' && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md border border-purple-200">🎙️ Audio IA Libre</span>}
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
                                    {camp.status === 'draft' || camp.status === 'paused' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'start')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Iniciar Envío">
                                            <PlayCircle size={24} />
                                        </button>
                                    ) : camp.status === 'running' ? (
                                        <button onClick={() => handleStatusChange(camp.id, 'pause')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Pausar Envío">
                                            <PauseCircle size={24} />
                                        </button>
                                    ) : null}
                                    <button onClick={() => handleStatusChange(camp.id, 'cancel')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar / Eliminar">
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
                                            Plantilla Aprobada (Meta)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCampaign({ ...newCampaign, type: "audio", mapping: {} })}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 text-sm font-medium rounded-lg transition-colors ${newCampaign.type === 'audio' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Audio Dinámico IA (Libre)
                                        </button>
                                    </div>
                                    {newCampaign.type === 'audio' && (
                                        <p className="text-xs text-yellow-700 mt-2 text-center bg-yellow-50 py-1.5 rounded-lg border border-yellow-200">
                                            Requiere que el cliente haya respondido en las últimas 24hs para que le llegue.
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Audiencia (Lista)</label>
                                    <select required value={newCampaign.listId} onChange={(e) => setNewCampaign({ ...newCampaign, listId: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                        <option value="">Seleccione una lista...</option>
                                        {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l._count?.subscribers || 0} contactos)</option>)}
                                    </select>
                                </div>

                                {newCampaign.type === 'template' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla de Meta</label>
                                        <select required={newCampaign.type === 'template'} value={newCampaign.templateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                                            <option value="">Seleccione aprobada...</option>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Voz (ElevenLabs)</label>
                                        <select required={newCampaign.type === 'audio'} value={newCampaign.audioConfig.voiceId} onChange={(e) => setNewCampaign({ ...newCampaign, audioConfig: { ...newCampaign.audioConfig, voiceId: e.target.value } })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                                            {voices.length === 0 && <option value="">Sin configurar</option>}
                                            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                                        </select>
                                    </div>
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

                            {newCampaign.type === 'audio' && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Texto a Narrar Automáticamente (Podés usar variables como <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>)</label>
                                    <textarea
                                        required={newCampaign.type === 'audio'}
                                        value={newCampaign.audioConfig.prompt}
                                        onChange={(e) => {
                                            const prompt = e.target.value
                                            setNewCampaign(prev => ({ ...prev, audioConfig: { ...prev.audioConfig, prompt } }))
                                        }}
                                        rows={4}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none resize-none font-mono text-sm"
                                        placeholder="Hola {name}, te recordamos tu cita en Kaizen Solution para el día..."
                                    ></textarea>
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
                                } catch {}
                                if (detectedVars.length === 0) {
                                    try {
                                        const dbVars = JSON.parse(selectedTemplate.variables || "[]")
                                        for (const v of dbVars) { if (!detectedVars.includes(v)) detectedVars.push(v) }
                                    } catch {}
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

                            {/* Variables mapping para Type = Audio */}
                            {newCampaign.type === 'audio' && (() => {
                                const matches = newCampaign.audioConfig.prompt.match(/\{(\w+)\}/g)
                                const vars = matches ? Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, "")))) : []
                                if (vars.length === 0) return null

                                return (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        <h4 className="text-sm font-medium text-purple-700">Personalización de Variables de Audio IA</h4>
                                        <p className="text-xs text-gray-500">Hemos detectado estas variables en tu texto. Mapealas a Excel.</p>
                                        <div className="space-y-3">
                                            {vars.map((v: string) => (
                                                <div key={v} className="flex items-center gap-4">
                                                    <span className="w-auto min-w-[4rem] text-center bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs font-mono">{`{${v}}`}</span>
                                                    <span className="text-gray-500 text-sm">reemplazar con</span>
                                                    <select
                                                        required
                                                        value={newCampaign.mapping[v] || ""}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, mapping: { ...newCampaign.mapping, [v]: e.target.value } })}
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-purple-500/20"
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
                                const estMeta = subsCount * 0.0773;
                                const estEleven = newCampaign.type === 'audio' ? subsCount * 0.015 : 0;
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
                                <button type="button" onClick={handleTestCampaign} disabled={!newCampaign.listId || (newCampaign.type === 'template' && !newCampaign.templateId)} className="px-5 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 rounded-lg transition-colors">
                                    Enviar Prueba a Mi WA
                                </button>
                                <button type="submit" disabled={!newCampaign.listId || (newCampaign.type === 'template' && !newCampaign.templateId)} className="px-5 py-2 text-sm bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg transition-colors">
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
