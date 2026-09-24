import { describe, expect, it } from 'vitest'
import { validateAnswer } from './validate.js'
import type { EvidenceChunk } from './types.js'

/**
 * Ticket 13 — criterio de aceptacion:
 *   "Sin evidencia se abstiene; IDs falsos rechazados; sin herramientas
 *    generales."
 *
 * Este validador asume que el modelo puede alucinar. Cada caso de abajo es una
 * forma concreta de alucinacion que llegaria al usuario como un hecho.
 */
const EVIDENCIA: EvidenceChunk[] = [
  {
    chunkId: '11111111-1111-4111-8111-000000000001',
    documentId: '22222222-2222-4222-8222-000000000001',
    documentVersionId: '33333333-3333-4333-8333-000000000001',
    title: 'Comite de obras',
    section: 'Acuerdos',
    meetingAt: '2026-03-04T14:00:00Z',
    artifactType: 'meeting_notes',
    content: 'Se aprobo el presupuesto de pavimentacion por 420 millones de pesos.',
  },
]

const CITA_VALIDA = {
  chunkId: EVIDENCIA[0]!.chunkId,
  documentId: EVIDENCIA[0]!.documentId,
  documentVersionId: EVIDENCIA[0]!.documentVersionId,
  quote: 'Se aprobo el presupuesto de pavimentacion por 420 millones de pesos.',
}

describe('respuestas validas', () => {
  it('acepta una respuesta con una cita textual correcta', () => {
    const salida = validateAnswer(
      {
        abstained: false,
        answer: 'Se aprobaron 420 millones.',
        abstentionReason: '',
        citations: [CITA_VALIDA],
      },
      EVIDENCIA,
    )
    expect(salida.ok).toBe(true)
    expect(salida.problems).toEqual([])
  })

  it('acepta una abstencion sin citas', () => {
    const salida = validateAnswer(
      { abstained: true, answer: '', abstentionReason: 'No hay evidencia.', citations: [] },
      EVIDENCIA,
    )
    expect(salida.ok).toBe(true)
  })

  it('tolera diferencias de acentos y espacios en la cita', () => {
    const salida = validateAnswer(
      {
        abstained: false,
        answer: 'ok',
        abstentionReason: '',
        citations: [
          { ...CITA_VALIDA, quote: 'Se  aprobó   el presupuesto de pavimentación por 420 millones' },
        ],
      },
      EVIDENCIA,
    )
    expect(salida.ok).toBe(true)
  })
})

describe('alucinaciones rechazadas', () => {
  function esperarAbstencion(crudo: unknown, patron: RegExp): void {
    const salida = validateAnswer(crudo, EVIDENCIA)
    expect(salida.ok).toBe(false)
    // Degrada a ABSTENCION, no a mostrar la respuesta dudosa.
    expect(salida.answer.abstained).toBe(true)
    expect(salida.answer.citations).toEqual([])
    expect(salida.problems.join(' ')).toMatch(patron)
  }

  it('rechaza un chunkId que el servidor nunca entrego', () => {
    esperarAbstencion(
      {
        abstained: false,
        answer: 'Dato inventado.',
        abstentionReason: '',
        citations: [{ ...CITA_VALIDA, chunkId: '99999999-9999-4999-8999-000000000009' }],
      },
      /chunk inexistente/,
    )
  })

  it('rechaza un documentId que no corresponde al fragmento', () => {
    esperarAbstencion(
      {
        abstained: false,
        answer: 'x',
        abstentionReason: '',
        citations: [{ ...CITA_VALIDA, documentId: '99999999-9999-4999-8999-000000000009' }],
      },
      /documentId no coincide/,
    )
  })

  it('rechaza una version que no corresponde al fragmento', () => {
    esperarAbstencion(
      {
        abstained: false,
        answer: 'x',
        abstentionReason: '',
        citations: [{ ...CITA_VALIDA, documentVersionId: '99999999-9999-4999-8999-000000000009' }],
      },
      /versionId no coincide/,
    )
  })

  it('rechaza una cita que NO aparece en el fragmento', () => {
    // El caso mas peligroso: id correcto, texto inventado. Sin esta
    // comprobacion, la cita da credibilidad a una cifra que nadie dijo.
    esperarAbstencion(
      {
        abstained: false,
        answer: 'Se aprobaron 900 millones.',
        abstentionReason: '',
        citations: [{ ...CITA_VALIDA, quote: 'Se aprobo el presupuesto por 900 millones.' }],
      },
      /no aparece literalmente/,
    )
  })

  it('rechaza una afirmacion sin ninguna cita', () => {
    esperarAbstencion(
      { abstained: false, answer: 'Algo pasa.', abstentionReason: '', citations: [] },
      /sin ninguna cita/,
    )
  })

  it('rechaza JSON que no cumple el contrato', () => {
    esperarAbstencion({ respuesta: 'texto suelto' }, /schema/)
  })

  it('rechaza una respuesta vacia que no se declara abstencion', () => {
    esperarAbstencion(
      { abstained: false, answer: '   ', abstentionReason: '', citations: [CITA_VALIDA] },
      /respuesta vacia/,
    )
  })

  it('no acepta campos extra que intenten inyectar acciones', () => {
    // Un modelo no puede ampliar el contrato: `toolCalls` o `sqlQuery` no
    // existen en el schema y su presencia no habilita nada.
    const salida = validateAnswer(
      {
        abstained: false,
        answer: 'ok',
        abstentionReason: '',
        citations: [CITA_VALIDA],
        toolCalls: [{ name: 'fetch', url: 'https://exfiltracion.example' }],
        sqlQuery: 'select * from person_records',
      },
      EVIDENCIA,
    )
    // Zod descarta lo que no esta en el schema: la respuesta se acepta, pero
    // los campos extra no llegan a ninguna parte del sistema.
    expect(salida.ok).toBe(true)
    expect(Object.keys(salida.answer).sort()).toEqual([
      'abstained',
      'abstentionReason',
      'answer',
      'citations',
    ])
  })
})
