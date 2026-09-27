import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { PILOTO, seedPiloto } from '@kaizen/fixtures'
import { unaPasada } from '../../apps/worker/src/ciclo.js'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * En Vercel no hay worker en bucle: la cola la vacia `unaPasada`, llamada por
 * el cron diario y por la API apenas encola. Lo que se comprueba es que la
 * pasada DESCUBRE los espacios con la identidad del worker. Antes los
 * descubria con la conexion "a secas", que en produccion (kaizen_login) no
 * puede leer nada: la pasada habria terminado "bien" con cero trabajos.
 *
 * Limite conocido: PGlite comparte una sola sesion entre conexiones e ignora
 * las opciones de arranque, asi que aca la conexion es superusuario y no se
 * puede reproducir `kaizen_login`. Esa parte la verifica
 * `scripts/prod-inicializar.mjs` contra la base real.
 */
let env: TestEnv

beforeAll(async () => {
  env = await setupTestEnv()
  await seedPiloto(env.owner, { invitationTokenHash: 'hash-pasada' })
}, 120_000)

afterAll(async () => {
  await env?.close()
})

describe('lo que el worker ve sin contexto de espacio', () => {
  it('ve los corpus activos, y nada mas', async () => {
    const visto = await withAuthorizedTransaction('worker', {}, async (c) => ({
      corpus: (await c.query<{ n: number }>('select count(*)::int as n from corpora')).rows[0]?.n,
      conexiones: (await c.query<{ n: number }>('select count(*)::int as n from source_connections'))
        .rows[0]?.n,
      trabajos: (await c.query<{ n: number }>('select count(*)::int as n from ingestion_jobs')).rows[0]
        ?.n,
      documentos: (await c.query<{ n: number }>('select count(*)::int as n from documents')).rows[0]
        ?.n,
    }))

    expect(visto.corpus).toBeGreaterThan(0)
    expect(visto).toMatchObject({ conexiones: 0, trabajos: 0, documentos: 0 })
  })
})

describe('una pasada de ingesta', () => {
  it('encuentra el trabajo encolado y publica los documentos del piloto', async () => {
    await env.owner.query(
      `insert into ingestion_jobs
         (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
          job_kind, pipeline_version, dedupe_key)
       values ($1, $2, $3, 1, '', 'reconcile', 'test-1', 'pasada:1')`,
      [PILOTO.tenantId, PILOTO.corpusId, PILOTO.connectionId],
    )

    const procesados = await unaPasada()
    expect(procesados).toBeGreaterThanOrEqual(1)

    const { rows } = await env.owner.query<{ n: number; pendientes: number }>(
      `select (select count(*)::int from documents where corpus_id = $1) as n,
              (select count(*)::int from ingestion_jobs
                where corpus_id = $1 and status in ('queued', 'leased')) as pendientes`,
      [PILOTO.corpusId],
    )
    expect(rows[0]?.n).toBeGreaterThan(0)
    expect(rows[0]?.pendientes).toBe(0)
  })

  it('una segunda pasada sin trabajo nuevo no procesa nada', async () => {
    expect(await unaPasada()).toBe(0)
  })
})
