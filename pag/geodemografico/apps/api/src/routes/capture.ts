import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  captureRecordSchema,
  conflict,
  forbidden,
  notFound,
  referralLookupSchema,
  reviewRecordSchema,
  validationFailed,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { admitir } from '../plugins/admission.js'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'

const idParam = z.object({ id: z.string().uuid() })

/**
 * Captura y revision de registros de personas.
 *
 * Reglas que este modulo hace cumplir, con respaldo en la base:
 *   - El consentimiento NO viene premarcado: el schema exige `literal(true)`,
 *     asi que omitirlo o mandarlo en false es un error de validacion.
 *   - Se guarda QUE texto de consentimiento se mostro, con su version.
 *   - Operador y titular son distintos: `captured_by` es el operador.
 *   - Autoaprobacion bloqueada por trigger, no solo por este codigo.
 *   - El modelo NO participa en ningun punto de este flujo.
 */
export async function captureRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/capture/records', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['records.capture'])

    const parsed = captureRecordSchema.safeParse(request.body)
    if (!parsed.success) {
      throw validationFailed(
        `captura invalida: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
      )
    }
    const datos = parsed.data

    const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      // El texto de consentimiento tiene que existir y estar vigente para esta
      // finalidad. Sin aviso publicado no se captura nada.
      const texto = await client.query<{ id: string }>(
        `select id from consent_texts
          where purpose_id = $1 and version = $2 and status = 'active'`,
        [session.purposeId, datos.consentTextVersion],
      )
      const consentTextId = texto.rows[0]?.id
      if (!consentTextId) {
        throw validationFailed('la version del texto de consentimiento no existe o no esta vigente')
      }

      let recordId: string
      try {
        const { rows } = await client.query<{ id: string }>(
          `insert into person_records
             (tenant_id, purpose_id, full_name, document_number, municipality_code,
              birth_year, phone, gender, relationship, uses_whatsapp, occupation,
              captured_by, status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
           returning id`,
          [
            session.tenantId,
            session.purposeId,
            datos.fullName,
            datos.documentNumber,
            datos.municipalityCode,
            datos.birthYear ?? null,
            datos.phone ?? null,
            datos.gender,
            datos.relationship,
            datos.usesWhatsapp,
            datos.occupation ?? null,
            // El lider es la cuenta que carga: no se elige ni se tipea, asi que
            // nadie puede sumar personas a nombre de otro.
            session.userId,
          ],
        )
        const creado = rows[0]?.id
        if (!creado) throw conflict('no se pudo registrar')
        recordId = creado
      } catch (error) {
        // Error UNIFORME: si se devolviera "ya existe", cualquiera podria
        // averiguar si un documento esta registrado probando numeros.
        if ((error as { code?: string }).code === '23505') {
          throw conflict('no se pudo registrar con los datos indicados')
        }
        throw error
      }

      await client.query(
        `insert into consent_records
           (tenant_id, purpose_id, record_id, consent_text_id, evidence_kind, evidence_ref)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          session.tenantId,
          session.purposeId,
          recordId,
          consentTextId,
          datos.evidenceKind,
          datos.evidenceRef,
        ],
      )

      return recordId
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'record.captured',
      resourceRef: id,
      result: 'allowed',
      requestId: request.requestId,
      // Nunca el nombre ni el documento.
      detail: { evidencia: datos.evidenceKind, consentimiento: datos.consentTextVersion },
    })

    return { id, status: 'draft' }
  })

  app.post('/v1/capture/records/:id/submit', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['records.capture'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `update person_records
            set status = 'submitted', version = version + 1, updated_at = now()
          where id = $1 and captured_by = $2 and status = 'draft'
            and exists (select 1 from consent_records c
                         where c.tenant_id = person_records.tenant_id
                           and c.record_id = person_records.id
                           and c.withdrawn_at is null)`,
        [params.data.id, session.userId],
      )
      if (rowCount === 0) {
        throw notFound('registro inexistente, ajeno, ya enviado o sin consentimiento vigente')
      }
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'record.submitted',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { ok: true }
  })

  /**
   * Revision. La exige un permiso DISTINTO del de captura y un actor distinto
   * del que capturo; el trigger `review_actor_distinto_trg` lo garantiza aunque
   * alguien llame al endpoint por fuera de la interfaz.
   */
  app.post('/v1/capture/records/:id/review', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['records.review'])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const parsed = reviewRecordSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')
    const decision = parsed.data

    const resultado = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        // Bloqueo de fila: serializa esta revision con un eventual retiro de
        // consentimiento concurrente. En cualquiera de los dos ordenes el
        // retiro termina prevaleciendo.
        const actual = await client.query<{ status: string; version: number; captured_by: string }>(
          `select status, version, captured_by from person_records
            where id = $1 and purpose_id = $2
            for update`,
          [params.data.id, session.purposeId],
        )
        const fila = actual.rows[0]
        if (!fila) throw notFound('registro inexistente')

        if (fila.captured_by === session.userId) {
          throw forbidden('no podes revisar un registro que capturaste')
        }
        if (fila.version !== decision.expectedVersion) {
          throw conflict('el registro cambio desde que lo abriste')
        }
        if (fila.status !== 'submitted') {
          throw conflict('el registro no esta en revision')
        }

        try {
          await client.query(
            `insert into record_reviews
               (tenant_id, record_id, reviewer_user_id, decision, reason, expected_version, idempotency_key)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [
              session.tenantId,
              params.data.id,
              session.userId,
              decision.decision,
              decision.reason,
              decision.expectedVersion,
              decision.idempotencyKey,
            ],
          )
        } catch (error) {
          // Misma clave de idempotencia: la decision ya se aplico.
          if ((error as { code?: string }).code === '23505') {
            return { aplicada: false, estado: fila.status }
          }
          throw error
        }

        const nuevoEstado = decision.decision === 'approve' ? 'approved' : 'rejected'
        await client.query(
          `update person_records
              set status = $2, version = version + 1, updated_at = now()
            where id = $1`,
          [params.data.id, nuevoEstado],
        )

        return { aplicada: true, estado: nuevoEstado }
      },
    )

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'record.reviewed',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
      detail: { decision: decision.decision, aplicada: resultado.aplicada },
    })

    return { status: resultado.estado, aplicada: resultado.aplicada }
  })

  /**
   * Consulta NOMINAL. Permiso propio (`records.read_sensitive`), reautenticacion
   * por CSRF, consulta EXACTA y limitada, y sin pasar por el modelo: una ficha
   * de persona nunca entra al contexto de Gemini.
   */
  app.post('/v1/records/referral-lookup', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['records.read_sensitive'])
    await admitir('lookup', `${session.tenantId}:${session.userId}`)

    const parsed = referralLookupSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    const ficha = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        full_name: string
        municipality_code: string
        status: string
        consentimiento_vigente: boolean
      }>(
        // Comparacion EXACTA. No hay busqueda por prefijo ni comodines:
        // permitirla convertiria el endpoint en un extractor del padron.
        `select r.id, r.full_name, r.municipality_code, r.status,
                exists (select 1 from consent_records c
                         where c.tenant_id = r.tenant_id
                           and c.record_id = r.id
                           and c.withdrawn_at is null) as consentimiento_vigente
           from person_records r
          where r.purpose_id = $1 and r.document_number = $2
          limit 1`,
        [session.purposeId, parsed.data.documentNumber],
      )
      return rows[0] ?? null
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'record.lookup',
      // Nunca el documento consultado, ni siquiera cuando no hay resultado.
      resourceRef: ficha?.id ?? null,
      result: 'allowed',
      requestId: request.requestId,
      detail: { encontrado: ficha !== null },
    })

    if (!ficha) throw notFound('sin resultados')

    // Un registro con consentimiento retirado NO se devuelve con sus datos.
    if (!ficha.consentimiento_vigente) {
      return { id: ficha.id, disponible: false, motivo: 'consentimiento retirado' }
    }

    return {
      id: ficha.id,
      disponible: true,
      fullName: ficha.full_name,
      municipalityCode: ficha.municipality_code,
      status: ficha.status,
    }
  })
}
