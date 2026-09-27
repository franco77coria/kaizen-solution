import { describe, expect, it } from 'vitest'
import { aplicarSupresion } from '@kaizen/query-plans'

/**
 * Regla del plan: "Un grupo suprimido no aparece como cero."
 * Es la diferencia entre "no hay nadie en ese municipio" y "hay tan pocos que
 * publicarlo los identificaria".
 */
describe('supresion por umbral de anonimato', () => {
  it('un grupo suprimido lleva value null y suppressed true, nunca 0', () => {
    const salida = aplicarSupresion([
      { grupo: 'A', cantidad: 20 },
      { grupo: 'B', cantidad: 15 },
      { grupo: 'C', cantidad: 3 },
      { grupo: 'D', cantidad: 2 },
    ])

    const c = salida.rows.find((r) => r.key === 'C')
    expect(c?.suppressed).toBe(true)
    expect(c?.value).toBeNull()
    // La comprobacion que importa: NO es cero.
    expect(c?.value).not.toBe(0)
  })

  it('no suprime grupos por encima del umbral', () => {
    const salida = aplicarSupresion([
      { grupo: 'A', cantidad: 20 },
      { grupo: 'B', cantidad: 5 },
    ])
    expect(salida.suppressedGroups).toBe(0)
    expect(salida.rows.every((r) => !r.suppressed)).toBe(true)
  })

  it('cuando queda UN solo grupo suprimido, suprime tambien otro', () => {
    // Si se publica todo menos un grupo y se conoce el total, el grupo
    // suprimido se reconstruye por resta. Hay que romper esa resta.
    const salida = aplicarSupresion([
      { grupo: 'A', cantidad: 20 },
      { grupo: 'B', cantidad: 15 },
      { grupo: 'C', cantidad: 10 },
      { grupo: 'D', cantidad: 2 },
    ])

    expect(salida.suppressedGroups).toBe(2)
    expect(salida.rows.find((r) => r.key === 'D')?.suppressed).toBe(true)
    // El complemento suprimido es el publicado mas chico.
    expect(salida.rows.find((r) => r.key === 'C')?.suppressed).toBe(true)
    expect(salida.rows.find((r) => r.key === 'A')?.suppressed).toBe(false)
  })

  it('usa la etiqueta legible sin perder la clave', () => {
    const salida = aplicarSupresion(
      [{ grupo: '25175', cantidad: 9 }],
      (g) => (g === '25175' ? 'Chia' : g),
    )
    expect(salida.rows[0]?.key).toBe('25175')
    expect(salida.rows[0]?.label).toBe('Chia')
  })
})
