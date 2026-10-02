import { afterEach, describe, expect, it, vi } from 'vitest'
import { clasificarSuperficie, consultarFerrea, consultarVias, recortarLinea, validarCaja, type Caja } from './infrastructure.js'

const caja: Caja = [-74.6, 4.5, -74.5, 4.6]
const geometry = { type: 'LineString', coordinates: [[-74.7, 4.55], [-74.4, 4.55]] }
afterEach(() => vi.unstubAllGlobals())

describe('infraestructura pública sin inferencias de estado', () => {
  it('separa ausencia, superficie explícita y valores no interpretados', () => {
    expect(clasificarSuperficie(' ')).toBe('sin-informacion')
    expect(clasificarSuperficie('Sin_Pavimentar')).toBe('sin-pavimentar')
    expect(clasificarSuperficie('Afirmado')).toBe('sin-pavimentar')
    expect(clasificarSuperficie('Asfalto')).toBe('pavimentada')
    expect(clasificarSuperficie('Concreto')).toBe('pavimentada')
    expect(clasificarSuperficie('Por inspeccionar')).toBe('otra')
    expect(clasificarSuperficie(0)).toBe('otra')
  })
  it('rechaza zonas amplias, invertidas, no numéricas o fuera de Cundinamarca', () => {
    expect(() => validarCaja(caja)).not.toThrow()
    for (const b of [[-74.7, 4.5, -74.4, 4.6], [-74.5, 4.5, -74.6, 4.6], [-76, 4.5, -75.9, 4.6], [-74.6, NaN, -74.5, 4.6]]) expect(() => validarCaja(b as Caja)).toThrow()
  })
  it('recorta segmentos cruzados y conserva múltiples partes; excluye vías ajenas a la zona', () => {
    expect(recortarLinea({ type: 'LineString', coordinates: geometry.coordinates }, caja)?.coordinates[0]).toEqual([[-74.6, 4.55], [-74.5, 4.55]])
    expect(recortarLinea({ type: 'LineString', coordinates: [[-74.6, 4.4], [-74.5, 4.4]] }, caja)).toBeNull()
    const multiple = recortarLinea({ type: 'MultiLineString', coordinates: [geometry.coordinates, [[-74.55, 4.4], [-74.55, 4.7]]] }, caja)
    expect(multiple?.coordinates).toHaveLength(2)
  })
  it('consulta fuentes fijas y declara truncamiento o geometrías no disponibles', async () => {
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/query?')
      ? { type: 'FeatureCollection', properties: { exceededTransferLimit: true }, features: [{ type: 'Feature', geometry, properties: { OBJECTID_1: 7, Nombre: 'Vía pública', Superficie: ' ' } }, { type: 'Feature', geometry: null, properties: {} }] }
      : { name: 'Vías', fields: ['OBJECTID_1', 'Nombre', 'Superficie'].map(name => ({ name })), editingInfo: { lastEditDate: 1700000000000 } } }))
    vi.stubGlobal('fetch', fetcher)
    const result = await consultarVias(caja, new AbortController().signal)
    expect(result.features).toHaveLength(6)
    expect(result.parcial).toBe(true)
    expect(result.features.every(f => f.properties.categoria === 'sin-informacion')).toBe(true)
    expect(fetcher.mock.calls).toHaveLength(12)
    for (const [url] of fetcher.mock.calls) {
      expect(url).toContain('services7.arcgis.com/lsxbLWF2l19Rmhqj/')
      expect(url).not.toContain('tenant')
      if (url.includes('/query?')) expect(new URL(url).searchParams.get('outFields')).toBe('OBJECTID_1,Nombre,Superficie')
    }
  })
  it('un fallo de una capa no se presenta como inventario vacío o completo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    await expect(consultarVias(caja, new AbortController().signal)).rejects.toThrow()
  })
  it('declara una consulta parcial al alcanzar el presupuesto de respuesta', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/query?')
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry, properties: { OBJECTID_1: 1, Nombre: 'A'.repeat(1_000_000) } }] }
      : { name: 'Vías', fields: [{ name: 'OBJECTID_1' }, { name: 'Nombre' }] } })))
    const result = await consultarVias(caja, new AbortController().signal)
    expect(result.parcial).toBe(true)
    expect(result.features).toHaveLength(0)
  })
  it('no oculta el truncamiento de la red férrea ni su falta de información de operación', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [], exceededTransferLimit: true }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry, properties: { FID: 1, Nombre: 'Corredor de referencia', ESTADO: ' ' } }] }) })
    vi.stubGlobal('fetch', fetcher)
    await expect(consultarFerrea(new AbortController().signal)).rejects.toThrow()
    expect((await consultarFerrea(new AbortController().signal)).features[0]?.properties.estado).toBe('Sin información de operación')
  })
})
