import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { F, CONSENT_TEXT_ID, seedRegistros } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Ticket 17a.1 — criterio de aceptacion:
 *   "Check no premarcado; operador/titular diferenciados; autoaprobacion
 *    bloqueada; retiro concurrente prevalece."
 *
 * Todas estas pruebas atacan la BASE directamente, sin pasar por la API: si el
 * invariante solo viviera en el endpoint, un `curl` lo saltearia.
 */
let env: TestEnv

beforeAll(async () => {
  env = await setupTestEnv()
  await seedRegistros(env.owner)
}, 120_000)

afterAll(async () => {
  await env?.close()
})

const ctxA = { tenantId: F.tenantA, purposeId: F.purposeA, userId: F.userA2 }

async function crearRegistro(sufijo: string, capturador = F.userA3): Promise<string> {
  const id = `b1${sufijo.padStart(6, '0')}-0000-4000-8000-000000000001`
  await env.owner.query(
    `insert into person_records
       (id, tenant_id, purpose_id, full_name, document_number, municipality_code, captured_by, status)
     values ($1,$2,$3,$4,$5,'25175',$6,'submitted')`,
    [id, F.tenantA, F.purposeA, `Persona Prueba ${sufijo}`, `77${sufijo}`, capturador],
  )
  await env.owner.query(
    `insert into consent_records
       (tenant_id, purpose_id, record_id, consent_text_id, evidence_kind, evidence_ref)
     values ($1,$2,$3,$4,'firma_digital',$5)`,
    [F.tenantA, F.purposeA, id, CONSENT_TEXT_ID, `evidencia-${sufijo}`],
  )
  return id
}

describe('autoaprobacion bloqueada en la base', () => {
  it('quien capturo NO puede revisar, aunque se inserte la revision directamente', async () => {
    const id = await crearRegistro('100', F.userA3)

    await expect(
      withAuthorizedTransaction('app', ctxA, async (client) => {
        await client.query(
          `insert into record_reviews
             (tenant_id, record_id, reviewer_user_id, decision, reason, expected_version, idempotency_key)
           values ($1,$2,$3,'approve','me apruebo solo',1,'auto-1')`,
          // El MISMO usuario que capturo.
          [F.tenantA, id, F.userA3],
        )
      }),
    ).rejects.toThrow(/autoaprobacion no permitida/)
  })

  it('un revisor distinto si puede', async () => {
    const id = await crearRegistro('101', F.userA3)

    await withAuthorizedTransaction('app', ctxA, async (client) => {
      await client.query(
        `insert into record_reviews
           (tenant_id, record_id, reviewer_user_id, decision, reason, expected_version, idempotency_key)
         values ($1,$2,$3,'approve','revisado',1,'ok-1')`,
        [F.tenantA, id, F.userA2],
      )
    })

    const { rows } = await env.owner.query<{ n: string }>(
      `select count(*) n from record_reviews where record_id = $1`,
      [id],
    )
    expect(Number(rows[0]?.n)).toBe(1)
  })
})

describe('el consentimiento es condicion para aprobar', () => {
  it('no se puede aprobar un registro sin consentimiento vigente', async () => {
    const id = await crearRegistro('102')
    await env.owner.query(
      `update consent_records set withdrawn_at = now() where record_id = $1`,
      [id],
    )

    await expect(
      withAuthorizedTransaction('app', ctxA, async (client) => {
        await client.query(`update person_records set status = 'approved' where id = $1`, [id])
      }),
    ).rejects.toThrow(/consentimiento retirado/)
  })

  it('un registro sin ninguna fila de consentimiento tampoco se aprueba', async () => {
    const id = 'b1000103-0000-4000-8000-000000000001'
    await env.owner.query(
      `insert into person_records
         (id, tenant_id, purpose_id, full_name, document_number, municipality_code, captured_by, status)
       values ($1,$2,$3,'Sin Consentimiento','770103','25175',$4,'submitted')`,
      [id, F.tenantA, F.purposeA, F.userA3],
    )

    await expect(
      withAuthorizedTransaction('app', ctxA, async (client) => {
        await client.query(`update person_records set status = 'approved' where id = $1`, [id])
      }),
    ).rejects.toThrow(/sin consentimiento vigente/)
  })
})

describe('el retiro de consentimiento prevalece', () => {
  it('retirar despues de aprobar deja el registro en withdrawn', async () => {
    const id = await crearRegistro('104')

    await withAuthorizedTransaction('app', ctxA, async (client) => {
      await client.query(`update person_records set status = 'approved' where id = $1`, [id])
    })

    await withAuthorizedTransaction('app', ctxA, async (client) => {
      await client.query(
        `update consent_records set withdrawn_at = now() where record_id = $1`,
        [id],
      )
    })

    const { rows } = await env.owner.query<{ status: string }>(
      `select status from person_records where id = $1`,
      [id],
    )
    // El trigger propaga: no queda aprobado.
    expect(rows[0]?.status).toBe('withdrawn')
  })

  it('el retiro sube el epoch de privacidad y marca los analisis como obsoletos', async () => {
    const antes = await env.owner.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [F.tenantA],
    )

    const id = await crearRegistro('105')
    await withAuthorizedTransaction('app', ctxA, async (client) => {
      await client.query(
        `update consent_records set withdrawn_at = now() where record_id = $1`,
        [id],
      )
    })

    const despues = await env.owner.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [F.tenantA],
    )

    expect(despues.rows[0]!.privacy_epoch).toBeGreaterThan(antes.rows[0]!.privacy_epoch)
  })

  it('el retiro deja una lapida de borrado para purgar derivados', async () => {
    const id = await crearRegistro('106')
    await withAuthorizedTransaction('app', ctxA, async (client) => {
      await client.query(
        `update consent_records set withdrawn_at = now() where record_id = $1`,
        [id],
      )
    })

    const { rows } = await env.owner.query<{ reason: string; scope: string }>(
      `select reason, scope from deletion_tombstones where resource_ref = $1`,
      [id],
    )
    expect(rows[0]?.reason).toBe('user_request')
    expect(rows[0]?.scope).toBe('record')
  })
})
