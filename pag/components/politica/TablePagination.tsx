'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    pageSize?: number
    onPageChange: (page: number) => void
    itemName?: string
}

export default function TablePagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize = 10,
    onPageChange,
    itemName = 'elementos',
}: TablePaginationProps) {
    if (totalItems <= 0) return null

    const safeTotalPages = Math.max(1, totalPages)
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    return (
        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
                Mostrando <strong className="text-slate-900">{startItem} - {endItem}</strong> de <strong className="text-slate-900">{totalItems}</strong> {itemName}
            </span>

            <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">
                    Página {currentPage} de {safeTotalPages}
                </span>

                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                </button>

                <button
                    type="button"
                    disabled={currentPage >= safeTotalPages}
                    onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
