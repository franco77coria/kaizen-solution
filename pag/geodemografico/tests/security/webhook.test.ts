import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { withAuthorizedTransaction } from '@kaizen/db'
import { hashToken } from '@kaizen/authz'
import { F } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Ticket 07 — el webhook.
 *
 * Es el unico endpoint sin sesion de usuario, asi que es la superficie mas
 * expuesta. Lo que se comprueba: que el secreto del canal sea lo unico que
 * autoriza, que el cuerpo no decida nada, y que las respuestas no permitan
 * averiguar que canales existen.
 */
let env: TestEnv
let app: FastifyInstance

const CANAL = 'canal-de-prueba-0001'
const TOKEN = 'secreto-del-canal-muy-largo-0001'

beforeAll(async () => {
  env = await setupTestEnv()

  process.env['APP_ENV'] = 'local'
  process.env['OIDC_PROVIDER'] = 'fake'
  process.env['SESSION_SECRET'] = 'clave-de-prueba-suficientemente-larga'
  process.env['LLM_PROVIDER'] = 'fake'
  process.env['EMBEDDINGS_PROVIDER'] = 'fake'

  await env.owner.query(
    `insert into notification_channels
       (channel_id, tenant_id, connection_id, corpus_id, connection_generation, token_hash, expires_at)
     values ($1,$2,$3,$4,1,$5, now() + interval '7 days')`,
    [CANAL, F.tenantA, F.connA, F.corpusA, hashToken(TOKEN)],
  )

  const { buildApp } = await import('../../apps/api/src/app.js')
  app = await buildApp()
  await app.ready()
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

async function notificar(headers: Record<string, string>) {
  const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
  reiniciarAdmision()
  return app.inject({ method: 'POST', url: '/webhooks/drive', headers, payload: {} })
}

async function trabajosEncolados(): Promise<number> {
  return withAuthorizedTransaction(
    'worker',
    { tenantId: F.tenantA, corpusId: F.corpusA },
    async (c) => {
      const r = await c.query<{ n: string }>(
        `select count(*) n from ingestion_jobs where job_kind = 'reconcile'`,
      )
      return Number(r.rows[0]?.n ?? 0)
    },
  )
}

describe('autorizacion por secreto del canal', () => {
  it('un token valido encola una reconciliacion', async () => {
    const antes = await trabajosEncolados()

    const respuesta = await notificar({
      'x-goog-channel-id': CANAL,
      'x-goog-channel-token': TOKEN,
      'x-goog-resource-state': 'change',
    })

    expect(respuesta.statusCode).toBe(200)
    expect(await trabajosEncolados()).toBe(antes + 1)
  })

  it('un token invalido NO encola nada', async () => {
    const antes = await trabajosEncolados()

    const respuesta = await notificar({
      'x-goog-channel-id': CANAL,
      'x-goog-channel-token': 'token-del-atacante',
      'x-goog-resource-state': 'change',
    })

    // Responde 200 igual: un codigo distinto confirmaria que el canal existe.
    expect(respuesta.statusCode).toBe(200)
    expect(await trabajosEncolados()).toBe(antes)
  })

  it('un canal desconocido responde IGUAL que uno valido', async () => {
    const valido = await notificar({
      'x-goog-channel-id': CANAL,
      'x-goog-channel-token': TOKEN,
      'x-goog-resource-state': 'change',
    })
    const desconocido = await notificar({
      'x-goog-channel-id': 'canal-que-no-existe',
      'x-goog-channel-token': TOKEN,
      'x-goog-resource-state': 'change',
    })

    expect(desconocido.statusCode).toBe(valido.statusCode)
    expect(desconocido.body).toBe(valido.body)
  })

  it('sin encabezados de canal no encola nada', async () => {
    const antes = await trabajosEncolados()
    const respuesta = await notificar({ 'x-goog-resource-state': 'change' })

    expect(respuesta.statusCode).toBe(200)
    expect(await trabajosEncolados()).toBe(antes)
  })

  it('un canal vencido no encola', async () => {
    await env.owner.query(
      `update notification_channels set expires_at = now() - interval '1 day' where channel_id = $1`,
      [CANAL],
    )

    const antes = await trabajosEncolados()
    await notificar({
      'x-goog-channel-id': CANAL,
      'x-goog-channel-token': TOKEN,
      'x-goog-resource-state': 'change',
    })

    expect(await trabajosEncolados()).toBe(antes)

    await env.owner.query(
      `update notification_channels set expires_at = now() + interval '7 days' where channel_id = $1`,
      [CANAL],
    )
  })
})

describe('el cuerpo de la notificacion no decide nada', () => {
  it('encola una RECONCILIACION, no la ingesta de un archivo elegido por quien llama', async () => {
    const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    await app.inject({
      method: 'POST',
      url: '/webhooks/drive',
      headers: {
        'x-goog-channel-id': CANAL,
        'x-goog-channel-token': TOKEN,
        'x-goog-resource-state': 'change',
        'content-type': 'application/json',
      },
      // El atacante intenta dirigir el trabajo a un archivo concreto.
      payload: { fileId: 'archivo-que-el-atacante-elige', jobKind: 'extract' },
    })

    const trabajos = await withAuthorizedTransaction(
      'worker',
      { tenantId: F.tenantA, corpusId: F.corpusA },
      async (c) => {
        const r = await c.query<{ job_kind: string; provider_file_id: string }>(
          `select job_kind, provider_file_id from ingestion_jobs order by created_at desc limit 1`,
        )
        return r.rows[0]
      },
    )

    expect(trabajos?.job_kind).toBe('reconcile')
    // El identificador del cuerpo NO llego al trabajo.
    expect(trabajos?.provider_file_id).toBe('')
  })

  it('el mensaje inicial de registro no encola trabajo', async () => {
    const antes = await trabajosEncolados()
    await notificar({
      'x-goog-channel-id': CANAL,
      'x-goog-channel-token': TOKEN,
      // Drive manda `sync` al crear el canal: confirma el registro.
      'x-goog-resource-state': 'sync',
    })
    expect(await trabajosEncolados()).toBe(antes)
  })
})
