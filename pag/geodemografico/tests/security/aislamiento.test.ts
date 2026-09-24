import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { F, CANARIOS } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Ticket 02 — criterio de aceptacion:
 *   "Rol runtime no salta RLS; sin contexto no lee; claves compuestas
 *    rechazan cruces."
 * Ticket 04 — criterio de aceptacion:
 *   "A/B y dos propositos aislados en rutas y bajo reutilizacion concurrente
 *    del pool."
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

describe('aislamiento entre alcaldias', () => {
  it('A ve solo sus fragmentos y nunca el canario de B', async () => {
    const filas = await withAuthorizedTransaction('app', ctxA, async (c) => {
      const r = await c.query<{ content: string }>('select content from chunks')
      return r.rows
    })

    expect(filas.length).toBeGreaterThan(0)
    const texto = filas.map((f) => f.content).join(' ')
    expect(texto).toContain(CANARIOS.tenantA)
    expect(texto).not.toContain(CANARIOS.tenantB)
  })

  it('B ve solo sus fragmentos y nunca el canario de A', async () => {
    const filas = await withAuthorizedTransaction('app', ctxB, async (c) => {
      const r = await c.query<{ content: string }>('select content from chunks')
      return r.rows
    })

    const texto = filas.map((f) => f.content).join(' ')
    expect(texto).toContain(CANARIOS.tenantB)
    expect(texto).not.toContain(CANARIOS.tenantA)
  })

  it('pedir explicitamente un documento de B desde el contexto de A devuelve vacio', async () => {
    // El atacante conoce el UUID exacto. Conocerlo no alcanza.
    const filas = await withAuthorizedTransaction('app', ctxA, async (c) => {
      const r = await c.query('select id, title from documents where id = $1', [F.docBnotas])
      return r.rows
    })

    expect(filas).toHaveLength(0)
  })

  it('titulos identicos entre A y B no se mezclan', async () => {
    const enA = await withAuthorizedTransaction('app', ctxA, async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*) n from documents where title = 'Comite de obras - marzo'`,
      )
      return Number(r.rows[0]?.n ?? 0)
    })
    // En A hay dos documentos con ese titulo (nota y transcripcion). El de B
    // tiene el mismo titulo y no debe sumarse.
    expect(enA).toBe(2)
  })
})

describe('sin contexto, la base deniega', () => {
  it('una transaccion sin tenant no devuelve ninguna fila', async () => {
    const filas = await withAuthorizedTransaction('app', {}, async (c) => {
      const r = await c.query('select id from chunks')
      return r.rows
    })

    expect(filas).toHaveLength(0)
  })

  it('con tenant pero sin corpus tampoco lee el corpus', async () => {
    const filas = await withAuthorizedTransaction('app', { tenantId: F.tenantA }, async (c) => {
      const r = await c.query('select id from chunks')
      return r.rows
    })

    expect(filas).toHaveLength(0)
  })
})

describe('dos finalidades dentro del mismo tenant', () => {
  it('la primera finalidad de A no ve el contenido de la segunda', async () => {
    const texto = await withAuthorizedTransaction('app', ctxA, async (c) => {
      const r = await c.query<{ content: string }>('select content from chunks')
      return r.rows.map((f) => f.content).join(' ')
    })

    // Mismo tenant, mismo usuario: lo que separa es el corpus/proposito.
    expect(texto).not.toContain(CANARIOS.purposeA2)
  })

  it('la segunda finalidad de A no ve el contenido de la primera', async () => {
    const texto = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, corpusId: F.corpusA2, userId: F.userA1, purposeId: F.purposeA2 },
      async (c) => {
        const r = await c.query<{ content: string }>('select content from chunks')
        return r.rows.map((f) => f.content).join(' ')
      },
    )

    expect(texto).toContain(CANARIOS.purposeA2)
    expect(texto).not.toContain(CANARIOS.tenantA)
  })
})

describe('reutilizacion concurrente del pool', () => {
  it('30 transacciones alternando A y B no filtran entre si', async () => {
    const tareas = Array.from({ length: 30 }, (_, i) =>
      withAuthorizedTransaction('app', i % 2 === 0 ? ctxA : ctxB, async (c) => {
        const r = await c.query<{ content: string }>('select content from chunks')
        return { esA: i % 2 === 0, texto: r.rows.map((f) => f.content).join(' ') }
      }),
    )

    const resultados = await Promise.all(tareas)

    for (const { esA, texto } of resultados) {
      if (esA) {
        expect(texto).toContain(CANARIOS.tenantA)
        expect(texto).not.toContain(CANARIOS.tenantB)
      } else {
        expect(texto).toContain(CANARIOS.tenantB)
        expect(texto).not.toContain(CANARIOS.tenantA)
      }
    }
  })

  it('una transaccion fallida no deja contexto pegado a la conexion', async () => {
    await expect(
      withAuthorizedTransaction('app', ctxA, async (c) => {
        await c.query('select 1')
        throw new Error('fallo deliberado')
      }),
    ).rejects.toThrow('fallo deliberado')

    // La siguiente transaccion sin contexto debe ver cero, no los datos de A.
    const filas = await withAuthorizedTransaction('app', {}, async (c) => {
      const r = await c.query('select id from chunks')
      return r.rows
    })

    expect(filas).toHaveLength(0)
  })
})

describe('chats privados entre miembros del mismo espacio', () => {
  it('A2 no ve la conversacion de A1 aunque compartan las notas', async () => {
    const convId = '0f000001-0000-4000-8000-000000000001'

    await withAuthorizedTransaction('app', ctxA, async (c) => {
      await c.query(
        `insert into conversations (id, tenant_id, corpus_id, purpose_id, owner_user_id, title, authz_version)
         values ($1,$2,$3,$4,$5,'Privada de A1',1)`,
        [convId, F.tenantA, F.corpusA, F.purposeA, F.userA1],
      )
    })

    const vistasPorA1 = await withAuthorizedTransaction('app', ctxA, async (c) => {
      const r = await c.query('select id from conversations')
      return r.rows
    })
    expect(vistasPorA1).toHaveLength(1)

    const vistasPorA2 = await withAuthorizedTransaction(
      'app',
      { ...ctxA, userId: F.userA2 },
      async (c) => {
        const r = await c.query('select id from conversations')
        return r.rows
      },
    )
    expect(vistasPorA2).toHaveLength(0)
  })
})
