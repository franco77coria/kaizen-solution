import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { CUNDINAMARCA_MUNICIPALITIES, displayName, provinceOf } from '@kaizen/geography'

/**
 * La migracion 0020 lleva los 116 municipios como filas literales: una
 * migracion no puede importar codigo. Esta prueba es lo que impide que esa
 * copia y el paquete de geografia diverjan. Si alguien corrige un nombre o una
 * provincia en el paquete, hay que regenerar la migracion con
 * `node scripts/generar-catalogo-sql.mjs`.
 */
describe('catalogo de la migracion 0020', () => {
  it('coincide fila por fila con el paquete de geografia', async () => {
    const sql = await readFile('packages/db/migrations/0020_catalogo_territorial.sql', 'utf8')
    const filas = [...sql.matchAll(/\('(\d{5})', '([^']*)', '([^']*)', '([a-z_]+)', '([^']*)'\)/g)]

    expect(filas).toHaveLength(CUNDINAMARCA_MUNICIPALITIES.length)

    const esperado = CUNDINAMARCA_MUNICIPALITIES.map((m) => {
      const p = provinceOf(m.code)!
      return [m.code, m.name, displayName(m.code), p.id, p.name]
    })
    expect(filas.map((f) => f.slice(1, 6))).toEqual(esperado)
  })
})
