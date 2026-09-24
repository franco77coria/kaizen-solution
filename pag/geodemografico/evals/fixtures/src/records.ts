import type { Client, PoolClient } from 'pg'
import { F } from './ids.js'

type Db = Client | PoolClient

/**
 * Registros de personas SINTETICOS.
 *
 * Todos los nombres y documentos son inventados y siguen un patron evidente
 * (`Persona Fixture N`, documento `9000NNNN`) para que nadie los confunda con
 * datos reales. El plan es explicito: la analitica se desarrolla con fixtures
 * y no espera a que existan datos reales de personas.
 */
export const CONSENT_TEXT_VERSION = 'fixture-v1'
export const CONSENT_TEXT_ID = 'a1000001-0000-4000-8000-000000000001'

export async function seedRegistros(db: Db): Promise<void> {
  await db.query(
    `insert into consent_texts
       (id, tenant_id, purpose_id, version, body, controller_name, status)
     values ($1,$2,$3,$4,$5,$6,'active')
     on conflict (id) do nothing`,
    [
      CONSENT_TEXT_ID,
      F.tenantA,
      F.purposeA,
      CONSENT_TEXT_VERSION,
      'Texto de consentimiento de prueba. No es un aviso de privacidad real y no debe usarse con personas reales.',
      'RESPONSABLE DE TRATAMIENTO PENDIENTE DE DEFINIR',
    ],
  )

  // Distribucion pensada para ejercitar la supresion: municipios con muchos
  // registros, y otros con 1 o 2 que deben quedar suprimidos.
  const distribucion: Array<[string, number]> = [
    ['25175', 12],
    ['25286', 8],
    ['25269', 7],
    ['25430', 6],
    ['25899', 2],
    ['25754', 1],
  ]

  let n = 0
  for (const [municipio, cantidad] of distribucion) {
    for (let i = 0; i < cantidad; i++) {
      n++
      const recordId = `a2${String(n).padStart(6, '0')}-0000-4000-8000-000000000001`

      await db.query(
        `insert into person_records
           (id, tenant_id, purpose_id, full_name, document_number, municipality_code,
            birth_year, captured_by, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
         on conflict (id) do nothing`,
        [
          recordId,
          F.tenantA,
          F.purposeA,
          `Persona Fixture ${n}`,
          `9000${String(n).padStart(4, '0')}`,
          municipio,
          1960 + (n % 45),
          // A3 captura; A2 revisa. Nunca la misma persona: el trigger
          // review_actor_distinto_trg lo impide de todas formas.
          F.userA3,
        ],
      )

      await db.query(
        `insert into consent_records
           (tenant_id, purpose_id, record_id, consent_text_id, evidence_kind, evidence_ref)
         values ($1,$2,$3,$4,'formulario_papel',$5)
         on conflict do nothing`,
        [F.tenantA, F.purposeA, recordId, CONSENT_TEXT_ID, `evidencia-fixture-${n}`],
      )

      // Se aprueban recorriendo el MISMO camino que la aplicacion: submitted
      // y luego approved, con una revision de un actor distinto.
      await db.query(
        `update person_records set status = 'submitted', version = version + 1 where id = $1`,
        [recordId],
      )
      await db.query(
        `insert into record_reviews
           (tenant_id, record_id, reviewer_user_id, decision, reason, expected_version, idempotency_key)
         values ($1,$2,$3,'approve','fixture',2,$4)
         on conflict do nothing`,
        [F.tenantA, recordId, F.userA2, `fixture-review-${n}`],
      )
      await db.query(
        `update person_records set status = 'approved', version = version + 1 where id = $1`,
        [recordId],
      )
    }
  }
}
