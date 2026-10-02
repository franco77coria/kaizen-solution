import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson'

export const VIAS_URL = 'https://services7.arcgis.com/lsxbLWF2l19Rmhqj/arcgis/rest/services/Vias_Cundinamarca_Editadas_WFL1/FeatureServer'
export const FERREA_URL = 'https://services7.arcgis.com/lsxbLWF2l19Rmhqj/arcgis/rest/services/ANIRedFerreaNuevaCundinmarca/FeatureServer/0'
export const VIAS_ITEM = 'https://www.arcgis.com/home/item.html?id=9fa7809f46cb41e6bd331f77dcd109a5'
export const FERREA_ITEM = 'https://www.arcgis.com/home/item.html?id=64449b63d6444865be5cc077afcc4a58'
export type Superficie = 'pavimentada' | 'sin-pavimentar' | 'otra' | 'sin-informacion'
export interface Tramo {
  id: string; nombre: string; tipo: string; superficie: string; categoria: Superficie
  suavidad: string; puente: string; tunel: string; ancho: string; referencia: string
  estado: string; fuente: 'IDEC · vías basadas en OpenStreetMap' | 'IDEC · red férrea 2024'
}
export type TramoGeo = Feature<LineString | MultiLineString, Tramo>
export interface ConsultaVias { features: TramoGeo[]; parcial: boolean; consultado: string; edicionFuente: number | null }
export type Caja = [oeste: number, sur: number, este: number, norte: number]
const limpiar = (v: unknown) => typeof v === 'string' ? v.trim().replace(/_/g, ' ') : typeof v === 'number' ? String(v) : ''
const normalizar = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Sólo clasifica superficies explícitas. Ni la jerarquía vial ni un vacío indican pavimento. */
export function clasificarSuperficie(v: unknown): Superficie {
  const s = normalizar(limpiar(v))
  if (!s || ['unknown', 'desconocido', 'sin informacion', 'no data', 'n/a'].includes(s)) return 'sin-informacion'
  if (['sin pavimentar', 'unpaved', 'afirmado', 'grava', 'gravel', 'fine gravel', 'compacted', 'tierra', 'dirt', 'ground', 'earth', 'sand', 'arena', 'mud'].includes(s)) return 'sin-pavimentar'
  if (['pavimentado', 'pavimentada', 'paved', 'asfalto', 'asphalt', 'concreto', 'concrete', 'concrete plates', 'concrete lanes', 'adoquin', 'adoquines', 'paving stones', 'cobblestone', 'sett'].includes(s)) return 'pavimentada'
  return 'otra'
}

export function validarCaja(caja: Caja): void {
  const [w, s, e, n] = caja
  if (!caja.every(Number.isFinite) || w >= e || s >= n || w < -75 || e > -73 || s < 3.6 || n > 6 || e - w > .16 || n - s > .16) throw new Error('Acerca el mapa a una zona de Cundinamarca para consultar sus vías.')
}

interface ArcGISPage {
  error?: unknown; type?: string; features?: Feature[]; exceededTransferLimit?: boolean
  properties?: { exceededTransferLimit?: boolean }; fields?: Array<{ name: string }>
  name?: string; editingInfo?: { lastEditDate?: number }
}
async function leer(url: string, signal: AbortSignal): Promise<ArcGISPage> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('La fuente de infraestructura no está disponible. Intenta nuevamente.')
  const data = await response.json() as ArcGISPage
  if (data.error) throw new Error('La fuente de infraestructura no pudo responder. Intenta nuevamente.')
  return data
}

function geometriaValida(g: unknown): g is LineString | MultiLineString {
  if (!g || typeof g !== 'object') return false
  const geo = g as LineString | MultiLineString
  const lines = geo.type === 'LineString' ? [geo.coordinates] : geo.type === 'MultiLineString' ? geo.coordinates : []
  return lines.length > 0 && lines.every(line => Array.isArray(line) && line.length >= 2 && line.every(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]!) <= 180 && Math.abs(p[1]!) <= 90))
}

/** Recorta a la caja consultada; una vía que la cruza no extiende la consulta a todo su trazado. */
export function recortarLinea(g: LineString | MultiLineString, [w, s, e, n]: Caja): MultiLineString | null {
  const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates
  const out: number[][][] = []
  for (const line of lines) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!, dx = b[0]! - a[0]!, dy = b[1]! - a[1]!
    let start = 0, end = 1, valid = true
    const p = [-dx, dx, -dy, dy], q = [a[0]! - w, e - a[0]!, a[1]! - s, n - a[1]!]
    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) { if (q[k]! < 0) valid = false; continue }
      const r = q[k]! / p[k]!
      if (p[k]! < 0) start = Math.max(start, r); else end = Math.min(end, r)
    }
    if (valid && start < end) {
      const first = [a[0]! + dx * start, a[1]! + dy * start], last = [a[0]! + dx * end, a[1]! + dy * end]
      const previous = out.at(-1)
      if (previous && previous.at(-1)![0] === first[0] && previous.at(-1)![1] === first[1]) previous.push(last)
      else out.push([first, last])
    }
  }
  return out.length ? { type: 'MultiLineString', coordinates: out } : null
}

/** La consulta envía únicamente el área pública del mapa, nunca registros o coordenadas de personas. */
export async function consultarVias(caja: Caja, signal: AbortSignal): Promise<ConsultaVias> {
  validarCaja(caja)
  const result: ConsultaVias = { features: [], parcial: false, consultado: new Date().toISOString(), edicionFuente: null }
  let bytes = 0
  // Seis capas fijas publicadas por IDEC. Límite explícito por consulta; sin descarga masiva.
  for (const layer of [0, 1, 2, 3, 4, 5]) {
    const metadata = await leer(`${VIAS_URL}/${layer}?f=json`, signal)
    const fields = (metadata.fields ?? []).map((f: { name: string }) => f.name)
    const desired = ['OBJECTID_1', 'OBJECTID', 'Nombre', 'Nombre_Alt', 'Tipo_de_Vi', 'Superficie', 'Suavidad_S', 'Puente', 'Tunel', 'Ancho', 'Referencia']
    const params = new URLSearchParams({ f: 'geojson', where: '1=1', outFields: desired.filter(f => fields.includes(f)).join(','), geometry: caja.join(','), geometryType: 'esriGeometryEnvelope', inSR: '4326', outSR: '4326', spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'true', resultRecordCount: '1000', geometryPrecision: '6' })
    const page = await leer(`${VIAS_URL}/${layer}/query?${params}`, signal)
    if (page.type !== 'FeatureCollection' || !Array.isArray(page.features)) throw new Error('La fuente devolvió una capa incompleta. Intenta nuevamente.')
    result.parcial ||= Boolean(page.exceededTransferLimit || page.properties?.exceededTransferLimit || page.features.length >= 1000)
    const edited = metadata.editingInfo?.lastEditDate
    if (typeof edited === 'number') result.edicionFuente = Math.max(result.edicionFuente ?? 0, edited)
    const seen = new Set<string>()
    for (const [i, f] of page.features.entries()) {
      if (!geometriaValida(f.geometry)) { result.parcial = true; continue }
      const geometry = recortarLinea(f.geometry, caja)
      if (!geometry) continue
      const p = f.properties ?? {}
      const id = `${layer}:${p.OBJECTID_1 ?? p.OBJECTID ?? i}`
      if (seen.has(id)) continue
      seen.add(id)
      const feature: TramoGeo = { type: 'Feature', geometry, properties: { id, nombre: limpiar(p.Nombre) || limpiar(p.Nombre_Alt) || 'Tramo sin nombre', tipo: limpiar(p.Tipo_de_Vi) || metadata.name || 'Vía', superficie: limpiar(p.Superficie) || 'Sin información', categoria: clasificarSuperficie(p.Superficie), suavidad: limpiar(p.Suavidad_S), puente: limpiar(p.Puente), tunel: limpiar(p.Tunel), ancho: limpiar(p.Ancho), referencia: limpiar(p.Referencia), estado: '', fuente: 'IDEC · vías basadas en OpenStreetMap' } }
      // Presupuesto conservador para la respuesta embebida de Vercel; el corte se informa.
      bytes += JSON.stringify(feature).length * 3
      if (bytes > 3_000_000) { result.parcial = true; return result }
      result.features.push(feature)
    }
  }
  return result
}

export async function consultarFerrea(signal: AbortSignal): Promise<FeatureCollection<LineString | MultiLineString, Tramo>> {
  const params = new URLSearchParams({ f: 'geojson', where: '1=1', outFields: 'FID,TRAMO,ESTADO,Nombre', outSR: '4326', returnGeometry: 'true', resultRecordCount: '1000', geometryPrecision: '6' })
  const page = await leer(`${FERREA_URL}/query?${params}`, signal)
  if (page.type !== 'FeatureCollection' || !Array.isArray(page.features) || page.exceededTransferLimit || page.properties?.exceededTransferLimit || page.features.length >= 1000) throw new Error('La capa férrea está incompleta. Consulta la fuente IDEC.')
  if (page.features.some(f => !geometriaValida(f.geometry))) throw new Error('La capa férrea contiene geometrías no disponibles.')
  return { type: 'FeatureCollection', features: page.features.filter((f: Feature) => geometriaValida(f.geometry)).map((f: Feature, i: number) => {
    const p = f.properties ?? {}
    return { type: 'Feature', geometry: f.geometry as LineString | MultiLineString, properties: { id: `ferrea:${p.FID ?? i}`, nombre: limpiar(p.Nombre) || limpiar(p.TRAMO) || 'Tramo férreo', tipo: 'Vía férrea', superficie: 'No aplica', categoria: 'sin-informacion', suavidad: '', puente: '', tunel: '', ancho: '', referencia: limpiar(p.TRAMO), estado: limpiar(p.ESTADO) || 'Sin información de operación', fuente: 'IDEC · red férrea 2024' } }
  }) }
}
