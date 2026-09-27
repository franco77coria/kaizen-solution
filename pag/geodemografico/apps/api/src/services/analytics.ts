import { LIMITS, conflict, notFound, type AnalyticsResult, type ScopedSession } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { compileQueryPlan, parseQueryPlan, aplicarSupresion } from '@kaizen/query-plans'
import { findMunicipality } from '@kaizen/geography'
import { admitir } from '../plugins/admission.js'
import { registrarAuditoria } from '../services/audit.js'
import { txContext } from '../plugins/session.js'

/**
 * Ejecucion de una consulta analitica.
 *
 * El modelo NO participa en este camino: recibe (o construye guiado) un
 * QueryPlan JSON cerrado, y el servidor lo compila a una plantilla SQL
 * registrada con valores enlazados. No hay forma de que llegue SQL aqui.
 */
export interface RunInput {
  session: ScopedSession
  plan: unknown
  idempotencyKey: string
  requestId: string
}

export async function ejecutarAnalitica(
  input: RunInput,
): Promise<{ runId: string; result: AnalyticsResult }> {
  const { session } = input

  await admitir('analytics', `${session.tenantId}:${session.userId}`)

  const plan = parseQueryPlan(input.plan)
  const compilada = compileQueryPlan(plan)

  const inicio = Date.now()

  const salida = await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const previa = await client.query<{ id: string; result: AnalyticsResult }>(
      `select id, result from analytics_runs
        where owner_user_id = $1 and idempotency_key = $2`,
      [session.userId, input.idempotencyKey],
    )
    if (previa.rows[0]) {
      return { runId: previa.rows[0].id, result: previa.rows[0].result, reutilizada: true }
    }

    const epoch = await client.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [session.tenantId],
    )
    const privacyEpoch = epoch.rows[0]?.privacy_epoch
    if (privacyEpoch === undefined) throw notFound('espacio no disponible')

    // Timeout por sentencia: una consulta analitica pesada no puede quedarse
    // con una conexion del pool indefinidamente.
    await client.query(`set local statement_timeout = ${LIMITS.ANALYTICS_TIMEOUT_MS}`)

    const filas = await client.query<{ grupo: string; cantidad: number }>(
      compilada.text,
      compilada.values,
    )

    const supresion = aplicarSupresion(filas.rows, (grupo) =>
      plan.template === 'records.count_by_municipality'
        ? (findMunicipality(grupo)?.name ?? grupo)
        : grupo,
    )

    const result: AnalyticsResult = {
      template: plan.template,
      rows: supresion.rows,
      totalGroups: supresion.totalGroups,
      suppressedGroups: supresion.suppressedGroups,
      suppressionThreshold: supresion.threshold,
      executedAt: new Date().toISOString(),
      privacyEpoch,
    }

    const creada = await client.query<{ id: string }>(
      `insert into analytics_runs
         (tenant_id, purpose_id, owner_user_id, template, plan, result,
          total_groups, suppressed_groups, suppression_threshold, privacy_epoch,
          duration_ms, idempotency_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       returning id`,
      [
        session.tenantId,
        session.purposeId,
        session.userId,
        plan.template,
        JSON.stringify(plan),
        JSON.stringify(result),
        supresion.totalGroups,
        supresion.suppressedGroups,
        supresion.threshold,
        privacyEpoch,
        Date.now() - inicio,
        input.idempotencyKey,
      ],
    )

    const runId = creada.rows[0]?.id
    if (!runId) throw conflict('no se pudo registrar la ejecucion')

    return { runId, result, reutilizada: false }
  })

  if (!salida.reutilizada) {
    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'analytics.run',
      resourceRef: salida.runId,
      result: 'allowed',
      requestId: input.requestId,
      // Se registra QUE plantilla y CUANTOS grupos, nunca los valores.
      detail: {
        plantilla: plan.template,
        filtros: plan.filters.map((f) => f.field).join(','),
        grupos: salida.result.totalGroups,
        suprimidos: salida.result.suppressedGroups,
      },
    })
  }

  return { runId: salida.runId, result: salida.result }
}
