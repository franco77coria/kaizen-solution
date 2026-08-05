'use client'

import React, { useState, useMemo } from 'react'
import { Shield, Users, History, AlertCircle } from 'lucide-react'
import TablePagination from './TablePagination'

interface AdminClientProps {
    municipio: any
    usuarios: any[]
    auditoria: any[]
    avancesNoConciliados: any[]
    actividades: any[]
}

const PAGE_SIZE = 10

export default function AdminClient({
    municipio,
    usuarios,
    auditoria,
    avancesNoConciliados,
    actividades,
}: AdminClientProps) {
    const [tab, setTab] = useState<'usuarios' | 'auditoria' | 'conciliar'>('usuarios')
    const [searchUser, setSearchUser] = useState('')

    // Paginación por pestaña
    const [pageUsuarios, setPageUsuarios] = useState(1)
    const [pageAuditoria, setPageAuditoria] = useState(1)
    const [pageConciliar, setPageConciliar] = useState(1)

    // Filtro y Paginación de Usuarios
    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter((u) =>
            u.nombre.toLowerCase().includes(searchUser.toLowerCase()) ||
            (u.telefono && u.telefono.includes(searchUser)) ||
            (u.dependencia?.nombre?.toLowerCase().includes(searchUser.toLowerCase()))
        )
    }, [usuarios, searchUser])

    const totalPagesUsuarios = Math.ceil(usuariosFiltrados.length / PAGE_SIZE) || 1
    const usuariosPaginados = useMemo(() => {
        const start = (pageUsuarios - 1) * PAGE_SIZE
        return usuariosFiltrados.slice(start, start + PAGE_SIZE)
    }, [usuariosFiltrados, pageUsuarios])

    // Paginación de Auditoría
    const totalPagesAuditoria = Math.ceil(auditoria.length / PAGE_SIZE) || 1
    const auditoriaPaginada = useMemo(() => {
        const start = (pageAuditoria - 1) * PAGE_SIZE
        return auditoria.slice(start, start + PAGE_SIZE)
    }, [auditoria, pageAuditoria])

    // Paginación de Sin Conciliar
    const totalPagesConciliar = Math.ceil(avancesNoConciliados.length / PAGE_SIZE) || 1
    const conciliarPaginados = useMemo(() => {
        const start = (pageConciliar - 1) * PAGE_SIZE
        return avancesNoConciliados.slice(start, start + PAGE_SIZE)
    }, [avancesNoConciliados, pageConciliar])

    const handleSearchUser = (val: string) => {
        setSearchUser(val)
        setPageUsuarios(1)
    }

    return (
        <div className="space-y-6 w-full">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Administración & Auditoría</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                    Gestión de permisos de acceso, registro de ingresos y conciliación de avances • {municipio.nombre}
                </p>
            </div>

            {/* Pestañas de Admin */}
            <div className="flex space-x-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
                <button
                    onClick={() => setTab('usuarios')}
                    className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        tab === 'usuarios'
                            ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>Usuarios ({usuarios.length})</span>
                </button>

                <button
                    onClick={() => setTab('auditoria')}
                    className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        tab === 'auditoria'
                            ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <History className="w-3.5 h-3.5" />
                    <span>Auditoría ({auditoria.length})</span>
                </button>

                <button
                    onClick={() => setTab('conciliar')}
                    className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        tab === 'conciliar'
                            ? 'bg-[var(--pol-primary)] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Sin conciliar ({avancesNoConciliados.length})</span>
                </button>
            </div>

            {/* Pestaña 1: Usuarios */}
            {tab === 'usuarios' && (
                <div className="space-y-4 w-full">
                    <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => handleSearchUser(e.target.value)}
                        placeholder="Filtrar por nombre, teléfono o dependencia..."
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#f8fafc] sm:bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)] shadow-xs"
                    />

                    <div className="rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5">Nombre</th>
                                        <th className="px-5 py-3.5">Teléfono</th>
                                        <th className="px-5 py-3.5">Dependencia</th>
                                        <th className="px-5 py-3.5">Rol</th>
                                        <th className="px-5 py-3.5">Último ingreso</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {usuariosPaginados.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                                                No se encontraron usuarios
                                            </td>
                                        </tr>
                                    ) : (
                                        usuariosPaginados.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-3.5 font-bold text-slate-900">{u.nombre}</td>
                                                <td className="px-5 py-3.5 text-slate-500">{u.telefono || u.telefonoRaw || '-'}</td>
                                                <td className="px-5 py-3.5 text-slate-500">{u.dependencia?.nombre || 'General'}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        u.rol === 'SUPERADMIN' ? 'bg-amber-100 text-amber-800' :
                                                        u.rol === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {u.rol}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-400">
                                                    {u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString('es-CO') : 'Nunca'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación 10 en 10 */}
                        <TablePagination
                            currentPage={pageUsuarios}
                            totalPages={totalPagesUsuarios}
                            totalItems={usuariosFiltrados.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPageUsuarios}
                            itemName="usuarios"
                        />
                    </div>
                </div>
            )}

            {/* Pestaña 2: Auditoría */}
            {tab === 'auditoria' && (
                <div className="rounded-[24px] bg-[#f8fafc] sm:bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5">Fecha</th>
                                    <th className="px-5 py-3.5">Usuario</th>
                                    <th className="px-5 py-3.5">Acción</th>
                                    <th className="px-5 py-3.5">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {auditoriaPaginada.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-medium">
                                            No hay registros de auditoría
                                        </td>
                                    </tr>
                                ) : (
                                    auditoriaPaginada.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-3.5 text-slate-400">
                                                {new Date(a.createdAt).toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-slate-900">
                                                {a.usuarioText || a.usuario?.nombre || 'Anónimo'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                                                    {a.accion}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">{a.detalle || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación 10 en 10 */}
                    <TablePagination
                        currentPage={pageAuditoria}
                        totalPages={totalPagesAuditoria}
                        totalItems={auditoria.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPageAuditoria}
                        itemName="registros de auditoría"
                    />
                </div>
            )}

            {/* Pestaña 3: Sin conciliar */}
            {tab === 'conciliar' && (
                <div className="space-y-3 w-full">
                    {conciliarPaginados.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-[24px] border border-slate-200 text-xs text-slate-400 font-medium">
                            No hay avances pendientes de conciliación.
                        </div>
                    ) : (
                        conciliarPaginados.map((av) => (
                            <div key={av.id} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                        Sin Conciliar
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">{av.periodoTexto}</span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-slate-900">
                                    {av.actividadTexto || 'Texto de actividad no especificado'}
                                </p>
                                {av.observaciones && (
                                    <p className="text-xs text-slate-500">Obs: {av.observaciones}</p>
                                )}
                            </div>
                        ))
                    )}

                    {/* Paginación 10 en 10 */}
                    {avancesNoConciliados.length > 0 && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-white">
                            <TablePagination
                                currentPage={pageConciliar}
                                totalPages={totalPagesConciliar}
                                totalItems={avancesNoConciliados.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setPageConciliar}
                                itemName="avances sin conciliar"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
