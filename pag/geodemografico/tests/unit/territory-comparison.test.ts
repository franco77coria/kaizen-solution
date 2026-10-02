import { describe, expect, it } from 'vitest'
import { compararTerritorios, valorVisible } from '../../apps/web/src/comparacionTerritorial'
import type { CeldaAnalitica } from '../../apps/web/src/api'

const celda = (key: string, value: number | null, suppressed = false): CeldaAnalitica => ({ key, label: key, value, suppressed })

describe('comparación territorial sin reconstruir cifras protegidas', () => {
  it('no convierte una cifra reservada en medida, aunque llegue un valor numérico', () => {
    expect(valorVisible(celda('reservada', 99999, true))).toBeNull()
    const grafico = compararTerritorios([celda('visible', 8), celda('reservada', 99999, true)], [celda('visible', 6), celda('reservada', null, true)], 'records')
    expect(grafico.maximo).toBe(8)
    expect(grafico.filas.find(r => r.key === 'reservada')).toMatchObject({ registros: null, referidos: null })
  })
  it('compara las dos medidas independientes y permite cambiar el orden', () => {
    const registros = [celda('A', 20), celda('B', 8)]
    const referidos = [celda('A', 0), celda('B', 6)]
    expect(compararTerritorios(registros, referidos, 'records').filas.map(r => r.key)).toEqual(['A', 'B'])
    const grafico = compararTerritorios(registros, referidos, 'referrals')
    expect(grafico.filas.map(r => r.key)).toEqual(['B', 'A'])
    expect(grafico.maximo).toBe(20)
    expect(grafico.filas[0]).toMatchObject({ registros: 8, referidos: 6 })
  })
  it('distingue cero de no disponible y no inventa barras para un período vacío', () => {
    expect(valorVisible(celda('cero', 0))).toBe(0)
    expect(valorVisible(undefined)).toBeNull()
    expect(compararTerritorios([celda('A', 0)], [celda('A', 0)], 'records').filas).toEqual([])
  })
})
