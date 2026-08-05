'use client'

import React, { useState } from 'react'
import { Shield, Users, History, AlertCircle } from 'lucide-react'

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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Administración & Auditoría</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Gestión de permisos de acceso, registro de ingresos y conciliación de avances
                </p>
            </div>

            {/* Pestañas de Admin */}
            <div className="flex space-x-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setTab('usuarios')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                        tab === 'usuarios'
                            ? 'bg-[var(--pol-primary)] text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    Usuarios ({usuarios.length})
                </button>

                <button
                    onClick={() => setTab('auditoria')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                        tab === 'auditoria'
                            ? 'bg-[var(--pol-primary)] text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <History className="w-3.5 h-3.5" />
                    Auditoría ({auditoria.length})
                </button>

                <button
                    onClick={() => setTab('conciliar')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                        tab === 'conciliar'
                            ? 'bg-[var(--pol-primary)] text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Sin conciliar ({avancesNoConciliados.length})
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
                        className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-sm"
                    />

                    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Teléfono</th>
                                    <th className="px-4 py-3">Dependencia</th>
                                    <th className="px-4 py-3">Rol</th>
                                    <th className="px-4 py-3">Último ingreso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usuariosFiltrados.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-900">{u.nombre}</td>
                                        <td className="px-4 py-3 text-slate-500">{u.telefono || u.telefonoRaw || '-'}</td>
                                        <td className="px-4 py-3 text-slate-500">{u.dependencia?.nombre || 'General'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                u.rol === 'SUPERADMIN' ? 'bg-amber-100 text-amber-800' :
                                                u.rol === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">
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
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Acción</th>
                                <th className="px-4 py-3">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {auditoria.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-400">
                                        {new Date(a.createdAt).toLocaleString('es-CO')}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-900">
                                        {a.usuarioText || a.usuario?.nombre || 'Anónimo'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                            {a.accion}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{a.detalle || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pestaña 3: Sin conciliar */}
            {tab === 'conciliar' && (
                <div className="space-y-3">
                    {avancesNoConciliados.map((av) => (
                        <div key={av.id} className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Sin Conciliar
                                </span>
                                <span className="text-xs text-slate-400">{av.periodoTexto}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900">
                                {av.actividadTexto || 'Texto de actividad no especificado'}
                            </p>
                            {av.observaciones && (
                                <p className="text-xs text-slate-500">Obs: {av.observaciones}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
