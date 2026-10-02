import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { geoArea, geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { CUNDINAMARCA_PROVINCES, VEREDAS, displayName, provinceOf } from '@kaizen/geography'
import { api, type CeldaAnalitica, type FiltrosTerritoriales, type ResumenTerritorial, type Scope } from './api'
import { conBase } from './rutas'
import { SelectorMultiple } from './SelectorMultiple'
const MapaEntorno = lazy(() => import('./MapaEntorno'))

type Area = Feature<Polygon | MultiPolygon, { code: string; name: string; vintage: string }>
interface Capa extends FeatureCollection<Polygon | MultiPolygon, Area['properties']> { features: Area[] }
const nf = new Intl.NumberFormat('es-CO')
const provincias = [...CUNDINAMARCA_PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'es'))
const medidas = [{ value: 'records' as const, label: 'Personas registradas' }, { value: 'referrals' as const, label: 'Personas referidas' }]
const mesLegible = (v: string) => {
  const s = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(`${v}-01T12:00:00`))
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1)
}
const cifra = (row: CeldaAnalitica | undefined) => !row ? '—' : row.suppressed ? 'Protegido' : nf.format(row.value ?? 0)
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const nombre = (s: string) => s.toLocaleLowerCase('es').replace(/(^|\s)\S/g, c => c.toLocaleUpperCase('es'))
const tono = (r: CeldaAnalitica | undefined) => !r ? 'pendiente' : r.suppressed ? 'protegido' : !r.value ? 'cero' : r.value < 20 ? 'uno' : r.value < 100 ? 'dos' : r.value < 500 ? 'tres' : 'cuatro'

// d3 usa el sentido esférico inverso a RFC 7946. Sólo se invierte la copia
// para dibujar; la cartografía original conserva sus anillos y coordenadas.
function paraD3(f: Area): Area {
  if (geoArea(f) < 2 * Math.PI) return f
  const g = f.geometry
  return { ...f, geometry: g.type === 'Polygon'
    ? { type: 'Polygon', coordinates: g.coordinates.map(r => [...r].reverse()) }
    : { type: 'MultiPolygon', coordinates: g.coordinates.map(p => p.map(r => [...r].reverse())) } }
}

function IconoMapa({ tipo }: { tipo: 'plus' | 'minus' | 'reset' | 'arrow' | 'search' | 'sort' }): JSX.Element {
  const paths = { plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', reset: 'M5 8V4m0 4h4M5 8a8 8 0 1 1-1 8', arrow: 'm9 5 7 7-7 7', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', sort: 'M12 5v14m-5-5 5 5 5-5' }
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[tipo]} /></svg>
}

export function MapaTerritorial({ scope }: { scope: Scope }): JSX.Element {
  const [provinceIds, setProvinces] = useState<string[]>([])
  const [municipalityCodes, setMunicipalities] = useState<string[]>([])
  const [metric, setMetric] = useState<'records' | 'referrals'>('records')
  const [orden, setOrden] = useState<'name' | 'records' | 'referrals'>('records')
  const [ascendente, setAscendente] = useState(false)
  const [lectura, setLectura] = useState<'all' | 'zero' | 'protected'>('all')
  const [months, setMonths] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [busquedaVereda, setBusquedaVereda] = useState('')
  const [destinoVereda, setDestinoVereda] = useState('')
  const [modoMapa, setModoMapa] = useState<'referidos' | 'entorno'>('referidos')
  const [seleccion, setSeleccion] = useState('')
  const [hover, setHover] = useState('')
  const [retry, setRetry] = useState(0)
  const [datos, setDatos] = useState<{ key: string; values: Partial<Record<'records' | 'referrals', ResumenTerritorial>> } | null>(null)
  const [capas, setCapas] = useState<{ key: string; base: Area[]; features: Area[]; originalBase: Area[]; originalFeatures: Area[] } | null>(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState({ scale: 1, x: 0, y: 0 })
  const svg = useRef<SVGSVGElement>(null)
  const inspector = useRef<HTMLDivElement>(null)
  const [canvas, setCanvas] = useState({ width: 860, height: 560 })
  const WIDTH = canvas.width
  const HEIGHT = canvas.height
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  const puedeVer = scope.permissions.includes('analytics.aggregate')
  const municipalityCode = municipalityCodes.length === 1 ? municipalityCodes[0]! : ''
  const level = municipalityCode ? 'vereda' : provinceIds.length || municipalityCodes.length ? 'municipality' : 'province'
  const filtros: FiltrosTerritoriales = useMemo(() => ({ level, metric: 'records', ...(provinceIds.length ? { provinceIds: provinceIds.join(',') } : {}), ...(municipalityCodes.length ? { municipalityCodes: municipalityCodes.join(',') } : {}), ...(months.length ? { months: months.join(',') } : {}) }), [level, provinceIds, municipalityCodes, months])
  const key = JSON.stringify(filtros)
  const capaKey = `${provinceIds.join(',')}:${municipalityCodes.join(',')}`
  const resumen = datos?.key === key ? datos.values[metric] ?? null : null
  const registros = datos?.key === key ? datos.values.records ?? null : null
  const referidos = datos?.key === key ? datos.values.referrals ?? null : null
  const capa = capas?.key === capaKey ? capas : null
  const cargando = !resumen || !capa
  const provincia = provinceIds.length === 1 ? provincias.find(p => p.id === provinceIds[0]) : municipalityCode ? provinceOf(municipalityCode) : undefined
  const titulo = municipalityCode ? displayName(municipalityCode) : municipalityCodes.length ? `${municipalityCodes.length} municipios` : provinceIds.length > 1 ? `${provinceIds.length} provincias` : provincia?.name ?? 'Cundinamarca'
  const unidad = level === 'vereda' ? 'veredas' : level === 'municipality' ? 'municipios' : 'provincias'
  const etiqueta = metric === 'records' ? 'Personas registradas' : 'Personas referidas'
  const opcionesMunicipales = useMemo(() => provincias.filter(p => !provinceIds.length || provinceIds.includes(p.id)).flatMap(p => [...p.municipalityCodes].sort((a, b) => displayName(a).localeCompare(displayName(b), 'es')).map(code => ({ value: code, label: displayName(code), group: p.name }))), [provinceIds])
  const opcionesMeses = useMemo(() => {
    const now = new Date()
    const recent = Array.from({ length: 24 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
    return [...new Set([...recent, ...months])].sort().reverse().map(value => ({ value, label: mesLegible(value) }))
  }, [months])
  const periodo = months.length === 1 ? mesLegible(months[0]!) : months.length ? `${months.length} meses seleccionados` : 'Todos los meses'

  useEffect(() => {
    if (!svg.current) return
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0 && rect.height > 0) {
        setCanvas({ width: rect.width, height: rect.height })
        setVista({ scale: 1, x: 0, y: 0 })
      }
    })
    observer.observe(svg.current)
    return () => observer.disconnect()
  }, [puedeVer])

  useEffect(() => {
    if (!puedeVer) return
    let actual = true
    setError('')
    void Promise.all(medidas.map(async ({ value: m }) => [m, await api.territorio(scope, { ...filtros, metric: m })] as const))
      .then(entries => { if (actual) setDatos({ key, values: Object.fromEntries(entries) }) })
      .catch(() => { if (actual) setError('No se pudieron consultar las cifras territoriales.') })
    return () => { actual = false }
  }, [scope, filtros, key, retry, puedeVer])

  useEffect(() => {
    if (!puedeVer) return
    const controller = new AbortController()
    setVista({ scale: 1, x: 0, y: 0 }); setSeleccion(''); setHover(''); setSearch(''); setLectura('all')
    const leer = async (path: string): Promise<Capa> => {
      const response = await fetch(conBase(path), { signal: controller.signal })
      if (!response.ok) throw new Error('cartografía no disponible')
      return response.json() as Promise<Capa>
    }
    void (async () => {
      const municipal = await leer('/geo/municipios.json')
      const originalBase = municipal.features.filter(f => municipalityCodes.length ? municipalityCodes.includes(f.properties.code) : provinceIds.length ? provinceIds.includes(provinceOf(f.properties.code)?.id ?? '') : true)
      const originalFeatures = municipalityCode ? (await leer(`/geo/veredas/${municipalityCode}.json`)).features : originalBase
      if (!controller.signal.aborted) setCapas({ key: capaKey, base: originalBase.map(paraD3), features: originalFeatures.map(paraD3), originalBase, originalFeatures })
    })().catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la cartografía. Puedes volver a intentarlo.') })
    return () => controller.abort()
  }, [capaKey, municipalityCode, municipalityCodes, provinceIds, retry, puedeVer])

  const dibujo = useMemo(() => {
    if (!capa) return null
    const collection = { type: 'FeatureCollection' as const, features: capa.base }
    const margin = WIDTH < 500 ? 28 : 48
    const projection = geoMercator().fitExtent([[margin, 26], [WIDTH - margin, HEIGHT - 26]], collection)
    const path = geoPath(projection)
    const grouped = new Map<string, Area[]>()
    for (const f of capa.features) {
      const id = level === 'province' ? provinceOf(f.properties.code)?.id ?? '' : f.properties.code
      grouped.set(id, [...(grouped.get(id) ?? []), f])
    }
    const areas = [...grouped].map(([id, features]) => {
      const geo = { type: 'FeatureCollection', features } as GeoPermissibleObjects
      const centroid = path.centroid(geo)
      return { id, paths: features.map(f => path(f) ?? ''), centroid }
    })
    // Una etiqueta nunca tapa otra. El detalle completo permanece en la lista.
    const used: number[][] = []
    const labels = areas.filter(a => {
      const [x, y] = a.centroid
      if (!Number.isFinite(x) || !Number.isFinite(y) || used.some(([px, py]) => Math.abs(px! - x!) < 108 && Math.abs(py! - y!) < 32)) return false
      used.push(a.centroid); return true
    })
    return { areas, labels, outline: capa.base.map(f => path(f) ?? '') }
  }, [capa, level, WIDTH, HEIGHT])
  const rows = registros?.rows ?? []
  const byId = new Map(resumen?.rows.map(r => [r.key, r]) ?? [])
  const porRegistro = new Map(rows.map(r => [r.key, r]))
  const porReferido = new Map(referidos?.rows.map(r => [r.key, r]) ?? [])
  const visible = rows.filter(r => normalizar(r.label).includes(normalizar(search)) && (lectura === 'all' || lectura === 'zero' && !r.suppressed && r.value === 0 || lectura === 'protected' && (r.suppressed || porReferido.get(r.key)?.suppressed))).sort((a, b) => {
    if (orden === 'name') return a.label.localeCompare(b.label, 'es') * (ascendente ? 1 : -1)
    const mapa = orden === 'records' ? porRegistro : porReferido
    const av = mapa.get(a.key), bv = mapa.get(b.key)
    // Las cifras reservadas o pendientes siempre quedan al final, sin atribuirles un valor.
    const aPublica = av && !av.suppressed && av.value !== null, bPublica = bv && !bv.suppressed && bv.value !== null
    if (!aPublica || !bPublica) return aPublica ? -1 : bPublica ? 1 : a.label.localeCompare(b.label, 'es')
    return (av.value! - bv.value!) * (ascendente ? 1 : -1) || a.label.localeCompare(b.label, 'es')
  })
  const selected = porRegistro.get(seleccion)
  const hovered = byId.get(hover)
  const selectedArea = capa?.features.find(f => f.properties.code === seleccion)
  const hectareas = selectedArea ? geoArea(selectedArea) * 6378137 ** 2 / 10000 : null
  const provinciaSeleccionada = level === 'province' ? provincias.find(p => p.id === seleccion) : undefined
  const veredasMunicipio = level === 'municipality' && selected ? VEREDAS.filter(v => v.municipalityCode === seleccion).length : null
  const veredasEncontradas = busquedaVereda.trim().length >= 2 ? VEREDAS.filter(v => normalizar(`${v.name} ${v.code} ${displayName(v.municipalityCode)}`).includes(normalizar(busquedaVereda.trim()))).slice(0, 8) : []
  const vintages = [...new Set(capa?.features.map(f => f.properties.vintage) ?? [])].sort().join(', ')

  useEffect(() => {
    if (destinoVereda && resumen?.rows.some(r => r.key === destinoVereda)) { setSeleccion(destinoVereda); setDestinoVereda('') }
  }, [destinoVereda, resumen])

  function abrir(id: string): void {
    if (level === 'province') { setProvinces([id]); setMunicipalities([]) }
    else if (level === 'municipality') { setProvinces([provinceOf(id)?.id ?? '']); setMunicipalities([id]) }
    else setSeleccion(id)
  }
  function ordenar(campo: 'name' | 'records' | 'referrals'): void {
    setOrden(campo); setAscendente(campo === orden ? !ascendente : campo === 'name')
  }
  function consultar(id: string): void {
    setSeleccion(id)
    inspector.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    inspector.current?.focus({ preventScroll: true })
  }
  function irAnapoima(): void { setProvinces(['tequendama']); setMunicipalities(['25035']) }
  function cambiarProvincias(values: string[]): void {
    setProvinces(values)
    setMunicipalities(current => current.filter(code => !values.length || values.includes(provinceOf(code)?.id ?? '')))
  }
  function zoom(delta: number): void {
    setVista(v => {
      const scale = Math.max(1, Math.min(5, v.scale * delta))
      return { scale, x: WIDTH / 2 - (WIDTH / 2 - v.x) * scale / v.scale, y: HEIGHT / 2 - (HEIGHT / 2 - v.y) * scale / v.scale }
    })
  }

  if (!puedeVer) return <p className="vacio">Tu cuenta no tiene acceso a las cifras territoriales de este espacio.</p>
  return <div className="territorio">
    <header className="territorio-cabecera">
      <div><h1>Panorama territorial</h1><p className="tenue">Compara tu red por provincia, municipio y vereda.</p></div>
      <button className="boton territorio-atajo" onClick={irAnapoima}>Ver Anapoima <IconoMapa tipo="arrow" /></button>
    </header>
    <div className="territorio-filtros">
      <SelectorMultiple label="Provincias" emptyLabel="Todo Cundinamarca" options={provincias.map(p => ({ value: p.id, label: p.name }))} value={provinceIds} onChange={cambiarProvincias} />
      <SelectorMultiple label="Municipios" emptyLabel="Todos los municipios" options={opcionesMunicipales} value={municipalityCodes} onChange={setMunicipalities} />
      <SelectorMultiple label="Meses de registro" emptyLabel="Todos los meses" options={opcionesMeses} value={months} onChange={setMonths} customMonth formatValue={mesLegible} />
    </div>
    <div className="territorio-contexto-filtros"><p className="territorio-contexto" id="periodo-ayuda">{titulo} · {periodo}. Personas enviadas o aprobadas de este espacio.</p>{(provinceIds.length > 0 || municipalityCodes.length > 0 || months.length > 0) && <button className="territorio-limpiar" onClick={() => { setProvinces([]); setMunicipalities([]); setMonths([]) }}>Limpiar filtros</button>}</div>
    <section className="territorio-indicadores" aria-label={`Resumen de ${titulo}`} aria-busy={!registros}>
      <article><h2>Personas registradas</h2><strong>{cifra(registros?.total)}</strong><p>Registros enviados o aprobados.</p></article>
      <article><h2>Personas referidas</h2><strong>{cifra(referidos?.total)}</strong><p>Con referente registrado; cada persona se cuenta una vez.</p></article>
      <article><h2>Presencia territorial</h2><strong>{registros ? <>{nf.format(registros.coveredAreas)}<small> / {nf.format(registros.areaCount)}</small></> : '—'}</strong><p>{unidad.charAt(0).toUpperCase() + unidad.slice(1)} con personas registradas.</p></article>
      <article><h2>{level === 'vereda' ? 'Sin vereda asignada' : 'Sin registros'}</h2><strong>{level === 'vereda' ? cifra(registros?.unassigned) : registros ? nf.format(registros.areaCount - registros.coveredAreas) : '—'}</strong><p>{level === 'vereda' ? 'Personas sin vereda informada. No equivale a población urbana.' : `${unidad.charAt(0).toUpperCase() + unidad.slice(1)} sin registros para estos filtros.`}</p></article>
    </section>
    <nav className="territorio-migas" aria-label="Ubicación territorial"><button onClick={() => { setProvinces([]); setMunicipalities([]) }} aria-current={level === 'province' ? 'page' : undefined}>Cundinamarca</button>{(provincia || provinceIds.length > 1) && <><IconoMapa tipo="arrow" /><button onClick={() => { if (!provinceIds.length && provincia) setProvinces([provincia.id]); setMunicipalities([]) }} aria-current={!municipalityCodes.length ? 'page' : undefined}>{provinceIds.length > 1 ? `${provinceIds.length} provincias` : provincia?.name}</button></>}{municipalityCodes.length > 0 && <><IconoMapa tipo="arrow" /><span aria-current="page">{municipalityCode ? displayName(municipalityCode) : `${municipalityCodes.length} municipios`}</span></>}</nav>
    <div className="territorio-exploracion">
      <div className="territorio-modos" aria-label="Vista del mapa"><button aria-pressed={modoMapa === 'referidos'} onClick={() => setModoMapa('referidos')}>Mapa de la red</button><button aria-pressed={modoMapa === 'entorno'} onClick={() => setModoMapa('entorno')}>Vías y entorno</button></div>
      <div className="territorio-busqueda-global"><label><span>Buscar vereda en Cundinamarca</span><input type="search" placeholder="Nombre, municipio o código…" value={busquedaVereda} onChange={e => setBusquedaVereda(e.target.value)} /></label>{busquedaVereda.trim().length >= 2 && <div className="territorio-resultados" aria-label="Veredas encontradas">{!veredasEncontradas.length ? <p>No hay coincidencias en el catálogo de referencia.</p> : veredasEncontradas.map(v => <button key={v.code} onClick={() => { setProvinces([provinceOf(v.municipalityCode)!.id]); setMunicipalities([v.municipalityCode]); setDestinoVereda(v.code); setBusquedaVereda('') }}><span>{nombre(v.name)}</span><small>{displayName(v.municipalityCode)} · {v.code}</small></button>)}</div>}</div>
    </div>
    {error && <div className="territorio-error" role="alert">{error}<button className="boton" onClick={() => setRetry(r => r + 1)}>Reintentar</button></div>}
    <div className="territorio-layout">
      <section className="territorio-cartografia" aria-label={`Mapa de ${titulo}`} aria-busy={cargando}>
        <div className="territorio-mapa-titulo"><div><h2>{titulo}</h2><span>{level === 'province' ? '15 provincias · 116 municipios' : `${capa?.features.length ?? '—'} ${unidad}`}</span></div><span className="territorio-norte" aria-label="Norte arriba">N <svg width="16" height="25" viewBox="0 0 16 25" aria-hidden="true"><path d="m8 2 6 19-6-4-6 4Z" fill="currentColor" /></svg></span></div>
        {modoMapa === 'referidos' && <div className="territorio-color" aria-label="Medida que colorea el mapa"><span>Colorear por</span>{medidas.map(m => <button key={m.value} aria-pressed={m.value === metric} onClick={() => setMetric(m.value)}>{m.label}</button>)}</div>}
        {modoMapa === 'entorno' && capa && <Suspense fallback={<p className="entorno-aviso" role="status">Cargando mapa de entorno…</p>}><MapaEntorno scope={scope} areas={capa.originalFeatures} municipios={capa.originalBase} seleccionado={seleccion} onSeleccionar={code => setSeleccion(level === 'province' ? provinceOf(code)?.id ?? '' : code)} titulo={titulo} /></Suspense>}
        <div className="territorio-vista-referidos" hidden={modoMapa !== 'referidos'}>
        <svg ref={svg} className="territorio-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de ${titulo} por ${unidad}. Usa la tabla territorial para explorar con el teclado.`}
          onPointerDown={e => { if (e.button !== 0) return; const rect = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX * WIDTH / rect.width, y: e.clientY * HEIGHT / rect.height, ox: vista.x, oy: vista.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={e => { if (!drag.current) return; const rect = e.currentTarget.getBoundingClientRect(); const dx = e.clientX * WIDTH / rect.width - drag.current.x; const dy = e.clientY * HEIGHT / rect.height - drag.current.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true; setVista(v => ({ ...v, x: drag.current!.ox + dx, y: drag.current!.oy + dy })) }}
          onPointerUp={e => { if (drag.current && !drag.current.moved) { const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-area]'); if (target) consultar(target.getAttribute('data-area') ?? '') } drag.current = null }}
          onPointerCancel={() => { drag.current = null }} onPointerLeave={() => setHover('')}>
          <defs><pattern id="territorio-protegido" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" className="territorio-pattern-base" /><path d="M-1 1 1-1M0 7 7 0M6 8 8 6" className="territorio-pattern-line" /></pattern></defs>
          <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.scale})`}>
            {level === 'vereda' && dibujo?.outline.map((d, i) => <path key={i} d={d} className="territorio-contorno" />)}
            {dibujo?.areas.map(a => <g key={a.id} data-area={a.id} className={`territorio-area dato-${tono(byId.get(a.id))}${a.id === seleccion || a.id === hover ? ' activa' : ''}`} onPointerEnter={() => setHover(a.id)}>{a.paths.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" />)}<title>{nombre(byId.get(a.id)?.label ?? a.id)}</title></g>)}
            {dibujo?.labels.map(a => <text key={a.id} x={a.centroid[0]} y={a.centroid[1]} textAnchor="middle" className={`territorio-etiqueta dato-${tono(byId.get(a.id))}`} fontSize={11 / Math.sqrt(vista.scale)}>{nombre(byId.get(a.id)?.label ?? '')}</text>)}
            {level === 'vereda' && dibujo?.outline.map((d, i) => <path key={i} d={d} className="territorio-borde" vectorEffect="non-scaling-stroke" />)}
          </g>
        </svg>
        {cargando && !error && <div className="territorio-cargando" role="status">Cargando mapa y cifras…</div>}
        {hovered && !cargando && <div className="territorio-tooltip" role="tooltip"><strong>{nombre(hovered.label)}</strong><dl><div><dt>Personas registradas</dt><dd>{cifra(porRegistro.get(hover))}</dd></div><div><dt>Personas referidas</dt><dd>{cifra(porReferido.get(hover))}</dd></div></dl><span>Haz clic para consultar la ficha.</span></div>}
        <div className="territorio-controles"><button onClick={() => zoom(1.4)} disabled={vista.scale >= 5} aria-label="Acercar mapa"><IconoMapa tipo="plus" /></button><button onClick={() => zoom(1 / 1.4)} disabled={vista.scale <= 1} aria-label="Alejar mapa"><IconoMapa tipo="minus" /></button><button onClick={() => setVista({ scale: 1, x: 0, y: 0 })} aria-label="Restablecer encuadre"><IconoMapa tipo="reset" /></button></div>
        <div className="territorio-leyenda" aria-label={`Escala de ${etiqueta.toLowerCase()}`}>{[['cero', '0'], ['uno', '1–19'], ['dos', '20–99'], ['tres', '100–499'], ['cuatro', '500+'], ['protegido', 'Protegido']].map(([t, label]) => <span key={t}><i className={`dato-${t}`} />{label}</span>)}</div>
        <p className="territorio-mapa-pie">{level === 'vereda' ? 'El contorno muestra el municipio; las áreas sin polígono rural no reciben cifras de vereda.' : 'Selecciona para consultar cifras. Entra al detalle para explorar el siguiente nivel.'}</p>
        </div>
      </section>
      <aside className="territorio-panel" aria-label="Detalle territorial">
        <div className="territorio-inspector" aria-live="polite" ref={inspector} tabIndex={-1}>
          <div className="territorio-inspector-cabecera"><h2>{selected ? nombre(selected.label) : 'Explora un territorio'}</h2>{selected && <button aria-label="Quitar selección territorial" onClick={() => setSeleccion('')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}</div>
          {!selected ? <><p className="territorio-inspector-ayuda">Selecciona {level === 'province' ? 'una provincia' : level === 'municipality' ? 'un municipio' : 'una vereda'} en el mapa o en la tabla para consultar sus cifras.</p><div className="territorio-recorrido"><span>Cundinamarca</span><IconoMapa tipo="arrow" /><span>Provincia</span><IconoMapa tipo="arrow" /><span>Municipio</span><IconoMapa tipo="arrow" /><span>Vereda</span></div><p className="territorio-inspector-ayuda">Puedes elegir varios territorios en los filtros y comparar sus registros en la tabla.</p></> : <>
            <p className="territorio-inspector-subtitulo">{level === 'province' ? 'Provincia de Cundinamarca' : level === 'municipality' ? `Municipio · ${provinceOf(seleccion)?.name ?? 'Cundinamarca'}` : `Vereda · ${displayName(municipalityCode)}`}</p>
            <dl className="territorio-cifras-seleccion"><div><dt>Personas registradas</dt><dd>{cifra(selected)}</dd></div><div><dt>Personas referidas</dt><dd>{cifra(porReferido.get(seleccion))}</dd></div></dl>
            <dl className="territorio-ficha-geo">{provinciaSeleccionada && <div><dt>Municipios de referencia</dt><dd>{provinciaSeleccionada.municipalityCodes.length}</dd></div>}{veredasMunicipio !== null && <div><dt>Veredas de referencia</dt><dd>{veredasMunicipio}</dd></div>}{level !== 'province' && <div><dt>{level === 'vereda' ? 'Código de vereda' : 'Código DANE'}</dt><dd>{seleccion}</dd></div>}{level === 'vereda' && selectedArea && <><div><dt>Área aproximada</dt><dd>{new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(hectareas ?? 0)} ha</dd></div><div><dt>Vigencia de referencia</dt><dd>{selectedArea.properties.vintage}</dd></div></>}</dl>
            {level !== 'vereda' && <button className="boton primario territorio-detalle" onClick={() => abrir(seleccion)}>Explorar {level === 'province' ? 'municipios' : 'veredas'} <IconoMapa tipo="arrow" /></button>}
            {level === 'vereda' && <p className="territorio-inspector-ayuda">Consulta las vías y capas públicas de esta zona en “Vías y entorno”.</p>}
          </>}
        </div>
        <div className="territorio-alcance"><h3>Qué estás consultando</h3><p>{titulo} · {periodo.toLocaleLowerCase('es')}.</p><p>Las personas referidas forman parte de las registradas. Las dos cifras no se suman.</p>{level === 'vereda' && <p>Los registros sin vereda se muestran aparte y están incluidos en el total municipal.</p>}</div>
        <div className="territorio-privacidad"><strong>Lectura de las cifras</strong><p>0 significa que no hay registros para estos filtros. “Protegido” reserva grupos pequeños y sus complementos; nunca significa cero.</p></div>
      </aside>
    </div>
    <section className="territorio-comparacion" aria-labelledby="comparacion-titulo">
      <div className="territorio-tabla-cabecera"><div><h2 id="comparacion-titulo">Compara {unidad}</h2><p>{titulo} · {periodo}. Ordena las columnas para cambiar la lectura.</p></div><label className="territorio-buscar"><IconoMapa tipo="search" /><input type="search" placeholder={`Buscar ${unidad}…`} value={search} onChange={e => setSearch(e.target.value)} aria-label={`Buscar ${unidad}`} /></label></div>
      <div className="territorio-tabla-filtros" aria-label="Filtrar la tabla"><div>{([{ value: 'all', label: 'Todos' }, { value: 'zero', label: 'Sin registros' }, { value: 'protected', label: 'Con cifras protegidas' }] as const).map(o => <button key={o.value} aria-pressed={lectura === o.value} onClick={() => setLectura(o.value)}>{o.label}</button>)}</div><span>{registros ? `${visible.length} de ${rows.length} ${unidad}` : 'Consultando…'}</span></div>
      <div className="territorio-tabla-scroll" tabIndex={0} role="region" aria-label="Tabla comparativa territorial" aria-busy={!registros}>
        <table><thead><tr><th scope="col" aria-sort={orden === 'name' ? ascendente ? 'ascending' : 'descending' : 'none'}><button onClick={() => ordenar('name')}>{level === 'province' ? 'Provincia' : level === 'municipality' ? 'Municipio' : 'Vereda'}<IconoMapa tipo="sort" /></button></th>{medidas.map(m => <th scope="col" key={m.value} aria-sort={orden === m.value ? ascendente ? 'ascending' : 'descending' : 'none'}><button aria-label={m.label} onClick={() => ordenar(m.value)}><span className="territorio-columna-completa">{m.label}</span><span className="territorio-columna-corta" aria-hidden="true">{m.value === 'records' ? 'Registradas' : 'Referidas'}</span><IconoMapa tipo="sort" /></button></th>)}<th scope="col">Detalle</th></tr></thead>
          <tbody>{!registros || !visible.length ? <tr><td colSpan={4} className="territorio-tabla-vacio">{!registros ? error ? 'Cifras no disponibles. Reintenta la consulta.' : 'Consultando cifras…' : 'No hay territorios con esta búsqueda y este filtro.'}{registros && (search || lectura !== 'all') && <button onClick={() => { setSearch(''); setLectura('all') }}>Mostrar todos los territorios</button>}</td></tr> : visible.map(r => <tr key={r.key} className={r.key === seleccion ? 'seleccionada' : ''}><th scope="row"><button className="territorio-tabla-nombre" aria-pressed={r.key === seleccion} aria-label={`Seleccionar ${nombre(r.label)}`} onClick={() => consultar(r.key)}><i className={`territorio-punto dato-${tono(byId.get(r.key))}`} /><span>{nombre(r.label)}<small>{level === 'municipality' ? provinceOf(r.key)?.name : level === 'vereda' ? r.key : `${provincias.find(p => p.id === r.key)?.municipalityCodes.length ?? '—'} municipios`}</small></span></button></th><td className={r.suppressed ? 'cifra-protegida' : ''}>{cifra(r)}</td><td className={porReferido.get(r.key)?.suppressed ? 'cifra-protegida' : ''}>{cifra(porReferido.get(r.key))}</td><td><button className="territorio-tabla-abrir" aria-label={`${level === 'province' ? 'Explorar municipios de' : level === 'municipality' ? 'Explorar veredas de' : 'Ver ficha de'} ${nombre(r.label)}`} onClick={() => level === 'vereda' ? consultar(r.key) : abrir(r.key)}>{level === 'province' ? 'Municipios' : level === 'municipality' ? 'Veredas' : 'Ficha'}<IconoMapa tipo="arrow" /></button></td></tr>)}</tbody></table>
      </div>
      <p className="territorio-tabla-nota">“Sin registros” se refiere a personas registradas en este espacio, para los meses elegidos. No indica ausencia de habitantes. Las cifras protegidas no se ordenan por cantidad.</p>
    </section>
    {resumen && resumen.total.value === 0 && !cargando && <p className="territorio-aviso" role="status">No hay personas para estos filtros. El mapa muestra la división territorial de referencia.</p>}
    <details className="territorio-fuentes"><summary>Fuentes y alcance del mapa</summary><p>Municipios: DANE, Marco Geoestadístico Nacional 2020, publicación UPRA. Veredas: nivel de referencia DANE 2020 publicado por IDEC; vigencias de las áreas visibles: {vintages || 'consultando'}. Cartografía estadística de referencia: no sustituye un deslinde.</p><p>Agrupación provincial del catálogo de Kaizen, pendiente de cotejo administrativo. Las cifras corresponden al espacio y finalidad seleccionados; no representan el censo ni la población total.</p><p>Departamento Administrativo Nacional de Estadística — DANE: <a href="https://www.dane.gov.co" target="_blank" rel="noreferrer">www.dane.gov.co</a>. <a href="https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/" target="_blank" rel="noreferrer">Licencia CC BY 4.0</a> · <a href="https://www.arcgis.com/home/item.html?id=ceb6771090e04c6d966d10e64a9a6720" target="_blank" rel="noreferrer">Fuente de veredas IDEC</a>. Actualización de cifras: {resumen ? new Date(resumen.executedAt).toLocaleString('es-CO') : 'pendiente'}.</p></details>
  </div>
}
