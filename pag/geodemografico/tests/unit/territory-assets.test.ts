import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { CUNDINAMARCA_MUNICIPALITIES, VEREDAS, veredasOf } from '@kaizen/geography'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

describe('cartografía publicada y catálogo de captura', () => {
  it('la vista ligera conserva códigos, componentes, atribución y áreas de la fuente', async () => {
    const root = new URL('../../apps/web/public/geo/', import.meta.url)
    const archivos = ['municipios.json', ...CUNDINAMARCA_MUNICIPALITIES.map(m => `veredas/${m.code}.json`)]
    type Capa = FeatureCollection<Polygon | MultiPolygon, { code: string; areaHa?: number; vintage: string }> & { source: unknown }
    for (const archivo of archivos) {
      const original = JSON.parse(await readFile(new URL(archivo, root), 'utf8')) as Capa
      const vista = JSON.parse(await readFile(new URL(`vista/${archivo}`, root), 'utf8')) as Capa
      expect(vista.source).toEqual(original.source)
      expect(vista.features.map(f => f.properties.code)).toEqual(original.features.map(f => f.properties.code))
      for (let i = 0; i < original.features.length; i++) {
        const fuente = original.features[i]!, dibujo = vista.features[i]!
        const partes = (g: Polygon | MultiPolygon) => g.type === 'Polygon' ? 1 : g.coordinates.length
        expect(partes(dibujo.geometry)).toBe(partes(fuente.geometry))
        expect(dibujo.properties.vintage).toBe(fuente.properties.vintage)
        expect(dibujo.properties.areaHa).toBeGreaterThan(0)
        const polygons = dibujo.geometry.type === 'Polygon' ? [dibujo.geometry.coordinates] : dibujo.geometry.coordinates
        for (const polygon of polygons) for (const ring of polygon) {
          expect(ring.length).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring.at(-1))
        }
      }
    }
  })
  it('cubre los 116 códigos y todas las veredas sin códigos ajenos ni duplicados', async () => {
    const root = new URL('../../apps/web/public/geo/', import.meta.url)
    const municipal = JSON.parse(await readFile(new URL('municipios.json', root), 'utf8'))
    expect(municipal.features.map((f: { properties: { code: string } }) => f.properties.code).sort()).toEqual(CUNDINAMARCA_MUNICIPALITIES.map(m => m.code).sort())
    const codes: string[] = []
    for (const m of CUNDINAMARCA_MUNICIPALITIES) {
      const rural = JSON.parse(await readFile(new URL(`veredas/${m.code}.json`, root), 'utf8'))
      expect(rural.source.license).toBe('CC BY 4.0')
      expect(rural.features.map((f: { properties: { code: string } }) => f.properties.code).sort()).toEqual(veredasOf(m.code).map(v => v.code).sort())
      for (const f of rural.features) {
        expect(f.properties.municipalityCode).toBe(m.code)
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type)
        const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        for (const polygon of polygons) for (const ring of polygon) {
          expect(ring.length).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring.at(-1))
          expect(ring.every(([lng, lat]: number[]) => lng! >= -75 && lng! <= -72 && lat! >= 3 && lat! <= 7)).toBe(true)
        }
        codes.push(f.properties.code)
      }
    }
    expect(codes).toHaveLength(2578)
    expect(new Set(codes).size).toBe(VEREDAS.length)
    expect(veredasOf('25035')).toHaveLength(27)
    // Ubalá tiene dos sectores: ningún componente se pierde al consolidar.
    expect(municipal.features.find((f: { properties: { code: string } }) => f.properties.code === '25839').geometry.type).toBe('MultiPolygon')
  })
})
