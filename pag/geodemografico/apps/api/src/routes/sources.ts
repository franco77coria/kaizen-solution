import type { FastifyInstance } from 'fastify'
import {
  forbidden,
  notFound,
  paginationSchema,
  syncSourcesSchema,
  validationFailed,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { admitir } from '../plugins/admission.js'
import { requireCsrf, resolveCorpusScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'

export async function sourceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Estado de la fuente para un lector. Devuelve lo MINIMO: cuantos documentos
   * hay disponibles y si hace falta reconectar. Los detalles operativos
   * (cursores, errores del proveedor, scopes) exigen `sources.manage`.
   */
  app.get('/v1/sources/status', async (request) => {
    // Vale CUALQUIERA de los dos permisos. Exigir solo `notes.read` dejaba al
    // administrador de fuentes -que normalmente no lo tiene- sin poder ver el
    // estado de la conexion que el mismo acaba de crear: la tarjeta le decia
    // "sin conexion activa" aunque la conexion existiera.
    const session = await resolveCorpusScope(request, leerAmbito(request), [])
    const puedeLeer = session.permissions.has('notes.read')
    const esGestor = session.permissions.has('sources.manage')

    if (!puedeLeer && !esGestor) {
      throw forbidden('falta notes.read o sources.manage')
    }

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      // `order by generation desc limit 1`: reconectar NO borra la conexion
      // anterior, la revoca y crea una nueva con generacion mayor. Sin este
      // orden, la consulta devolvia una fila arbitraria del historial y podia
      // informar "sin conexion activa" teniendo una activa.
      const conexion = await client.query<{
        status: string
        last_sync_at: Date | null
        granted_scopes: string[]
        cursor: string | null
        generation: number
        provider: string
      }>(
        `select status, last_sync_at, granted_scopes, cursor, generation, provider
           from source_connections
          where corpus_id = $1
          order by generation desc
          limit 1`,
        [session.corpusId],
      )

      const conteos = await client.query<{
        documentos: string
        reuniones: string
        sin_reunion: string
        incompletos: string
      }>(
        `select
           (select count(*) from documents d
             where d.corpus_id = $1 and d.status = 'active')::text as documentos,
           -- COUNT(DISTINCT meeting_id): nota y transcripcion de la misma
           -- reunion NO cuentan como dos reuniones.
           (select count(distinct md.meeting_id) from meeting_documents md
              join documents d2 on d2.tenant_id = md.tenant_id and d2.id = md.document_id
             where md.corpus_id = $1 and d2.status = 'active')::text as reuniones,
           (select count(*) from documents d3
             where d3.corpus_id = $1 and d3.status = 'active'
               and not exists (select 1 from meeting_documents md2
                                where md2.tenant_id = d3.tenant_id
                                  and md2.document_id = d3.id))::text as sin_reunion,
           (select count(*) from document_versions v
             where v.corpus_id = $1 and v.status = 'published'
               and v.extraction_complete = false)::text as incompletos`,
        [session.corpusId],
      )

      const fila = conteos.rows[0]
      const conn = conexion.rows[0]

      return {
        // Nunca se dice "listo" si el inventario quedo truncado o hay
        // extracciones incompletas: se informan las cantidades.
        connected: conn?.status === 'active',
        needsReauth: conn?.status === 'needs_reauth',
        lastSyncAt: conn?.last_sync_at ?? null,
        documentos: Number(fila?.documentos ?? 0),
        reuniones: Number(fila?.reuniones ?? 0),
        documentosSinReunionIdentificada: Number(fila?.sin_reunion ?? 0),
        extraccionesIncompletas: Number(fila?.incompletos ?? 0),
        ...(esGestor
          ? {
              operativo: {
                proveedor: conn?.provider ?? null,
                scopes: conn?.granted_scopes ?? [],
                cursor: conn?.cursor ?? null,
                generation: conn?.generation ?? 0,
              },
            }
          : {}),
      }
    })
  })

  /**
   * Sincronizacion manual. Exige permiso ADMINISTRATIVO sobre la fuente
   * compartida, no propiedad personal del corpus. El ambito lo pone el
   * servidor: el cliente solo elige el modo.
   */
  app.post('/v1/sources/sync', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['sources.manage'])
    await admitir('sync', `${session.tenantId}`)

    const parsed = syncSourcesSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    const jobId = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const conexion = await client.query<{ id: string; generation: number }>(
        `select id, generation from source_connections
          where corpus_id = $1 and status = 'active'`,
        [session.corpusId],
      )
      const conn = conexion.rows[0]
      if (!conn) throw notFound('no hay una conexion activa para este espacio')

      // La clave de deduplicacion incluye la generacion: tras una reconexion,
      // un trabajo con la misma clave logica es un trabajo nuevo.
      const dedupeKey = `sync:${conn.id}:${conn.generation}:${parsed.data.idempotencyKey}`

      const { rows } = await client.query<{ id: string }>(
        `insert into ingestion_jobs
           (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
            job_kind, pipeline_version, dedupe_key)
         values ($1,$2,$3,$4,'',$5,'api-1',$6)
         on conflict (tenant_id, dedupe_key) do update set updated_at = now()
         returning id`,
        [
          session.tenantId,
          session.corpusId,
          conn.id,
          conn.generation,
          parsed.data.mode === 'full_reconcile' ? 'reconcile' : 'extract',
          dedupeKey,
        ],
      )
      return rows[0]?.id ?? ''
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.sync',
      resourceRef: jobId,
      result: 'allowed',
      requestId: request.requestId,
      detail: { modo: parsed.data.mode },
    })

    return { jobId, status: 'queued' }
  })

  app.get('/v1/documents', async (request) => {
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])
    const page = paginationSchema.parse(request.query ?? {})

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        title: string
        artifact_type: string
        meeting_at: Date | null
        date_origin: string
        extraction_complete: boolean
      }>(
        `select d.id, d.title, d.artifact_type, d.meeting_at, d.date_origin,
                coalesce(v.extraction_complete, true) as extraction_complete
           from documents d
           left join document_versions v
                  on v.tenant_id = d.tenant_id
                 and v.corpus_id = d.corpus_id
                 and v.id = d.current_version_id
          where d.status = 'active'
          order by d.meeting_at desc nulls last, d.title asc
          limit $1`,
        [page.limit],
      )

      return {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          artifactType: r.artifact_type,
          meetingAt: r.meeting_at,
          // Se expone de donde salio la fecha: "desconocida" es un valor
          // legitimo y la interfaz no debe inventar una.
          dateOrigin: r.date_origin,
          extractionComplete: r.extraction_complete,
        })),
      }
    })
  })
}
