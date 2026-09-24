import { describe, expect, it } from 'vitest'
import {
  CUNDINAMARCA_MUNICIPALITIES,
  DEPARTMENT_CODE,
  EXCLUDED_CODES,
  EXPECTED_MUNICIPALITY_COUNT,
  findByName,
  findMunicipality,
} from './catalog.js'

/**
 * Ticket 17d.1 — criterio de aceptacion:
 *   "Bogota fuera; homonimos/CRS/procedencia verificados; ausencia de
 *    poligonos declarada."
 */
describe('catalogo de Cundinamarca', () => {
  it('tiene exactamente 116 municipios', () => {
    // 116, no 126. El numero 126 del supuesto inicial era un error y se
    // conserva solo como objetivo de capacidad de la prueba de carga.
    expect(CUNDINAMARCA_MUNICIPALITIES).toHaveLength(EXPECTED_MUNICIPALITY_COUNT)
    expect(EXPECTED_MUNICIPALITY_COUNT).toBe(116)
  })

  it('todos los codigos son del departamento 25', () => {
    const ajenos = CUNDINAMARCA_MUNICIPALITIES.filter((m) => !m.code.startsWith(DEPARTMENT_CODE))
    expect(ajenos).toEqual([])
  })

  it('Bogota D.C. queda explicitamente fuera', () => {
    expect(EXCLUDED_CODES).toContain('11001')
    expect(findMunicipality('11001')).toBeNull()
    expect(CUNDINAMARCA_MUNICIPALITIES.some((m) => m.code === '11001')).toBe(false)
  })

  it('no hay codigos repetidos', () => {
    const codigos = CUNDINAMARCA_MUNICIPALITIES.map((m) => m.code)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('ningun municipio queda sin nombre', () => {
    expect(CUNDINAMARCA_MUNICIPALITIES.filter((m) => m.name.trim().length === 0)).toEqual([])
  })

  it('resuelve un municipio conocido por codigo', () => {
    expect(findMunicipality('25175')?.name).toBe('Chia')
    expect(findMunicipality('25899')?.name).toBe('Zipaquira')
  })

  it('la busqueda por nombre devuelve una LISTA, porque hay homonimos', () => {
    // Granada, San Bernardo, Ricaurte y San Francisco existen en varios
    // departamentos. El nombre nunca puede usarse como clave.
    const resultado = findByName('Granada')
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado.every((m) => m.code.startsWith('25'))).toBe(true)
  })

  it('la busqueda por nombre ignora acentos y mayusculas', () => {
    expect(findByName('CHÍA').map((m) => m.code)).toEqual(['25175'])
  })
})
