import { useEffect, useMemo, useRef, useState } from 'react'
import { geoArea, geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { CUNDINAMARCA_PROVINCES, displayName, provinceOf } from '@kaizen/geography'
import { api, type CeldaAnalitica, type FiltrosTerritoriales, type ResumenTerritorial, type Scope } from './api'
import { conBase } from './rutas'

type Area = Feature<Polygon | MultiPolygon, { code: string; name: string; vintage: string }>
interface Capa extends FeatureCollection<Polygon | MultiPolygon, Area['properties']> { features: Area[] }
const nf = new Intl.NumberFormat('es-CO')
const provincias = [...CUNDINAMARCA_PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'es'))
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

function IconoMapa({ tipo }: { tipo: 'plus' | 'minus' | 'reset' | 'arrow' | 'search' }): JSX.Element {
  const paths = { plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', reset: 'M5 8V4m0 4h4M5 8a8 8 0 1 1-1 8', arrow: 'm9 5 7 7-7 7', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0' }
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[tipo]} /></svg>
}

export function MapaTerritorial({ scope }: { scope: Scope }): JSX.Element {
  const [provinceId, setProvince] = useState('')
  const [municipalityCode, setMunicipality] = useState('')
  const [metric, setMetric] = useState<'records' | 'referrals'>('records')
  const [month, setMonth] = useState('')
  const [search, setSearch] = useState('')
  const [seleccion, setSeleccion] = useState('')
  const [hover, setHover] = useState('')
  const [retry, setRetry] = useState(0)
  const [datos, setDatos] = useState<{ key: string; value: ResumenTerritorial } | null>(null)
  const [capas, setCapas] = useState<{ key: string; base: Area[]; features: Area[] } | null>(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState({ scale: 1, x: 0, y: 0 })
  const svg = useRef<SVGSVGElement>(null)
  const [canvas, setCanvas] = useState({ width: 860, height: 560 })
  const WIDTH = canvas.width
  const HEIGHT = canvas.height
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null)
  const puedeVer = scope.permissions.includes('analytics.aggregate')
  const level = municipalityCode ? 'vereda' : provinceId ? 'municipality' : 'province'
  const filtros: FiltrosTerritoriales = useMemo(() => ({ level, metric, ...(provinceId ? { provinceId } : {}), ...(municipalityCode ? { municipalityCode } : {}), ...(month ? { month } : {}) }), [level, metric, provinceId, municipalityCode, month])
  const key = JSON.stringify(filtros)
  const capaKey = `${provinceId}:${municipalityCode}`
  const resumen = datos?.key === key ? datos.value : null
  const capa = capas?.key === capaKey ? capas : null
  const cargando = !resumen || !capa
  const provincia = provincias.find(p => p.id === provinceId)
  const titulo = municipalityCode ? displayName(municipalityCode) : provincia?.name ?? 'Cundinamarca'
  const unidad = level === 'vereda' ? 'veredas' : level === 'municipality' ? 'municipios' : 'provincias'
  const etiqueta = metric === 'records' ? 'Personas sumadas' : 'Personas con referente'

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
    void api.territorio(scope, filtros).then(value => { if (actual) setDatos({ key, value }) })
      .catch(() => { if (actual) setError('No se pudieron consultar las cifras territoriales.') })
    return () => { actual = false }
  }, [scope, filtros, key, retry, puedeVer])

  useEffect(() => {
    if (!puedeVer) return
    const controller = new AbortController()
    setVista({ scale: 1, x: 0, y: 0 }); setSeleccion(''); setHover(''); setSearch('')
    const leer = async (path: string): Promise<Capa> => {
      const response = await fetch(conBase(path), { signal: controller.signal })
      if (!response.ok) throw new Error('cartografía no disponible')
      return response.json() as Promise<Capa>
    }
    void (async () => {
      const municipal = await leer('/geo/municipios.json')
      const base = municipal.features.filter(f => municipalityCode ? f.properties.code === municipalityCode : provincia ? provincia.municipalityCodes.includes(f.properties.code) : true).map(paraD3)
      const features = municipalityCode ? (await leer(`/geo/veredas/${municipalityCode}.json`)).features.map(paraD3) : base
      if (!controller.signal.aborted) setCapas({ key: capaKey, base, features })
    })().catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la cartografía. Podés volver a intentarlo.') })
    return () => controller.abort()
  }, [capaKey, municipalityCode, provincia, retry, puedeVer])

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
  const rows = resumen?.rows ?? []
  const byId = new Map(rows.map(r => [r.key, r]))
  const visible = rows.filter(r => normalizar(r.label).includes(normalizar(search))).sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.label.localeCompare(b.label, 'es'))
  const selected = byId.get(seleccion)
  const hovered = byId.get(hover)
  const vintages = [...new Set(capa?.features.map(f => f.properties.vintage) ?? [])].sort().join(', ')

  function abrir(id: string): void {
    if (level === 'province') { setProvince(id); setMunicipality('') }
    else if (level === 'municipality') setMunicipality(id)
    else setSeleccion(id)
  }
  function irAnapoima(): void { setProvince('tequendama'); setMunicipality('25035') }
  function zoom(delta: number): void {
    setVista(v => {
      const scale = Math.max(1, Math.min(5, v.scale * delta))
      return { scale, x: WIDTH / 2 - (WIDTH / 2 - v.x) * scale / v.scale, y: HEIGHT / 2 - (HEIGHT / 2 - v.y) * scale / v.scale }
    })
  }

  if (!puedeVer) return <p className="vacio">Tu cuenta no tiene acceso a las cifras territoriales de este espacio.</p>
  return <div className="territorio">
    <header className="territorio-cabecera">
      <div><h1>Territorio y referidos</h1><p className="tenue">Explorá la presencia de tu red, provincia por provincia.</p></div>
      <button className="boton territorio-atajo" onClick={irAnapoima}>Ver Anapoima <IconoMapa tipo="arrow" /></button>
    </header>
    <div className="territorio-filtros">
      <label><span>Provincia</span><select value={provinceId} onChange={e => { setProvince(e.target.value); setMunicipality('') }}><option value="">Todo Cundinamarca</option>{provincias.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label><span>Municipio / alcaldía</span><select value={municipalityCode} onChange={e => { setMunicipality(e.target.value); if (e.target.value) setProvince(provinceOf(e.target.value)?.id ?? '') }}><option value="">Todos los municipios</option>{provincias.filter(p => !provinceId || p.id === provinceId).map(p => <optgroup key={p.id} label={p.name}>{[...p.municipalityCodes].sort((a, b) => displayName(a).localeCompare(displayName(b), 'es')).map(c => <option key={c} value={c}>{displayName(c)}</option>)}</optgroup>)}</select></label>
      <label><span>Medida</span><select value={metric} onChange={e => setMetric(e.target.value as 'records' | 'referrals')}><option value="records">Personas sumadas</option><option value="referrals">Personas con referente</option></select></label>
      <label><span>Mes de registro</span><input type="month" value={month} onChange={e => setMonth(e.target.value)} aria-describedby="periodo-ayuda" /></label>
      {month && <button className="boton" onClick={() => setMonth('')}>Todos los meses</button>}
    </div>
    <p className="territorio-contexto" id="periodo-ayuda">{metric === 'records' ? 'Personas enviadas o aprobadas en este espacio.' : 'Personas enviadas o aprobadas que tienen una relación de referido registrada. Cada persona se cuenta una vez.'} {month ? `Registradas en ${month}.` : 'Todos los meses.'}</p>
    <nav className="territorio-migas" aria-label="Ubicación territorial"><button onClick={() => { setProvince(''); setMunicipality('') }} aria-current={level === 'province' ? 'page' : undefined}>Cundinamarca</button>{provincia && <><IconoMapa tipo="arrow" /><button onClick={() => setMunicipality('')} aria-current={level === 'municipality' ? 'page' : undefined}>{provincia.name}</button></>}{municipalityCode && <><IconoMapa tipo="arrow" /><span aria-current="page">{displayName(municipalityCode)}</span></>}</nav>
    {error && <div className="territorio-error" role="alert">{error}<button className="boton" onClick={() => setRetry(r => r + 1)}>Reintentar</button></div>}
    <div className="territorio-layout">
      <section className="territorio-cartografia" aria-label={`Mapa de ${titulo}`} aria-busy={cargando}>
        <div className="territorio-mapa-titulo"><div><h2>{titulo}</h2><span>{level === 'province' ? '15 provincias · 116 municipios' : `${capa?.features.length ?? '—'} ${unidad}`}</span></div><span className="territorio-norte" aria-label="Norte arriba">N <svg width="16" height="25" viewBox="0 0 16 25" aria-hidden="true"><path d="m8 2 6 19-6-4-6 4Z" fill="currentColor" /></svg></span></div>
        <svg ref={svg} className="territorio-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de ${titulo} por ${unidad}. Usá la lista territorial para explorar con el teclado.`}
          onPointerDown={e => { if (e.button !== 0) return; const rect = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX * WIDTH / rect.width, y: e.clientY * HEIGHT / rect.height, ox: vista.x, oy: vista.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
          onPointerMove={e => { if (!drag.current) return; const rect = e.currentTarget.getBoundingClientRect(); const dx = e.clientX * WIDTH / rect.width - drag.current.x; const dy = e.clientY * HEIGHT / rect.height - drag.current.y; if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true; setVista(v => ({ ...v, x: drag.current!.ox + dx, y: drag.current!.oy + dy })) }}
          onPointerUp={e => { if (drag.current && !drag.current.moved) { const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-area]'); if (target) abrir(target.getAttribute('data-area') ?? '') } drag.current = null }}
          onPointerCancel={() => { drag.current = null }} onPointerLeave={() => setHover('')}>
          <defs><pattern id="territorio-protegido" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" className="territorio-pattern-base" /><path d="M-1 1 1-1M0 7 7 0M6 8 8 6" className="territorio-pattern-line" /></pattern></defs>
          <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.scale})`}>
            {level === 'vereda' && dibujo?.outline.map((d, i) => <path key={i} d={d} className="territorio-contorno" />)}
            {dibujo?.areas.map(a => <g key={a.id} data-area={a.id} className={`territorio-area dato-${tono(byId.get(a.id))}${a.id === seleccion || a.id === hover ? ' activa' : ''}`} onPointerEnter={() => setHover(a.id)}>{a.paths.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" />)}<title>{nombre(byId.get(a.id)?.label ?? a.id)}: {cifra(byId.get(a.id))}</title></g>)}
            {dibujo?.labels.map(a => <text key={a.id} x={a.centroid[0]} y={a.centroid[1]} textAnchor="middle" className={`territorio-etiqueta dato-${tono(byId.get(a.id))}`} fontSize={11 / Math.sqrt(vista.scale)}>{nombre(byId.get(a.id)?.label ?? '')}</text>)}
            {level === 'vereda' && dibujo?.outline.map((d, i) => <path key={i} d={d} className="territorio-borde" vectorEffect="non-scaling-stroke" />)}
          </g>
        </svg>
        {cargando && !error && <div className="territorio-cargando" role="status">Cargando mapa y cifras…</div>}
        {hovered && !cargando && <div className="territorio-tooltip"><strong>{nombre(hovered.label)}</strong><span>{cifra(hovered)} {hovered.suppressed ? '· cifra reservada' : etiqueta.toLowerCase()}</span></div>}
        <div className="territorio-controles"><button onClick={() => zoom(1.4)} disabled={vista.scale >= 5} aria-label="Acercar mapa"><IconoMapa tipo="plus" /></button><button onClick={() => zoom(1 / 1.4)} disabled={vista.scale <= 1} aria-label="Alejar mapa"><IconoMapa tipo="minus" /></button><button onClick={() => setVista({ scale: 1, x: 0, y: 0 })} aria-label="Restablecer encuadre"><IconoMapa tipo="reset" /></button></div>
        <div className="territorio-leyenda" aria-label="Escala del mapa">{[['cero', '0'], ['uno', '1–19'], ['dos', '20–99'], ['tres', '100–499'], ['cuatro', '500+'], ['protegido', 'Protegido']].map(([t, label]) => <span key={t}><i className={`dato-${t}`} />{label}</span>)}</div>
        <p className="territorio-mapa-pie">{level === 'vereda' ? 'El contorno muestra el municipio. Las áreas sin polígono rural no reciben cifras de vereda.' : 'Elegí un territorio en el mapa o en la lista para explorar su detalle.'}</p>
      </section>
      <aside className="territorio-panel" aria-label="Detalle territorial">
        <div className="territorio-resumen" aria-live="polite"><span>{etiqueta}</span><strong>{cifra(resumen?.total)}</strong><p>{titulo} · {month || 'todos los meses'}</p><div className="territorio-cobertura"><b>{resumen ? `${resumen.coveredAreas} / ${resumen.areaCount}` : '—'}</b><span>{unidad} con registros</span></div></div>
        {level === 'vereda' && <div className="territorio-sin-asignar"><span>Sin vereda asignada</span><strong>{cifra(resumen?.unassigned)}</strong><p>Incluye registros históricos y personas sin vereda informada. No equivale a población urbana.</p></div>}
        {selected && <div className="territorio-seleccion" aria-live="polite"><span>Vereda seleccionada</span><h3>{nombre(selected.label)}</h3><strong>{cifra(selected)}</strong><button className="boton" onClick={() => setSeleccion('')}>Quitar selección</button></div>}
        <div className="territorio-lista-cabecera"><h2>Detalle por {level === 'province' ? 'provincia' : level === 'municipality' ? 'municipio' : 'vereda'}</h2><label className="territorio-buscar"><IconoMapa tipo="search" /><input type="search" placeholder={`Buscar ${unidad}…`} value={search} onChange={e => setSearch(e.target.value)} aria-label={`Buscar ${unidad}`} /></label></div>
        <div className="territorio-lista" aria-busy={cargando}>{!resumen ? <p className="territorio-vacio">{error ? 'Cifras no disponibles.' : 'Consultando territorios…'}</p> : !visible.length ? <p className="territorio-vacio">No hay territorios que coincidan con “{search}”.</p> : visible.map(r => <button key={r.key} onClick={() => abrir(r.key)} className={`territorio-fila ${r.key === seleccion ? 'seleccionada' : ''}`} aria-pressed={level === 'vereda' ? r.key === seleccion : undefined} onFocus={() => setHover(r.key)} onBlur={() => setHover('')}><span className={`territorio-punto dato-${tono(r)}`} /><span>{nombre(r.label)}</span><strong>{cifra(r)}</strong>{level !== 'vereda' && <IconoMapa tipo="arrow" />}</button>)}</div>
        <div className="territorio-privacidad"><strong>Lectura de las cifras</strong><p>0 significa que no hay registros para estos filtros. “Protegido” reserva grupos pequeños y sus complementos; nunca significa cero.</p></div>
      </aside>
    </div>
    {resumen && resumen.total.value === 0 && !cargando && <p className="territorio-aviso" role="status">No hay personas para estos filtros. El mapa muestra la división territorial de referencia.</p>}
    <details className="territorio-fuentes"><summary>Fuentes y alcance del mapa</summary><p>Municipios: DANE, Marco Geoestadístico Nacional 2020, publicación UPRA. Veredas: nivel de referencia DANE 2020 publicado por IDEC; vigencias de las áreas visibles: {vintages || 'consultando'}. Cartografía estadística de referencia: no sustituye un deslinde.</p><p>Agrupación provincial del catálogo de Kaizen, pendiente de cotejo administrativo. Las cifras corresponden al espacio y finalidad seleccionados; no representan el censo ni la población total.</p><p>Departamento Administrativo Nacional de Estadística — DANE: <a href="https://www.dane.gov.co" target="_blank" rel="noreferrer">www.dane.gov.co</a>. <a href="https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/" target="_blank" rel="noreferrer">Licencia CC BY 4.0</a> · <a href="https://www.arcgis.com/home/item.html?id=ceb6771090e04c6d966d10e64a9a6720" target="_blank" rel="noreferrer">Fuente de veredas IDEC</a>. Actualización de cifras: {resumen ? new Date(resumen.executedAt).toLocaleString('es-CO') : 'pendiente'}.</p></details>
  </div>
}
