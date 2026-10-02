import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface OpcionMultiple { value: string; label: string; group?: string }
interface Props {
  label: string
  emptyLabel: string
  options: OpcionMultiple[]
  value: string[]
  onChange: (values: string[]) => void
  minimum?: number
  customMonth?: boolean
  formatValue?: (value: string) => string
}
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
const cantidad = (n: number) => `${n} seleccionado${n === 1 ? '' : 's'}`

function Flecha({ close = false }: { close?: boolean }): JSX.Element {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d={close ? 'm6 6 12 12M6 18 18 6' : 'm6 9 6 6 6-6'} /></svg>
}

/** Selección en borrador: una consulta al aplicar, no una por casilla. */
export function SelectorMultiple({ label, emptyLabel, options, value, onChange, minimum = 0, customMonth = false, formatValue = v => v }: Props): JSX.Element {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 340 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(value)
  const [extras, setExtras] = useState<OpcionMultiple[]>([])
  const all = [...options, ...extras.filter(e => !options.some(o => o.value === e.value))]
  const available = all.filter(o => normalizar(`${o.label} ${o.group ?? ''}`).includes(normalizar(query)))
    .sort((a, b) => Number(value.includes(b.value)) - Number(value.includes(a.value)))
  const text = (v: string) => all.find(o => o.value === v)?.label ?? formatValue(v)

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return
    const rect = trigger.current.getBoundingClientRect()
    const width = Math.min(340, window.innerWidth - 32)
    const height = panel.current.getBoundingClientRect().height
    setPosition({ width, left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - height - 96)) })
  }, [open])

  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const outside = (e: PointerEvent) => { if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    const onResize = () => setOpen(false)
    const onScroll = (e: Event) => { if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false) }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll, true) }
  }, [open])

  function close(): void { setOpen(false); trigger.current?.focus() }
  function toggle(v: string): void { setDraft(d => d.includes(v) ? d.filter(k => k !== v) : [...d, v]) }
  function keyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape' && open) { e.stopPropagation(); close() }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
      const inputs = [...(root.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])]
      if (!inputs.length) return
      const current = inputs.indexOf(document.activeElement as HTMLInputElement)
      const next = e.key === 'ArrowDown' ? (current + 1) % inputs.length : (current - 1 + inputs.length) % inputs.length
      e.preventDefault(); inputs[next]?.focus()
    }
  }

  return <div className={`selector-multiple${open ? ' abierto' : ''}`} ref={root} onKeyDown={keyDown}
    onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
    <span className="selector-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} className="selector-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-panel` : undefined}
      onClick={() => { if (open) setOpen(false); else { setDraft(value); setQuery(''); setOpen(true) } }}>
      <span id={`${id}-value`}>{value.length ? value.length === 1 ? text(value[0]!) : `${value.length} seleccionados` : emptyLabel}</span>
      {value.length > 1 && <span className="selector-count" aria-hidden="true">{value.length}</span>}<Flecha />
    </button>
    {value.length > 0 && <div className="selector-etiquetas">{value.slice(0, 2).map(v => <span key={v} className="selector-etiqueta"><span title={text(v)}>{text(v)}</span>{value.length > minimum && <button aria-label={`Quitar ${text(v)}`} onClick={() => { onChange(value.filter(k => k !== v)); setOpen(false) }}><Flecha close /></button>}</span>)}{value.length > 2 && <span className="selector-resto" title={value.slice(2).map(text).join(', ')}>+{value.length - 2}</span>}</div>}
    {open && <div ref={panel} className="selector-panel" style={position} id={`${id}-panel`} role="dialog" aria-label={`Elegir ${label.toLocaleLowerCase('es')}`}>
      <div className="selector-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input ref={search} type="search" placeholder="Buscar…" aria-label={`Buscar ${label.toLocaleLowerCase('es')}`} value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div className="selector-acciones"><button onClick={() => setDraft(d => [...new Set([...d, ...available.map(o => o.value)])])}>Seleccionar {query ? 'resultados' : 'todos'}</button>{minimum === 0 && <button onClick={() => setDraft([])}>Limpiar</button>}</div>
      <div className="selector-options">{!available.length ? <p className="selector-empty">Sin coincidencias para “{query}”.</p> : available.map(o => <label className="selector-option" key={o.value}><input type="checkbox" checked={draft.includes(o.value)} onChange={() => toggle(o.value)} /><span><span>{o.label}</span>{o.group && <small>{o.group}</small>}</span></label>)}</div>
      {customMonth && <label className="selector-month"><span>Añadir otro mes</span><input type="month" aria-label="Añadir otro mes" onChange={e => { const v = e.target.value; if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) return; setExtras(old => old.some(o => o.value === v) ? old : [...old, { value: v, label: formatValue(v) }]); setDraft(d => d.includes(v) ? d : [...d, v]) }} /></label>}
      <div className="selector-footer"><span aria-live="polite">{draft.length ? cantidad(draft.length) : minimum ? 'Elegí al menos uno' : emptyLabel}</span><button className="selector-apply" disabled={draft.length < minimum} onClick={() => { onChange([...draft].sort()); close() }}>Aplicar</button></div>
    </div>}
  </div>
}
