'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Contact {
    id: string
    phone: string
    name: string | null
    lastMessageAt: string | null
    totalMessages: number
    notes: string | null
    hasWindow: boolean
    windowEnd: string | null
}

export default function ContactosPage() {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editingNotes, setEditingNotes] = useState<string | null>(null)
    const [noteText, setNoteText] = useState('')
    const [savingNote, setSavingNote] = useState(false)

    useEffect(() => {
        loadContacts()
    }, [])

    const loadContacts = async () => {
        try {
            const res = await fetch('/api/whatsapp/contacts')
            const data = await res.json()
            setContacts(data)
        } catch { } finally {
            setLoading(false)
        }
    }

    const saveNote = async (phone: string) => {
        setSavingNote(true)
        try {
            await fetch('/api/whatsapp/contacts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, notes: noteText }),
            })
            setContacts(contacts.map(c => c.phone === phone ? { ...c, notes: noteText } : c))
            setEditingNotes(null)
        } catch { } finally {
            setSavingNote(false)
        }
    }

    const filtered = contacts.filter((c) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            c.phone.includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            c.notes?.toLowerCase().includes(q)
        )
    })

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
                    <p className="text-sm text-gray-400 mt-1">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''} registrado{contacts.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => { setLoading(true); loadContacts() }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    ↻ Actualizar
                </button>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Buscar por nombre, teléfono o notas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            />

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-sm text-gray-400">
                            {search ? 'Sin resultados' : 'No hay contactos aún'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-gray-200">
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensajes</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ventana 24h</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último mensaje</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                        {getInitials(c.name || c.phone)}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{c.name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-600 font-mono">+{c.phone}</td>
                                            <td className="px-6 py-3 text-sm text-gray-600">{c.totalMessages}</td>
                                            <td className="px-6 py-3">
                                                {c.hasWindow ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        {getRemainingTime(c.windowEnd)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Cerrada</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{formatDate(c.lastMessageAt)}</td>
                                            <td className="px-6 py-3">
                                                {editingNotes === c.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={noteText}
                                                            onChange={(e) => setNoteText(e.target.value)}
                                                            className="px-2 py-1 border border-gray-300 rounded text-xs w-40 focus:outline-none focus:ring-1 focus:ring-green-400"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && saveNote(c.phone)}
                                                        />
                                                        <button
                                                            onClick={() => saveNote(c.phone)}
                                                            disabled={savingNote}
                                                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingNotes(null)}
                                                            className="text-xs text-gray-400 hover:text-gray-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEditingNotes(c.phone); setNoteText(c.notes || '') }}
                                                        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer max-w-[200px] truncate block"
                                                    >
                                                        {c.notes || '+ Agregar nota'}
                                                    </button>
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
    )
}

function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.split(' ')
    return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase()
}

function getRemainingTime(windowEnd: string | null): string {
    if (!windowEnd) return ''
    const end = new Date(windowEnd)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return 'Expirado'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${mins}m`
}

function formatDate(d: string | null): string {
    if (!d) return '—'
    const dt = new Date(d)
    return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
