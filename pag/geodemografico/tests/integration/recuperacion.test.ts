import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { filtrarVigentes, hybridSearch } from '@kaizen/retrieval'
import { embeddingDeterminista } from '@kaizen/llm'
import { CANARIOS, F } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Tickets 11 y 12 — recuperacion y vigencia.
 *
 * La propiedad central: lo que NO esta autorizado y vigente no llega al
 * modelo. Filtrarlo despues, en la respuesta, seria tarde: el contenido ya
 * habria salido del sistema.
 */
let env: TestEnv

beforeAll(async () => {
  env = await setupTestEnv()
}, 120_000)

afterAll(async () => {
  await env?.close()
})

const ctxA = { tenantId: F.tenantA, corpusId: F.corpusA, userId: F.userA1, purposeId: F.purposeA }
const ctxB = { tenantId: F.tenantB, corpusId: F.corpusB, userId: F.userB1, purposeId: F.purposeB }

async function buscar(ctx: typeof ctxA, pregunta: string) {
  return withAuthorizedTransaction('app', ctx, (client) =>
    hybridSearch(client, {
      question: pregunta,
      questionEmbedding: embeddingDeterminista(pregunta),
      topK: 10,
    }),
  )
}

describe('busqueda hibrida', () => {
  it('encuentra por coincidencia textual', async () => {
    const candidatos = await buscar(ctxA, 'pavimentacion del barrio centro')
    expect(candidatos.length).toBeGreaterThan(0)
    expect(candidatos.some((c) => c.content.includes('pavimentacion'))).toBe(true)
  })

  it('cada candidato declara de que estrategia vino', async () => {
    const candidatos = await buscar(ctxA, 'pavimentacion')
    // Sin esta traza no se puede medir si la parte vectorial aporta algo.
    expect(candidatos.some((c) => Object.keys(c.signals).length > 0)).toBe(true)
  })

  it('NUNCA devuelve la version antigua de un documento', async () => {
    const candidatos = await buscar(ctxA, '380 millones borrador anterior')
    // El fixture tiene una version superseded con la cifra equivocada.
    expect(candidatos.some((c) => c.content.includes('NO-DEBE-RECUPERARSE'))).toBe(false)
  })

  it('NUNCA cruza de tenant, aunque el texto coincida', async () => {
    const candidatos = await buscar(ctxA, 'luminarias 95 millones planeacion')
    const texto = candidatos.map((c) => c.content).join(' ')
    expect(texto).not.toContain(CANARIOS.tenantB)

    const desdeB = await buscar(ctxB, 'pavimentacion barrio centro 420 millones')
    expect(desdeB.map((c) => c.content).join(' ')).not.toContain(CANARIOS.tenantA)
  })

  it('degrada a busqueda textual si no hay vector de la pregunta', async () => {
    const candidatos = await withAuthorizedTransaction('app', ctxA, (client) =>
      hybridSearch(client, {
        question: 'pavimentacion',
        // Sin adaptador de embeddings disponible.
        questionEmbedding: null,
        topK: 10,
      }),
    )
    expect(candidatos.length).toBeGreaterThan(0)
    expect(candidatos.every((c) => c.signals.vectorRank === undefined)).toBe(true)
  })
})

describe('comprobacion de vigencia antes de llamar al modelo', () => {
  it('deja pasar los fragmentos vigentes', async () => {
    const candidatos = await buscar(ctxA, 'pavimentacion')
    const salida = await withAuthorizedTransaction('app', ctxA, (client) =>
      filtrarVigentes(client, candidatos),
    )
    expect(salida.vigentes.length).toBe(candidatos.length)
    expect(salida.descartados).toEqual([])
  })

  it('descarta el fragmento cuando su documento se retira', async () => {
    const candidatos = await buscar(ctxA, 'pavimentacion')
    expect(candidatos.length).toBeGreaterThan(0)

    await env.owner.query(`update documents set status = 'withdrawn' where id = $1`, [
      candidatos[0]!.documentId,
    ])

    const salida = await withAuthorizedTransaction('app', ctxA, (client) =>
      filtrarVigentes(client, candidatos),
    )

    expect(salida.vigentes.some((c) => c.chunkId === candidatos[0]!.chunkId)).toBe(false)
    expect(salida.descartados.map((d) => d.motivo)).toContain('documento retirado')

    await env.owner.query(`update documents set status = 'active' where id = $1`, [
      candidatos[0]!.documentId,
    ])
  })

  it('descarta el fragmento cuando se revoca la conexion de la fuente', async () => {
    const candidatos = await buscar(ctxA, 'pavimentacion')

    await env.owner.query(`update source_connections set status = 'revoked' where id = $1`, [
      F.connA,
    ])

    const salida = await withAuthorizedTransaction('app', ctxA, (client) =>
      filtrarVigentes(client, candidatos),
    )

    // Ninguno sobrevive: todos venian de esa conexion.
    expect(salida.vigentes).toHaveLength(0)
    expect(salida.descartados.map((d) => d.motivo)).toContain('conexion revocada')

    await env.owner.query(`update source_connections set status = 'active' where id = $1`, [
      F.connA,
    ])
  })

  it('falla CERRADA ante un fragmento que ya no existe', async () => {
    const salida = await withAuthorizedTransaction('app', ctxA, (client) =>
      filtrarVigentes(client, [
        {
          chunkId: '99999999-9999-4999-8999-000000000009',
          documentId: '99999999-9999-4999-8999-000000000008',
          documentVersionId: '99999999-9999-4999-8999-000000000007',
          title: 'inventado',
          section: null,
          meetingAt: null,
          artifactType: 'meeting_notes',
          content: 'contenido que no deberia llegar al modelo',
          signals: {},
          score: 1,
        },
      ]),
    )

    expect(salida.vigentes).toHaveLength(0)
    expect(salida.descartados[0]?.motivo).toBe('fragmento no disponible')
  })
})
