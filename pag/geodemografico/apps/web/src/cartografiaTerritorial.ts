import { geoArea } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { conBase } from './rutas'

export type AreaTerritorial = Feature<Polygon | MultiPolygon, { code: string; name: string; vintage: string; areaHa?: number }>
interface Capa extends FeatureCollection<Polygon | MultiPolygon, AreaTerritorial['properties']> { features: AreaTerritorial[] }
const cache = new Map<string, Promise<{ original: AreaTerritorial[]; dibujo: AreaTerritorial[] }>>()

// d3 usa el sentido esférico inverso a RFC 7946; el archivo público permanece intacto.
function paraD3(f: AreaTerritorial): AreaTerritorial {
  if (geoArea(f) < 2 * Math.PI) return f
  const g = f.geometry
  return { ...f, geometry: g.type === 'Polygon'
    ? { type: 'Polygon', coordinates: g.coordinates.map(r => [...r].reverse()) }
    : { type: 'MultiPolygon', coordinates: g.coordinates.map(p => p.map(r => [...r].reverse())) } }
}

export function leerCartografia(path: string) {
  const existente = cache.get(path)
  if (existente) return existente
  const pendiente = fetch(conBase(path)).then(async response => {
    if (!response.ok) throw new Error('Cartografía no disponible')
    const capa = await response.json() as Capa
    return { original: capa.features, dibujo: capa.features.map(paraD3) }
  }).catch(error => { cache.delete(path); throw error })
  // Sólo archivos públicos. Las cifras de personas nunca se almacenan aquí.
  if (cache.size >= 12) cache.delete(cache.keys().next().value!)
  cache.set(path, pendiente)
  return pendiente
}
