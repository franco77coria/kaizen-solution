import { describe, expect, it } from 'vitest'
import { CUNDINAMARCA_MUNICIPALITIES } from './catalog.js'
import {
  CUNDINAMARCA_PROVINCES,
  EXPECTED_PROVINCE_COUNT,
  PROVINCE_SOURCE_STATUS,
  displayName,
  provinceOf,
} from './provinces.js'

/**
 * La mayoria de estas invariantes ya se comprueban al cargar el modulo. Se
 * repiten aca para que un cambio que las rompa aparezca como prueba fallida con
 * nombre, y no solo como un proceso que no arranca.
 */
describe('provincias de Cundinamarca', () => {
  it('son exactamente 15', () => {
    expect(CUNDINAMARCA_PROVINCES).toHaveLength(EXPECTED_PROVINCE_COUNT)
  })

  it('cada municipio esta en una y solo una provincia', () => {
    const vistos = CUNDINAMARCA_PROVINCES.flatMap((p) => p.municipalityCodes)
    expect(vistos).toHaveLength(CUNDINAMARCA_MUNICIPALITIES.length)
    expect(new Set(vistos).size).toBe(vistos.length)
    for (const m of CUNDINAMARCA_MUNICIPALITIES) expect(provinceOf(m.code)).not.toBeNull()
  })

  it('los tamanos coinciden con la division departamental transcrita', () => {
    const tamanos = Object.fromEntries(
      CUNDINAMARCA_PROVINCES.map((p) => [p.id, p.municipalityCodes.length]),
    )
    expect(tamanos).toEqual({
      almeidas: 7,
      alto_magdalena: 8,
      bajo_magdalena: 3,
      gualiva: 12,
      guavio: 8,
      magdalena_centro: 7,
      medina: 2,
      oriente: 10,
      rionegro: 8,
      sabana_centro: 11,
      sabana_occidente: 8,
      soacha: 2,
      sumapaz: 10,
      tequendama: 10,
      ubate: 10,
    })
  })

  it('declara que esta pendiente de cotejo', () => {
    // Si alguien la coteja contra el acto administrativo, este valor cambia a
    // proposito. No es un detalle cosmetico: es lo que evita usarla con datos
    // reales antes de tiempo.
    expect(PROVINCE_SOURCE_STATUS).toBe('pendiente_de_cotejo')
  })
})

describe('nombres para mostrar', () => {
  it('restaura tildes sin cambiar de municipio', () => {
    expect(displayName('25899')).toBe('Zipaquirá')
    expect(displayName('25175')).toBe('Chía')
    expect(displayName('25258')).toBe('El Peñón')
  })

  it('deja igual lo que no lleva tilde', () => {
    expect(displayName('25754')).toBe('Soacha')
  })
})
