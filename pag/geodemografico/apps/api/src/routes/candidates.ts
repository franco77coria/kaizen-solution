import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { notFound, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveCorpusScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'

/**
 * Seleccion de la coleccion inicial (seccion 21.2 del plan, paso 6).
 *
 * El inventario descubre archivos, pero solo entran solos los que el proveedor
 * confirma como artefactos de reunion. El resto queda como CANDIDATO: un
 * nombre que dice "notas" o "reunion" es una pista, no una autorizacion, y un
 * clasificador no puede decidir que se lee.
 *
 * Esta pantalla es la que cierra ese circulo. Sin ella, un archivo ambiguo
 * queda pendiente para siempre: no entra solo (correcto) y nadie puede
 * admitirlo (fallo).
 *
 * Lo que se muestra es metadata de listado. El contenido de un archivo no
 * admitido nunca se descargo.
 */
const decisionSchema = z
  .object({
    // Se decide por ID de archivo del proveedor, que es como se registra la
    // pertenencia: la carpeta es metadata, no clave.
    targetFileIds: z.array(z.string().min(1).max(200)).min(1).max(200),
    decision: z.enum(['admitir', 'descartar']),
  })
  .strict()

export async function candidateRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/sources/candidates', async (request) => {
    const session = await resolveCorpusScope(request, leerAmbito(request), ['sources.manage'])

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        target_file_id: string
        display_name: string | null
        mime_type: string | null
        modified_at: Date | null
        location_hint: string | null
        classification_reason: string | null
        provider_confirmed: boolean
        status: string
      }>(
        `select cm.target_file_id, cm.display_name, cm.mime_type, cm.modified_at,
                cm.location_hint, cm.classification_reason, cm.provider_confirmed, cm.status
           from collection_members cm
           join source_collections col
             on col.tenant_id = cm.tenant_id and col.id = cm.collection_id
           join source_connections sc
             on sc.tenant_id = col.tenant_id and sc.id = col.connection_id
          where sc.corpus_id = $1 and sc.status = 'active'
          order by cm.provider_confirmed desc, cm.modified_at desc nulls last, cm.display_name`,
        [session.corpusId],
      )

      const mapear = (r: (typeof rows)[number]) => ({
        targetFileId: r.target_file_id,
        // El nombre puede faltar si el archivo se descubrio antes de que se
        // guardara metadata: se declara, no se inventa.
        nombre: r.display_name ?? '(sin nombre registrado)',
        tipo: r.mime_type,
        modificado: r.modified_at,
        ubicacion: r.location_hint,
        motivo: r.classification_reason,
        confirmadoPorProveedor: r.provider_confirmed,
      })

      return {
        candidatos: rows.filter((r) => r.status === 'candidate').map(mapear),
        admitidos: rows.filter((r) => r.status === 'admitted').map(mapear),
        descartados: rows.filter((r) => r.status === 'withdrawn').length,
      }
    })
  })

  app.post('/v1/sources/candidates/decide', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['sources.manage'])

    const parsed = decisionSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')
    const { targetFileIds, decision } = parsed.data

    const resultado = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        const conexion = await client.query<{ id: string; corpus_id: string; generation: number }>(
          `select id, corpus_id, generation from source_connections
            where corpus_id = $1 and status = 'active'`,
          [session.corpusId],
        )
        const conn = conexion.rows[0]
        if (!conn) throw notFound('no hay una conexion activa en este espacio')

        // El filtro por coleccion de ESTA conexion evita que alguien admita un
        // identificador de archivo de otro espacio pasandolo en el cuerpo.
        const { rowCount } = await client.query(
          `update collection_members cm
              set status = $3,
                  reviewed_by = $4,
                  reviewed_at = now(),
                  admitted_at = case when $3 = 'admitted' then now() else cm.admitted_at end,
                  withdrawn_at = case when $3 = 'withdrawn' then now() else null end
             from source_collections col
            where col.tenant_id = cm.tenant_id
              and col.id = cm.collection_id
              and col.connection_id = $1
              and cm.target_file_id = any($2::text[])`,
          [
            conn.id,
            targetFileIds,
            decision === 'admitir' ? 'admitted' : 'withdrawn',
            session.userId,
          ],
        )

        if (rowCount === 0) throw notFound('ninguno de esos archivos pertenece a este espacio')

        // Admitir sin reindexar no sirve de nada: se encola la lectura de lo
        // recien admitido. Descartar no encola: el retiro de sus derivados lo
        // maneja la reconciliacion.
        if (decision === 'admitir') {
          await client.query(
            `insert into ingestion_jobs
               (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
                job_kind, pipeline_version, dedupe_key)
             values ($1,$2,$3,$4,'','reconcile','admit-1',$5)
             on conflict (tenant_id, dedupe_key) do nothing`,
            [
              session.tenantId,
              session.corpusId,
              conn.id,
              conn.generation,
              `admit:${conn.id}:${Date.now()}`,
            ],
          )
        }

        return rowCount
      },
    )

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.sync',
      resourceRef: null,
      result: 'allowed',
      requestId: request.requestId,
      // Cuantos, no cuales: los nombres de archivo no van a la auditoria.
      detail: { decision, archivos: resultado },
    })

    return { afectados: resultado, decision }
  })
}
