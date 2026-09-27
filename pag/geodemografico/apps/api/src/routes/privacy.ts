import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { notFound, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'

const privacyRequestSchema = z
  .object({
    requestKind: z.enum(['access', 'rectification', 'withdrawal', 'deletion']),
    recordId: z.string().uuid().optional(),
    /**
     * Referencia a la verificacion de identidad del TITULAR, hecha fuera de la
     * aplicacion. No se sube ni se guarda el documento de identidad: eso
     * agregaria un dato sensible mas para custodiar.
     */
    identityCheckRef: z.string().min(3).max(200),
    note: z.string().max(1_000).optional(),
  })
  .strict()

/**
 * Derechos del titular: acceso, rectificacion, retiro de consentimiento y
 * supresion. El retiro PREVALECE sobre cualquier aprobacion en curso, y se
 * propaga por trigger a los derivados y al epoch de privacidad del tenant.
 */
export async function privacyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/privacy/requests', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['records.review'])

    const parsed = privacyRequestSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')
    const datos = parsed.data

    const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into privacy_requests
           (tenant_id, purpose_id, request_kind, record_id, identity_check_ref, note, handled_by)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [
          session.tenantId,
          session.purposeId,
          datos.requestKind,
          datos.recordId ?? null,
          datos.identityCheckRef,
          datos.note ?? null,
          session.userId,
        ],
      )
      const creada = rows[0]?.id
      if (!creada) throw notFound('no se pudo registrar la solicitud')

      if (datos.requestKind === 'withdrawal' && datos.recordId) {
        // El trigger propagar_retiro_trg se encarga de poner el registro en
        // 'withdrawn', crear el tombstone y subir el epoch de privacidad.
        const { rowCount } = await client.query(
          `update consent_records
              set withdrawn_at = now(), withdrawal_ref = $2
            where record_id = $1 and withdrawn_at is null`,
          [datos.recordId, creada],
        )
        if (rowCount === 0) throw notFound('no hay consentimiento vigente para retirar')

        await client.query(
          `update privacy_requests set status = 'fulfilled', resolved_at = now() where id = $1`,
          [creada],
        )
      }

      return creada
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: datos.requestKind === 'withdrawal' ? 'privacy.withdrawal' : 'privacy.request',
      resourceRef: id,
      result: 'allowed',
      requestId: request.requestId,
      detail: { tipo: datos.requestKind },
    })

    return { id, status: datos.requestKind === 'withdrawal' ? 'fulfilled' : 'received' }
  })
}
