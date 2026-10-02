import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GraficoTerritorial } from './GraficoTerritorial'
import type { ResumenTerritorial } from './api'

const props = { registros: null, referidos: null, medida: 'records' as const, unidad: 'provincias', seleccionado: '', onSeleccionar: () => {}, error: '', onReintentar: () => {} }
describe('recuperación de la comparación territorial', () => {
  it('termina la espera y ofrece recuperación cuando falla la consulta', () => {
    const html = renderToStaticMarkup(createElement(GraficoTerritorial, { ...props, error: 'Cifras no disponibles' }))
    expect(html).toContain('aria-busy="false"')
    expect(html).toContain('Reintentar comparación')
    expect(html).not.toContain('Consultando comparación')
  })
  it('conserva el estado de carga mientras una medida todavía no llega', () => {
    const html = renderToStaticMarkup(createElement(GraficoTerritorial, props))
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Consultando comparación')
  })
  it('la ausencia de registros no se presenta como error o carga', () => {
    const resumen: ResumenTerritorial = { level: 'province', metric: 'records', rows: [], total: { key: 'total', label: 'Total', value: 0, suppressed: false }, unassigned: { key: 'sin', label: 'Sin asignar', value: 0, suppressed: false }, coveredAreas: 0, areaCount: 15, suppressionThreshold: 5, executedAt: '2026-10-02T00:00:00Z' }
    const html = renderToStaticMarkup(createElement(GraficoTerritorial, { ...props, registros: resumen, referidos: { ...resumen, metric: 'referrals' } }))
    expect(html).toContain('aria-busy="false"')
    expect(html).toContain('No hay registros para comparar')
    expect(html).not.toContain('Reintentar comparación')
  })
})
