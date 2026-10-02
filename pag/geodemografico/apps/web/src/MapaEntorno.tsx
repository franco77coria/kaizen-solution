import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { FERREA_ITEM, VIAS_ITEM, type Caja, type ConsultaVias, type Superficie, type Tramo, type TramoGeo } from '@kaizen/geography'
import { api, type Scope } from './api'
import { conBase } from './rutas'

type Area = Feature<Polygon | MultiPolygon, { code: string; name: string; vintage: string }>
interface Props { scope: Scope; areas: Area[]; municipios: Area[]; originalPath: string; seleccionado: string; onSeleccionar: (code: string) => void; titulo: string }
const categorias: Array<{ key: Superficie; label: string; color: string }> = [
  { key: 'pavimentada', label: 'Pavimentada', color: '#256a91' },
  { key: 'sin-pavimentar', label: 'Sin pavimentar / afirmado', color: '#a15d24' },
  { key: 'otra', label: 'Otra superficie', color: '#6b5587' },
  { key: 'sin-informacion', label: 'Sin información', color: '#58646b' },
]
const todos = categorias.map(c => c.key)
const fecha = (s: string | number) => new Date(s).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
const collection = <G extends Polygon | MultiPolygon | TramoGeo['geometry'], P>(features: Array<Feature<G, P>>): FeatureCollection<G, P> => ({ type: 'FeatureCollection', features })

export default function MapaEntorno({ scope, areas, municipios, originalPath, seleccionado, onSeleccionar, titulo }: Props): JSX.Element {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const onSelect = useRef(onSeleccionar)
  onSelect.current = onSeleccionar
  const roadAbort = useRef<AbortController | null>(null)
  const [ready, setReady] = useState(false)
  const [base, setBase] = useState<'calles' | 'satelite'>('calles')
  const [limites, setLimites] = useState(true)
  const [nombres, setNombres] = useState(true)
  const [ferrea, setFerrea] = useState(false)
  const [rail, setRail] = useState<FeatureCollection<TramoGeo['geometry'], Tramo> | null>(null)
  const [railError, setRailError] = useState('')
  const [consulta, setConsulta] = useState<(ConsultaVias & { caja: Caja }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [baseError, setBaseError] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [canQuery, setCanQuery] = useState(false)
  const [zoom, setZoom] = useState(8)
  const [tipos, setTipos] = useState<Superficie[]>(todos)
  const [busqueda, setBusqueda] = useState('')
  const [tramo, setTramo] = useState<Tramo | null>(null)
  const cache = useRef(new Map<string, ConsultaVias>())

  useEffect(() => {
    if (!container.current) return
    const m = L.map(container.current, { zoomControl: false, preferCanvas: true, scrollWheelZoom: false, maxBounds: [[3.6, -75], [6, -73]], maxBoundsViscosity: 1 }).setView([4.8, -74.1], 8)
    L.control.zoom({ position: 'topleft', zoomInTitle: 'Acercar mapa de entorno', zoomOutTitle: 'Alejar mapa de entorno' }).addTo(m)
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(m)
    const update = () => {
      const b = m.getBounds()
      setZoom(m.getZoom())
      setCanQuery(m.getZoom() >= 13 && b.getEast() - b.getWest() <= .16 && b.getNorth() - b.getSouth() <= .16 && b.getWest() >= -75 && b.getEast() <= -73 && b.getSouth() >= 3.6 && b.getNorth() <= 6)
    }
    m.on('moveend', update)
    const observer = new ResizeObserver(() => m.invalidateSize({ animate: false }))
    observer.observe(container.current)
    map.current = m; setReady(true)
    return () => { observer.disconnect(); roadAbort.current?.abort(); m.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!ready || !map.current) return
    setBaseError(false)
    const tiles = base === 'calles'
      ? L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
      : L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community' })
    tiles.on('tileerror', () => setBaseError(true)).addTo(map.current)
    return () => { tiles.remove() }
  }, [ready, base])

  useEffect(() => {
    if (!ready || !map.current || !municipios.length) return
    const boundary = L.geoJSON(collection(municipios))
    map.current.fitBounds(boundary.getBounds(), { padding: [24, 24], maxZoom: 13, animate: false })
    roadAbort.current?.abort(); setConsulta(null); setTramo(null); setLoading(false); setError('')
  }, [ready, municipios])

  useEffect(() => {
    if (!ready || !map.current) return
    const layer = L.geoJSON(collection(areas), {
      style: f => ({ color: f?.properties?.code === seleccionado ? '#174c38' : '#2f6b57', weight: f?.properties?.code === seleccionado ? 3 : 1, fillColor: '#2f6b57', fillOpacity: f?.properties?.code === seleccionado ? .18 : .025 }),
      onEachFeature: (f, l) => {
        const text = document.createElement('span'); text.textContent = f.properties.name
        const permanent = nombres && areas.length <= 60 && zoom >= 12
        l.bindTooltip(text, { permanent, sticky: !permanent, direction: permanent ? 'center' : 'auto', className: permanent ? 'entorno-label' : '' })
        l.on('click', () => onSelect.current(String(f.properties.code)))
      },
    })
    if (limites) layer.addTo(map.current)
    return () => { layer.remove() }
  }, [ready, areas, seleccionado, limites, nombres, zoom])

  useEffect(() => {
    if (!ferrea || rail) return
    const controller = new AbortController()
    setRailError('')
    void api.infraestructuraFerrea(scope, controller.signal).then(setRail).catch(() => { if (!controller.signal.aborted) setRailError('No se pudo cargar la red férrea. Desactiva y activa la capa para reintentar.') })
    return () => controller.abort()
  }, [ferrea, rail, scope])

  useEffect(() => {
    if (!ready || !map.current || !ferrea || !rail) return
    const layer = L.geoJSON(rail, { style: { color: '#3d354d', weight: 3, dashArray: '8 5' }, onEachFeature: (f, l) => { const label = document.createElement('span'); label.textContent = f.properties.nombre; l.bindTooltip(label); l.on('click', () => setTramo(f.properties as Tramo)) } }).addTo(map.current)
    return () => { layer.remove() }
  }, [ready, ferrea, rail])

  const visibles = useMemo(() => (consulta?.features ?? []).filter(f => tipos.includes(f.properties.categoria) && f.properties.nombre.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))), [consulta, tipos, busqueda])
  useEffect(() => {
    if (!ready || !map.current) return
    const layer = L.geoJSON(collection(visibles), { style: f => ({ color: categorias.find(c => c.key === f?.properties.categoria)?.color ?? '#58646b', weight: f?.properties.id === tramo?.id ? 6 : 3, opacity: .95 }), onEachFeature: (f, l) => { const text = document.createElement('span'); text.textContent = `${f.properties.nombre} · ${f.properties.superficie}`; l.bindTooltip(text, { sticky: true }); l.on('click', () => setTramo(f.properties as Tramo)) } }).addTo(map.current)
    return () => { layer.remove() }
  }, [ready, visibles, tramo?.id])

  useEffect(() => {
    if (!ready || !map.current || !consulta) return
    const [w, s, e, n] = consulta.caja
    const rect = L.rectangle([[s, w], [n, e]], { color: '#58646b', weight: 1, fill: false, dashArray: '4 4', interactive: false }).addTo(map.current)
    return () => { rect.remove() }
  }, [ready, consulta])

  async function consultar(): Promise<void> {
    if (!map.current || !canQuery || loading) return
    const bounds = map.current.getBounds()
    const caja: Caja = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    const key = caja.map(v => v.toFixed(6)).join(',')
    roadAbort.current?.abort()
    const controller = new AbortController(); roadAbort.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 30000)
    setLoading(true); setError(''); setTramo(null)
    try {
      const cached = cache.current.get(key)
      const data = cached && Date.now() - Date.parse(cached.consultado) < 1800000 ? cached : await api.infraestructuraVias(scope, caja, controller.signal)
      if (roadAbort.current !== controller) return
      cache.current.set(key, data)
      if (cache.current.size > 4) cache.current.delete(cache.current.keys().next().value!)
      setConsulta({ ...data, caja })
    } catch {
      if (roadAbort.current === controller) setError('No se pudieron consultar las vías. Acerca el mapa y vuelve a intentarlo.')
    } finally { window.clearTimeout(timeout); if (roadAbort.current === controller) setLoading(false) }
  }

  function enfocar(f: TramoGeo): void { setTramo(f.properties); map.current?.fitBounds(L.geoJSON(f).getBounds(), { maxZoom: 17, padding: [40, 40], animate: false }) }
  async function descargar(): Promise<void> {
    if (!areas.length) return
    setDescargando(true); setDownloadError('')
    try {
      const response = await fetch(conBase(originalPath))
      if (!response.ok) throw new Error('Límites no disponibles')
      const original = await response.json() as FeatureCollection<Polygon | MultiPolygon, Area['properties']>
      const codes = new Set(areas.map(f => f.properties.code))
      const geo = { ...original, features: original.features.filter(f => codes.has(f.properties.code)) }
      const url = URL.createObjectURL(new Blob([JSON.stringify(geo)], { type: 'application/geo+json' }))
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'territorios_cundinamarca.geojson'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setDownloadError('No se pudieron descargar los límites. Vuelve a intentarlo.') }
    finally { setDescargando(false) }
  }

  return <div className="entorno">
    <div className="entorno-herramientas">
      <div className="entorno-base" aria-label="Mapa base"><button aria-pressed={base === 'calles'} onClick={() => setBase('calles')}>Calles</button><button aria-pressed={base === 'satelite'} onClick={() => setBase('satelite')}>Satélite</button></div>
      <label><input type="checkbox" checked={limites} onChange={e => setLimites(e.target.checked)} /> Límites</label>
      <label><input type="checkbox" checked={nombres} onChange={e => setNombres(e.target.checked)} /> Nombres</label>
      <label><input type="checkbox" checked={ferrea} onChange={e => setFerrea(e.target.checked)} /> Red férrea</label>
    </div>
    <div ref={container} className="entorno-mapa" role="region" aria-label={`Mapa de calles y entorno de ${titulo}`} />
    {baseError && <p className="entorno-aviso" role="status">Algunas imágenes del mapa no cargaron. Puedes cambiar el mapa base; los límites y las capas consultadas siguen disponibles.</p>}
    {railError && <p className="entorno-aviso" role="alert">{railError}</p>}
    {ferrea && !rail && !railError && <p className="entorno-aviso" role="status">Consultando la red férrea…</p>}
    {ferrea && rail && <div className="entorno-inventario entorno-corredores">
      <h3>Corredores férreos de referencia</h3>
      <p className="entorno-cobertura">Listado departamental de la fuente IDEC; no indica que existan estos trazados en el municipio seleccionado.</p>
      <div className="entorno-tramos" aria-label="Corredores férreos">{rail.features.length ? rail.features.map(f => <button key={f.properties.id} aria-pressed={tramo?.id === f.properties.id} onClick={() => setTramo(f.properties)}><span>{f.properties.nombre}</span><small>{f.properties.estado}</small></button>) : <p>La fuente no devolvió corredores. No confirma ausencia de infraestructura férrea.</p>}</div>
    </div>}
    <div className="entorno-consulta"><div><strong>Superficie de las vías</strong><p>{canQuery ? 'Consulta los tramos del área visible. El recuadro delimita la zona consultada.' : 'Acerca el mapa para consultar calles y vías de una zona pequeña.'}</p></div><button className="boton" disabled={!canQuery || loading} onClick={() => void consultar()}>{loading ? 'Consultando vías…' : 'Consultar zona visible'}</button></div>
    {error && <p className="entorno-aviso" role="alert">{error}</p>}
    {consulta && <div className="entorno-inventario" aria-busy={loading}>
      <p className="entorno-cobertura">{consulta.features.length.toLocaleString('es-CO')} tramos consultados · {fecha(consulta.consultado)}{consulta.parcial ? ' · Consulta parcial: acerca el mapa para obtener más detalle.' : ''}</p>
      <div className="entorno-categorias">{categorias.map(c => <label key={c.key}><input type="checkbox" checked={tipos.includes(c.key)} onChange={e => setTipos(old => e.target.checked ? [...old, c.key] : old.filter(t => t !== c.key))} /><i style={{ background: c.color }} /><span>{c.label} <b>{consulta.features.filter(f => f.properties.categoria === c.key).length}</b></span></label>)}</div>
      <label className="entorno-buscar">Buscar vía<input type="search" value={busqueda} placeholder="Nombre de la vía…" onChange={e => setBusqueda(e.target.value)} /></label>
      <div className="entorno-tramos">{!visibles.length ? <p>No hay tramos para estos filtros en la consulta. No significa que no existan vías.</p> : visibles.map(f => <button key={f.properties.id} onClick={() => enfocar(f)} aria-pressed={tramo?.id === f.properties.id}><span>{f.properties.nombre}</span><small>{f.properties.superficie}</small></button>)}</div>
    </div>}
    {tramo && <div className="entorno-ficha" aria-live="polite"><h3>{tramo.nombre}</h3><dl>{[['Tipo', tramo.tipo], ['Superficie registrada', tramo.superficie], ['Estado reportado en la fuente', tramo.estado], ['Regularidad registrada', tramo.suavidad], ['Puente', tramo.puente], ['Túnel', tramo.tunel], ['Ancho registrado', tramo.ancho], ['Referencia', tramo.referencia], ['Fuente', tramo.fuente]].filter(([, v]) => v).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="boton" onClick={() => setTramo(null)}>Cerrar ficha</button></div>}
    <p className="entorno-nota">“Sin pavimentar” describe la superficie registrada, no una obra pendiente. “Sin información” no permite inferir el estado. La red férrea muestra trazados de referencia; su presencia no confirma un servicio de tren activo.</p>
    <details className="entorno-fuentes"><summary>Fuentes de infraestructura y descarga</summary><p><a href={VIAS_ITEM} target="_blank" rel="noreferrer">IDEC · vías basadas en OpenStreetMap</a>. Datos consultados según el área visible; no es un inventario exhaustivo ni una inspección de campo. {consulta?.edicionFuente ? `Última edición de las capas: ${fecha(consulta.edicionFuente)}. Esa fecha no certifica la vigencia en campo.` : 'La vigencia de cada tramo no está certificada.'} <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0 según la publicación IDEC</a>.</p><p><a href={FERREA_ITEM} target="_blank" rel="noreferrer">IDEC · red férrea de Cundinamarca, publicación 2024</a>. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Se normalizan los atributos para consulta; no se verifica la operación actual.</p><p>Para determinar necesidades de pavimentación se requiere un inventario vial municipal actualizado o verificación en campo. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Reportar un problema del mapa base</a>.</p><button className="boton" onClick={() => void descargar()} disabled={!areas.length || descargando}>{descargando ? "Preparando descarga…" : "Descargar límites GeoJSON"}</button>{downloadError && <p role="alert">{downloadError}</p>}</details>
  </div>
}
