import type { AuditEvent } from '@kaizen/observability'
import { logger } from '@kaizen/observability'
import { withAuthorizedTransaction, type TransactionContext } from '@kaizen/db'

/**
 * Registro de auditoria. Se escribe en su propia transaccion, para que un
 * fallo al auditar no revierta la operacion auditada ni al reves.
 *
 * Si la auditoria falla, se registra en el log del proceso y se continua: la
 * alternativa (romper la operacion) convertiria un problema de observabilidad
 * en una caida de servicio.
 */
export async function registrarAuditoria(evento: AuditEvent): Promise<void> {
  try {
    const contexto: TransactionContext = {}
    if (evento.tenantId) contexto.tenantId = evento.tenantId
    if (evento.actorUserId) contexto.userId = evento.actorUserId

    await withAuthorizedTransaction('app', contexto, async (client) => {
        await client.query(
          `insert into audit_events
             (actor_user_id, tenant_id, purpose_id, action, resource_ref, result, request_id, detail)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            evento.actorUserId,
            evento.tenantId,
            evento.purposeId,
            evento.action,
            evento.resourceRef,
            evento.result,
            evento.requestId,
            evento.detail ? JSON.stringify(evento.detail) : null,
          ],
      )
    })
  } catch (error) {
    logger.error('audit.fallo_escritura', error, { action: evento.action })
  }
}
