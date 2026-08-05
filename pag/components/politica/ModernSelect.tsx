'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

export interface OptionItem {
    value: string
    label: string
    sublabel?: string
    badge?: string
    icon?: React.ReactNode
}

interface ModernSelectProps {
    value: string
    onChange: (value: string) => void
    options: OptionItem[]
    placeholder?: string
    searchable?: boolean
    icon?: React.ReactNode
    className?: string
    disabled?: boolean
    size?: 'sm' | 'md'
}

export default function ModernSelect({
    value,
    onChange,
    options,
    placeholder = 'Seleccionar...',
    searchable = false,
    icon,
    className = '',
    disabled = false,
    size = 'md',
}: ModernSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find((o) => o.value === value)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus search input on open
    useEffect(() => {
        if (isOpen && (searchable || options.length > 7)) {
            setTimeout(() => {
                searchInputRef.current?.focus()
            }, 50)
        } else {
            setSearch('')
        }
    }, [isOpen, searchable, options.length])

    // Keyboard navigation (ESC to close)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    const filteredOptions = options.filter((opt) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        const matchLabel = opt.label.toLowerCase().includes(q)
        const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false
        return matchLabel || matchSub
    })

    const showSearch = searchable || options.length > 7

    return (
        <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between text-left transition-all duration-150 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--pol-primary)]/20 ${
                    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-xs'
                } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${
                    isOpen ? 'border-[var(--pol-primary)] ring-2 ring-[var(--pol-primary)]/20' : ''
                }`}
            >
                <div className="flex items-center space-x-2 truncate pr-2">
                    {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                    {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                    <span className={`truncate font-semibold ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.badge && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {selectedOption.badge}
                        </span>
                    )}
                </div>

                <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--pol-primary)]' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1.5 w-full min-w-[200px] rounded-2xl bg-white border border-slate-200/90 shadow-xl p-1.5 animate-fadeIn space-y-1">
                    {/* Search Input when long list */}
                    {showSearch && (
                        <div className="p-1 border-b border-slate-100 pb-1.5">
                            <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar opción..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--pol-primary)]"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value)
                                            setIsOpen(false)
                                        }}
                                        className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-slate-100/90 text-[var(--pol-primary-ink)] font-bold'
                                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2 truncate pr-2">
                                            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                                            <div className="truncate">
                                                <span className="block truncate">{opt.label}</span>
                                                {opt.sublabel && (
                                                    <span className="block text-[10px] text-slate-400 truncate font-normal">
                                                        {opt.sublabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                                            {opt.badge && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                    {opt.badge}
                                                </span>
                                            )}
                                            {isSelected && (
                                                <Check className="w-3.5 h-3.5 text-[var(--pol-primary)] shrink-0" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
