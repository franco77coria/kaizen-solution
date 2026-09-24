import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  chartSpecSchema,
  notFound,
  validationFailed,
  type AnalyticsResult,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { getActiveVersion, listAreas } from '@kaizen/geography'
import { renderChart, toProtectedMarkdown } from '@kaizen/visualizations'
import { admitir } from '../plugins/admission.js'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'

const idParam = z.object({ id: z.string().uuid() })

/**
 * Visualizaciones.
 *
 * El endpoint NO acepta URLs, SQL, HTML ni valores libres: solo un ChartSpec
 * cerrado y la referencia a una ejecucion analitica PROPIA. Los numeros salen
 * de la base, no del cuerpo de la peticion.
 */
export async function visualizationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/visualizations', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])
    await admitir('render', `${session.tenantId}:${session.userId}`)

    const parsed = chartSpecSchema.safeParse(request.body)
    if (!parsed.success) {
      throw validationFailed(
        `spec invalido: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
      )
    }
    const spec = parsed.data

    const datos = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const run = await client.query<{ result: AnalyticsResult; privacy_epoch: number }>(
        `select result, privacy_epoch from analytics_runs
          where id = $1 and owner_user_id = $2 and purpose_id = $3`,
        [spec.runId, session.userId, session.purposeId],
      )
      const fila = run.rows[0]
      if (!fila) throw notFound('ejecucion inexistente o ajena')

      let geometrias:
        | Map<string, { geometry: unknown; centroid: { lon: number; lat: number } | null }>
        | undefined

      if (spec.kind === 'choropleth') {
        const version = await getActiveVersion(client)
        // Sin cartografia verificada NO se dibuja un mapa aproximado: se
        // devuelve el grafico con la ausencia declarada.
        if (version?.geometryLoaded) {
          const areas = await listAreas(client, version.id, 'municipality')
          geometrias = new Map(
            areas
              .filter((a) => a.geometry !== null)
              .map((a) => [a.code, { geometry: a.geometry, centroid: a.centroid }]),
          )
        } else {
          geometrias = new Map()
        }
      }

      return { result: fila.result, privacyEpoch: fila.privacy_epoch, geometrias }
    })

    const render = await renderChart({
      spec,
      rows: datos.result.rows,
      ...(datos.geometrias ? { geometrias: datos.geometrias } : {}),
    })

    const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into visualizations
           (tenant_id, purpose_id, owner_user_id, run_id, spec, png, png_sha256, privacy_epoch)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         returning id`,
        [
          session.tenantId,
          session.purposeId,
          session.userId,
          spec.runId,
          JSON.stringify(spec),
          render.png,
          render.sha256,
          datos.privacyEpoch,
        ],
      )
      const creada = rows[0]?.id
      if (!creada) throw notFound('no se pudo guardar la visualizacion')
      return creada
    })

    return {
      id,
      sha256: render.sha256,
      table: render.table,
      markdown: toProtectedMarkdown(id, render.table),
    }
  })

  /**
   * Imagen AUTENTICADA. No hay URL publica ni CDN: cada descarga vuelve a
   * comprobar sesion, ambito y vigencia del epoch de privacidad.
   */
  app.get('/v1/visualizations/:id/image.png', async (request, reply) => {
    const session = await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const png = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{ png: Buffer | null; privacy_epoch: number }>(
        `select png, privacy_epoch from visualizations
          where id = $1 and owner_user_id = $2 and purpose_id = $3`,
        [params.data.id, session.userId, session.purposeId],
      )
      const fila = rows[0]
      // Inexistente y ajena devuelven LO MISMO: un error distinto revelaria
      // que la visualizacion existe en otro espacio.
      if (!fila?.png) throw notFound('imagen no disponible')

      const epoch = await client.query<{ privacy_epoch: number }>(
        `select privacy_epoch from tenants where id = $1`,
        [session.tenantId],
      )
      if ((epoch.rows[0]?.privacy_epoch ?? fila.privacy_epoch) !== fila.privacy_epoch) {
        // El PNG quedo invalidado por un retiro de consentimiento posterior.
        throw notFound('la imagen quedo desactualizada y debe regenerarse')
      }

      return fila.png
    })

    return reply
      .header('content-type', 'image/png')
      // Sin cache compartida: la imagen contiene datos autorizados por sesion.
      .header('cache-control', 'private, no-store')
      .header('content-disposition', 'inline')
      .send(png)
  })
}
