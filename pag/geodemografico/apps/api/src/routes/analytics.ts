import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { analyticsRunSchema, notFound, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { TEMPLATES } from '@kaizen/query-plans'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { ejecutarAnalitica } from '../services/analytics.js'

const idParam = z.object({ id: z.string().uuid() })

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  /** Catalogo de plantillas disponibles, para que la UI guie la consulta. */
  app.get('/v1/analytics/templates', async (request) => {
    await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])
    return {
      templates: Object.entries(TEMPLATES).map(([id, def]) => ({
        id,
        description: def.description,
        groupLabel: def.groupLabel,
        allowedFilters: def.allowedFilters,
      })),
    }
  })

  app.post('/v1/analytics/runs', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])

    const parsed = analyticsRunSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    return ejecutarAnalitica({
      session,
      plan: parsed.data.plan,
      idempotencyKey: parsed.data.idempotencyKey,
      requestId: request.requestId,
    })
  })

  app.get('/v1/analytics/runs/:id', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        result: unknown
        privacy_epoch: number
        created_at: Date
      }>(
        `select r.id, r.result, r.privacy_epoch, r.created_at
           from analytics_runs r
          where r.id = $1 and r.owner_user_id = $2 and r.purpose_id = $3`,
        [params.data.id, session.userId, session.purposeId],
      )

      const fila = rows[0]
      if (!fila) throw notFound('ejecucion inexistente o ajena')

      const epoch = await client.query<{ privacy_epoch: number }>(
        `select privacy_epoch from tenants where id = $1`,
        [session.tenantId],
      )

      const actual = epoch.rows[0]?.privacy_epoch ?? fila.privacy_epoch

      return {
        id: fila.id,
        result: fila.result,
        createdAt: fila.created_at,
        // Si alguien retiro su consentimiento despues de ejecutar, el
        // resultado guardado ya no refleja el estado autorizado.
        stale: actual !== fila.privacy_epoch,
      }
    })
  })
}
