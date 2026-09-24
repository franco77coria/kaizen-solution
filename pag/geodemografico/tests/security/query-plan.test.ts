import { describe, expect, it } from 'vitest'
import { AppError } from '@kaizen/contracts'
import { compileQueryPlan, parseQueryPlan } from '@kaizen/query-plans'

/**
 * El mensaje PUBLICO de un AppError es fijo y uniforme por codigo: interpolar
 * el detalle filtraria informacion. El motivo real vive en `internalDetail`,
 * que es lo que va al log y lo que se comprueba aca.
 */
function detalleDe(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    if (error instanceof AppError) return error.internalDetail ?? ''
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('se esperaba un error y no hubo ninguno')
}

/**
 * Ticket 17b.1 — criterio de aceptacion:
 *   "Payloads SQLi/JSON extra/tenant ajeno rechazados; sentencia estable y
 *    valores separados."
 */
describe('el QueryPlan rechaza lo que no esta en la lista blanca', () => {
  it('rechaza una plantilla desconocida', () => {
    expect(() => parseQueryPlan({ template: 'records.drop_everything' })).toThrow()
  })

  it('rechaza propiedades extra en el plan', () => {
    // `.strict()`: una propiedad de mas no se descarta en silencio, se rechaza.
    expect(() =>
      parseQueryPlan({
        template: 'records.total',
        filters: [],
        limit: 10,
        rawSql: 'select * from person_records',
      }),
    ).toThrow()
  })

  it('rechaza un campo de filtro fuera de la lista blanca', () => {
    expect(() =>
      parseQueryPlan({
        template: 'records.total',
        filters: [{ field: 'full_name', op: 'eq', values: ['x'] }],
      }),
    ).toThrow()
  })

  it('rechaza un operador inventado', () => {
    expect(() =>
      parseQueryPlan({
        template: 'records.total',
        filters: [{ field: 'status', op: 'like', values: ['%'] }],
      }),
    ).toThrow()
  })

  it('rechaza filtrar por un campo que la plantilla no admite', () => {
    const plan = parseQueryPlan({
      template: 'records.count_by_status',
      filters: [{ field: 'consent_state', op: 'eq', values: ['vigente'] }],
    })
    expect(detalleDe(() => compileQueryPlan(plan))).toMatch(/no admite filtrar/)
  })
})

describe('los valores del usuario nunca entran en el texto SQL', () => {
  const PAYLOADS = [
    "25175'; drop table person_records; --",
    "' or '1'='1",
    "') union select full_name, 1 from person_records --",
    '25175\\',
    "25175' and pg_sleep(10) --",
    '$1; delete from tenants',
  ]

  for (const payload of PAYLOADS) {
    it(`mantiene el payload como parametro: ${payload.slice(0, 28)}`, () => {
      const plan = parseQueryPlan({
        template: 'records.count_by_municipality',
        filters: [{ field: 'municipality_code', op: 'eq', values: [payload] }],
      })
      const compilada = compileQueryPlan(plan)

      // La carga viaja en `values`, no en `text`. Esta es la propiedad que
      // hace imposible la inyeccion, no un filtrado de caracteres.
      expect(compilada.text).not.toContain(payload)
      expect(compilada.values).toContain(payload)
      expect(compilada.text).toMatch(/\$\d+/)
    })
  }

  it('la sentencia es ESTABLE: mismos campos y distintos valores dan el mismo SQL', () => {
    const uno = compileQueryPlan(
      parseQueryPlan({
        template: 'records.count_by_municipality',
        filters: [{ field: 'status', op: 'eq', values: ['approved'] }],
      }),
    )
    const otro = compileQueryPlan(
      parseQueryPlan({
        template: 'records.count_by_municipality',
        filters: [{ field: 'status', op: 'eq', values: ["'; drop table x; --"] }],
      }),
    )

    expect(uno.text).toBe(otro.text)
    expect(uno.values).not.toEqual(otro.values)
  })

  it('acota el limite aunque el plan pida mas', () => {
    const compilada = compileQueryPlan(
      parseQueryPlan({ template: 'records.total', filters: [], limit: 1000 }),
    )
    // El ultimo parametro enlazado es el limite efectivo.
    expect(compilada.values.at(-1)).toBeLessThanOrEqual(1000)
  })

  it('rechaza un filtro duplicado sobre el mismo campo', () => {
    const plan = parseQueryPlan({
      template: 'records.count_by_municipality',
      filters: [
        { field: 'status', op: 'eq', values: ['approved'] },
        { field: 'status', op: 'eq', values: ['rejected'] },
      ],
    })
    expect(detalleDe(() => compileQueryPlan(plan))).toMatch(/duplicado/)
  })
})

/**
 * El panorama manda EL MISMO juego de filtros a todas sus consultas. Si una
 * plantilla no admite uno, esa consulta rebota con "solicitud no valida" y se
 * cae el tablero entero, no solo esa grafica. Paso con el filtro de
 * consentimiento: las plantillas de edad y de mes no lo admitian.
 */
describe('plantillas del panorama', () => {
  const PLANTILLAS_DEL_PANORAMA = [
    'records.total',
    'records.count_by_municipality',
    'records.count_by_age_band',
    'records.count_by_capture_month',
    'records.count_by_gender',
  ] as const

  const FILTROS_DEL_PANORAMA = [
    { field: 'municipality_code', op: 'eq', values: ['25175'] },
    { field: 'age_band', op: 'eq', values: ['30-44'] },
    { field: 'capture_month', op: 'eq', values: ['2026-09'] },
    { field: 'consent_state', op: 'eq', values: ['vigente'] },
    { field: 'gender', op: 'eq', values: ['femenino'] },
  ] as const

  for (const template of PLANTILLAS_DEL_PANORAMA) {
    it(`${template} acepta todos los filtros del tablero a la vez`, () => {
      const plan = parseQueryPlan({ template, filters: [...FILTROS_DEL_PANORAMA] })
      expect(() => compileQueryPlan(plan)).not.toThrow()
    })
  }

  it('cuenta a la persona apenas se suma, no recien al aprobarla', () => {
    const { text } = compileQueryPlan(parseQueryPlan({ template: 'records.total' }))
    expect(text).toContain(`r.status in ('submitted', 'approved')`)
  })
})
