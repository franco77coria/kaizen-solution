'use client'

import React, { useState } from 'react'
import { Shield, Users, History, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react'

interface AdminClientProps {
    municipio: any
    usuarios: any[]
    auditoria: any[]
    avancesNoConciliados: any[]
    actividades: any[]
}

export default function AdminClient({
    municipio,
    usuarios,
    auditoria,
    avancesNoConciliados,
    actividades,
}: AdminClientProps) {
    const [tab, setTab] = useState<'usuarios' | 'auditoria' | 'conciliar'>('usuarios')
    const [searchUser, setSearchUser] = useState('')

    const usuariosFiltrados = usuarios.filter((u) =>
        u.nombre.toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.telefono && u.telefono.includes(searchUser)) ||
        (u.dependencia?.nombre.toLowerCase().includes(searchUser.toLowerCase()))
    )

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-800 pb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
                    <Shield className="w-7 h-7 text-amber-400" />
                    Panel de Administración & Auditoría
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Gestión de permisos de acceso, registro de ingresos y conciliación de avances
                </p>
            </div>

            {/* Pestañas de Admin */}
            <div className="flex space-x-2 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setTab('usuarios')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        tab === 'usuarios'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Usuarios y Permisos ({usuarios.length})
                </button>

                <button
                    onClick={() => setTab('auditoria')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        tab === 'auditoria'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <History className="w-4 h-4" />
                    Registro de Auditoría ({auditoria.length})
                </button>

                <button
                    onClick={() => setTab('conciliar')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        tab === 'conciliar'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <AlertCircle className="w-4 h-4" />
                    Avances Sin Conciliar ({avancesNoConciliados.length})
                </button>
            </div>

            {/* Pestaña 1: Usuarios */}
            {tab === 'usuarios' && (
                <div className="space-y-4">
                    <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        placeholder="Filtrar por nombre, teléfono o dependencia..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Teléfono</th>
                                    <th className="px-4 py-3">Dependencia</th>
                                    <th className="px-4 py-3">Rol</th>
                                    <th className="px-4 py-3">Último Ingreso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {usuariosFiltrados.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-100">{u.nombre}</td>
                                        <td className="px-4 py-3 text-slate-400">{u.telefono || u.telefonoRaw || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400">{u.dependencia?.nombre || 'General'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                                                u.rol === 'SUPERADMIN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                u.rol === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                'bg-slate-800 text-slate-300'
                                            }`}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO') : 'Nunca'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pestaña 2: Auditoría */}
            {tab === 'auditoria' && (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Acción</th>
                                <th className="px-4 py-3">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {auditoria.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {new Date(a.createdAt).toLocaleString('es-CO')}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-200">
                                        {a.usuarioText || a.usuario?.nombre || 'Anónimo'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-xs">
                                            {a.accion}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">{a.detalle || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pestaña 3: Conciliar avances */}
            {tab === 'conciliar' && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                        Los siguientes avances vinieron del formulario sin vincularse exactamente a una actividad de la estructura del plan de desarrollo.
                    </p>
                    <div className="space-y-3">
                        {avancesNoConciliados.map((av) => (
                            <div key={av.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                        Sin Conciliar
                                    </span>
                                    <span className="text-xs text-slate-400">{av.periodoTexto}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-100">
                                    {av.actividadTexto || 'Texto de actividad no especificado'}
                                </p>
                                {av.observaciones && (
                                    <p className="text-xs text-slate-400">Obs: {av.observaciones}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
