import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  conflict,
  forbidden,
  grantAnalysisSchema,
  notFound,
  paginationSchema,
  saveAnalysisSchema,
  validationFailed,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { ejecutarAnalitica } from '../services/analytics.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'

const idParam = z.object({ id: z.string().uuid() })
const grantParams = z.object({ id: z.string().uuid(), grantId: z.string().uuid() })

/**
 * Analisis guardados.
 *
 * Guardar y compartir son ACCIONES EXPLICITAS del usuario autorizadas por el
 * backend, no herramientas de escritura libre del modelo. El endpoint no
 * acepta "resultados" arbitrarios: solo la referencia a una ejecucion propia
 * que ya existe en la base.
 */
export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/analyses', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analyses.save'])

    const parsed = saveAnalysisSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const run = await client.query<{ privacy_epoch: number }>(
        `select privacy_epoch from analytics_runs
          where id = $1 and owner_user_id = $2 and purpose_id = $3`,
        [parsed.data.runId, session.userId, session.purposeId],
      )
      const fila = run.rows[0]
      if (!fila) throw notFound('la ejecucion no existe o no es tuya')

      const { rows } = await client.query<{ id: string }>(
        `insert into analyses
           (tenant_id, purpose_id, owner_user_id, title, run_id, visualization_id, privacy_epoch)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [
          session.tenantId,
          session.purposeId,
          session.userId,
          parsed.data.title,
          parsed.data.runId,
          parsed.data.visualizationId ?? null,
          fila.privacy_epoch,
        ],
      )
      const creado = rows[0]?.id
      if (!creado) throw conflict('no se pudo guardar el analisis')
      return creado
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'analysis.saved',
      resourceRef: id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { id }
  })

  app.get('/v1/analyses', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['analyses.save'])
    const page = paginationSchema.parse(request.query ?? {})

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      // RLS devuelve los propios y los compartidos con concesion vigente.
      // La obsolescencia se DERIVA comparando el epoch guardado con el actual
      // del tenant: un campo almacenado se actualizaria solo para las filas
      // que RLS deja ver, y quedaria a medias sin que nada falle.
      const { rows } = await client.query<{
        id: string
        title: string
        owner_user_id: string
        created_at: Date
        obsoleto: boolean
      }>(
        `select a.id, a.title, a.owner_user_id, a.created_at,
                (a.privacy_epoch <> t.privacy_epoch) as obsoleto
           from analyses a
           join tenants t on t.id = a.tenant_id
          where a.status <> 'deleted' and a.purpose_id = $1
          order by a.created_at desc
          limit $2`,
        [session.purposeId, page.limit],
      )

      return {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          propio: r.owner_user_id === session.userId,
          stale: r.obsoleto,
          createdAt: r.created_at,
        })),
      }
    })
  })

  app.get('/v1/analyses/:id', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['analyses.save'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        title: string
        status: string
        privacy_epoch: number
        owner_user_id: string
        result: unknown
        visualization_id: string | null
      }>(
        `select a.id, a.title, a.status, a.privacy_epoch, a.owner_user_id,
                r.result, a.visualization_id
           from analyses a
           join analytics_runs r on r.tenant_id = a.tenant_id and r.id = a.run_id
          where a.id = $1 and a.status <> 'deleted'`,
        [params.data.id],
      )

      const fila = rows[0]
      if (!fila) throw notFound('analisis inexistente o sin acceso')

      const epoch = await client.query<{ privacy_epoch: number }>(
        `select privacy_epoch from tenants where id = $1`,
        [session.tenantId],
      )
      const vigente = (epoch.rows[0]?.privacy_epoch ?? fila.privacy_epoch) === fila.privacy_epoch
      // `status` ya no lleva 'stale': la obsolescencia sale de comparar epochs.

      return {
        id: fila.id,
        title: fila.title,
        propio: fila.owner_user_id === session.userId,
        // Un snapshot invalidado NO se sirve con sus numeros: se avisa que
        // hay que refrescarlo. Servirlo seria mostrar datos de personas que
        // ya retiraron su consentimiento.
        result: vigente ? fila.result : null,
        stale: !vigente,
        visualizationId: vigente ? fila.visualization_id : null,
      }
    })
  })

  /** Compartir. Requiere permiso propio de compartir, distinto del de guardar. */
  app.post('/v1/analyses/:id/grants', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analyses.share'])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const parsed = grantAnalysisSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    const grantId = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const propio = await client.query<{ id: string }>(
        `select id from analyses
          where id = $1 and owner_user_id = $2 and status <> 'deleted'`,
        [params.data.id, session.userId],
      )
      if (!propio.rows[0]) throw notFound('analisis inexistente o no sos el propietario')

      // El destinatario debe ser miembro ACTIVO del mismo tenant. Compartir no
      // amplia el tenant ni la finalidad; la FK compuesta lo garantiza ademas
      // a nivel de base.
      const destinatario = await client.query<{ user_id: string }>(
        `select m.user_id
           from memberships m
           join purpose_grants g
             on g.tenant_id = m.tenant_id
            and g.user_id = m.user_id
            and g.purpose_id = $3
            and g.status = 'active'
          where m.tenant_id = $1 and m.user_id = $2 and m.status = 'active'
          limit 1`,
        [session.tenantId, parsed.data.granteeUserId, session.purposeId],
      )
      if (!destinatario.rows[0]) {
        throw forbidden('el destinatario no pertenece a este espacio y finalidad')
      }

      const { rows } = await client.query<{ id: string }>(
        `insert into analysis_grants
           (tenant_id, analysis_id, grantee_user_id, granted_by, expires_at)
         values ($1,$2,$3,$4,$5)
         on conflict (tenant_id, analysis_id, grantee_user_id)
           do update set status = 'active', expires_at = excluded.expires_at
         returning id`,
        [
          session.tenantId,
          params.data.id,
          parsed.data.granteeUserId,
          session.userId,
          parsed.data.expiresAt ?? null,
        ],
      )
      const creado = rows[0]?.id
      if (!creado) throw conflict('no se pudo crear la concesion')
      return creado
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'analysis.shared',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { grantId }
  })

  app.delete('/v1/analyses/:id/grants/:grantId', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analyses.share'])

    const params = grantParams.safeParse(request.params)
    if (!params.success) throw validationFailed('parametros invalidos')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `update analysis_grants set status = 'revoked'
          where id = $1 and analysis_id = $2 and status = 'active'`,
        [params.data.grantId, params.data.id],
      )
      // RLS limita a las concesiones que ESTE usuario otorgo: si no hubo fila,
      // o no existe, o la otorgo otra persona.
      if (rowCount === 0) throw notFound('concesion inexistente o ya revocada')
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'analysis.grant_revoked',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { ok: true }
  })

  /**
   * Refresca un analisis obsoleto: vuelve a ejecutar SU plantilla guardada y
   * apunta el analisis a la ejecucion nueva.
   *
   * Reautoriza de cero: el permiso pudo revocarse desde que se guardo. Y no
   * acepta un plan del cliente, solo el que ya estaba registrado; si lo
   * aceptara, compartir un analisis se convertiria en una via para ejecutar
   * consultas arbitrarias con los permisos de otro.
   */
  app.post('/v1/analyses/:id/refresh', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), [
      'analyses.save',
      'analytics.aggregate',
    ])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const guardado = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        const { rows } = await client.query<{ plan: unknown; visualization_id: string | null }>(
          `select r.plan, a.visualization_id
             from analyses a
             join analytics_runs r on r.tenant_id = a.tenant_id and r.id = a.run_id
            where a.id = $1 and a.owner_user_id = $2 and a.status <> 'deleted'`,
          [params.data.id, session.userId],
        )
        const fila = rows[0]
        // Solo el propietario refresca. Un destinatario de una comparticion
        // tiene lectura, no ejecucion con los permisos del duenio.
        if (!fila) throw notFound('analisis inexistente o no sos el propietario')
        return fila
      },
    )

    const ejecucion = await ejecutarAnalitica({
      session,
      plan: guardado.plan,
      // Clave derivada del momento: refrescar es una operacion nueva cada vez,
      // no la repeticion de una anterior.
      idempotencyKey: `refresh-${params.data.id}-${Date.now()}`,
      requestId: request.requestId,
    })

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      await client.query(
        `update analyses
            set run_id = $2,
                privacy_epoch = $3,
                refreshed_at = now(),
                -- La visualizacion anterior quedo calculada con datos viejos:
                -- se desvincula para que nadie sirva un PNG desactualizado.
                visualization_id = null
          where id = $1 and owner_user_id = $4`,
        [params.data.id, ejecucion.runId, ejecucion.result.privacyEpoch, session.userId],
      )
    })

    return {
      id: params.data.id,
      runId: ejecucion.runId,
      result: ejecucion.result,
      // Avisa que hay que regenerar la grafica si la habia.
      visualizacionInvalidada: guardado.visualization_id !== null,
    }
  })

  app.delete('/v1/analyses/:id', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analyses.save'])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `update analyses set status = 'deleted'
          where id = $1 and owner_user_id = $2 and status <> 'deleted'`,
        [params.data.id, session.userId],
      )
      if (rowCount === 0) throw notFound('analisis inexistente o no sos el propietario')

      // Se revocan las concesiones: borrar el analisis sin cerrar el acceso
      // dejaria una fila compartida apuntando a algo que ya no se muestra.
      await client.query(
        `update analysis_grants set status = 'revoked' where analysis_id = $1`,
        [params.data.id],
      )

      await client.query(
        `insert into deletion_tombstones (tenant_id, resource_kind, resource_ref, reason, scope)
         values ($1,'analysis',$2,'user_request','analysis')`,
        [session.tenantId, params.data.id],
      )
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'analysis.deleted',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { ok: true }
  })
}
