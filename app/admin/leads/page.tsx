'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChatLead {
    id: string
    name: string
    whatsapp: string
    conversationSummary: string
    status: string
    notes: string | null
    createdAt: string
    updatedAt: string
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<ChatLead[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')

    useEffect(() => {
        fetchLeads()
    }, [])

    const fetchLeads = async () => {
        try {
            const response = await fetch('/api/leads')
            const data = await response.json()
            setLeads(data.leads || [])
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateLeadStatus = async (id: string, status: string) => {
        try {
            await fetch('/api/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            })
            fetchLeads()
        } catch (error) {
            console.error('Error updating lead:', error)
        }
    }

    const filteredLeads = filter === 'all'
        ? leads
        : leads.filter(lead => lead.status === filter)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500'
            case 'contacted': return 'bg-yellow-500'
            case 'qualified': return 'bg-green-500'
            case 'closed': return 'bg-gray-500'
            default: return 'bg-gray-500'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new': return 'Nuevo'
            case 'contacted': return 'Contactado'
            case 'qualified': return 'Calificado'
            case 'closed': return 'Cerrado'
            default: return status
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-egyptian"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-egyptian">Leads del Chat</h1>
                    <p className="text-slate-600 mt-1">Contactos capturados por KaiBot</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-sm">
                        Total: {leads.length}
                    </Badge>
                    <Badge className="bg-blue-500 text-sm">
                        Nuevos: {leads.filter(l => l.status === 'new').length}
                    </Badge>
                </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {['all', 'new', 'contacted', 'qualified', 'closed'].map((status) => (
                    <Button
                        key={status}
                        onClick={() => setFilter(status)}
                        variant={filter === status ? 'primary' : 'outline'}
                        size="sm"
                        className={filter === status ? 'bg-egyptian' : ''}
                    >
                        {status === 'all' ? 'Todos' : getStatusLabel(status)}
                    </Button>
                ))}
            </div>

            {/* Leads Grid */}
            <div className="grid gap-4">
                {filteredLeads.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No hay leads {filter !== 'all' && `con estado "${getStatusLabel(filter)}"`}</p>
                    </div>
                ) : (
                    filteredLeads.map((lead, index) => (
                        <motion.div
                            key={lead.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-egyptian to-tiffany flex items-center justify-center">
                                            <User className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-slate-800">{lead.name}</h3>
                                            <div className="flex items-center space-x-2 text-sm text-slate-500">
                                                <Phone className="h-3 w-3" />
                                                <a
                                                    href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-egyptian hover:underline"
                                                >
                                                    {lead.whatsapp}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conversation Summary */}
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs font-semibold text-slate-600 mb-1">Resumen de conversación:</p>
                                        <p className="text-sm text-slate-700">{lead.conversationSummary}</p>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                                        <div className="flex items-center space-x-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{new Date(lead.createdAt).toLocaleDateString('es-AR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex flex-col items-end space-y-3">
                                    <Badge className={`${getStatusColor(lead.status)} text-white`}>
                                        {getStatusLabel(lead.status)}
                                    </Badge>

                                    <div className="flex flex-col space-y-1">
                                        {lead.status === 'new' && (
                                            <Button
                                                onClick={() => updateLeadStatus(lead.id, 'contacted')}
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Marcar Contactado
                                            </Button>
                                        )}
                                        {lead.status === 'contacted' && (
                                            <Button
                                                onClick={() => updateLeadStatus(lead.id, 'qualified')}
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Calificar
                                            </Button>
                                        )}
                                        {(lead.status === 'new' || lead.status === 'contacted') && (
                                            <Button
                                                onClick={() => updateLeadStatus(lead.id, 'closed')}
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-slate-500"
                                            >
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Cerrar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
