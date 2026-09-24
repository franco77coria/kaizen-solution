import type { PoolClient } from 'pg'
import { LIMITS } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { createEmbeddingAdapter } from '@kaizen/llm'
import { logger } from '@kaizen/observability'
import {
  CHUNK_PIPELINE_VERSION,
  PARSER_VERSION,
  chunkDocument,
  classifyFile,
  deduplicarPorDestino,
  parseDocument,
  resolveMeetingIdentity,
  type SourceProvider,
} from '@kaizen/connector-google-drive'

/**
 * Ticket 09 — pipeline de ingesta idempotente.
 *
 * Propiedades que sostiene:
 *   - Publicacion ATOMICA: los fragmentos nuevos y el cambio de version
 *     ocurren en la misma transaccion. Nunca se ve media version indexada.
 *   - Idempotencia por `content_hash`: reprocesar el mismo contenido no crea
 *     una version nueva ni duplica fragmentos.
 *   - Orden: un mensaje viejo que llega tarde NO puede publicar una version
 *     anterior sobre una posterior.
 *   - Leases: si el proceso se cae, el trabajo vuelve a estar disponible
 *     cuando vence el lease, sin quedar bloqueado para siempre.
 */
export interface IngestContext {
  tenantId: string
  corpusId: string
  purposeId: string
  connectionId: string
  connectionGeneration: number
  provider: SourceProvider
}

export interface IngestOutcome {
  fileId: string
  resultado: 'publicado' | 'sin_cambios' | 'retirado' | 'omitido'
  motivo?: string
}

const ctx = (c: IngestContext) => ({
  tenantId: c.tenantId,
  corpusId: c.corpusId,
  purposeId: c.purposeId,
})

/** Inventario completo y construccion del manifiesto virtual. */
export async function inventariar(
  context: IngestContext,
  collectionId: string,
): Promise<{ candidatos: number; admitidos: number; pendientes: number; duplicados: number }> {
  const todos = []
  let pageToken: string | undefined

  do {
    const pagina = await context.provider.listFiles({
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    })
    todos.push(...pagina.files)
    pageToken = pagina.nextPageToken ?? undefined
  } while (pageToken)

  // Un acceso directo y su destino son el MISMO archivo: una nota que aparece
  // en dos carpetas no puede contar dos veces.
  const { unicos, duplicados } = deduplicarPorDestino(todos)

  let admitidos = 0
  let pendientes = 0

  await withAuthorizedTransaction('worker', ctx(context), async (client) => {
    const coleccion = await client.query<{ allowed_mime_types: string[]; admission_rule: unknown }>(
      `select allowed_mime_types, admission_rule from source_collections where id = $1`,
      [collectionId],
    )
    const reglas = coleccion.rows[0]
    if (!reglas) throw new Error('coleccion inexistente')

    for (const file of unicos) {
      if (file.trashed || !file.canRead) continue
      if (
        reglas.allowed_mime_types.length > 0 &&
        !reglas.allowed_mime_types.includes(file.mimeType)
      ) {
        // Fuera de los tipos admitidos: ni siquiera se descarga el cuerpo.
        continue
      }

      const clasificacion = classifyFile(file)
      const destino = file.shortcutTargetId ?? file.id

      // Solo entra solo lo que el proveedor confirma como reunion. Lo demas
      // queda como CANDIDATO a la espera de seleccion humana: un clasificador
      // no concede acceso.
      const entraSolo = !clasificacion.needsConfirmation || reglas.admission_rule !== null
      const estado = entraSolo ? 'admitted' : 'candidate'

      // Se guarda la metadata de LISTADO (nombre, tipo, fecha, carpeta) para
      // que una persona pueda decidir. Nunca se descarga el contenido de un
      // archivo que todavia no fue admitido.
      //
      // `do update` solo refresca la metadata: NO toca `status`, para que una
      // decision humana ya tomada no se pise en la siguiente sincronizacion.
      await client.query(
        `insert into collection_members
           (tenant_id, collection_id, provider_file_id, target_file_id, admitted_by, status,
            display_name, mime_type, modified_at, location_hint,
            classification_reason, provider_confirmed)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         on conflict (tenant_id, collection_id, target_file_id) do update
           set display_name = excluded.display_name,
               mime_type = excluded.mime_type,
               modified_at = excluded.modified_at,
               location_hint = excluded.location_hint,
               classification_reason = excluded.classification_reason,
               provider_confirmed = excluded.provider_confirmed`,
        [
          context.tenantId,
          collectionId,
          file.id,
          destino,
          reglas.admission_rule !== null ? 'admission_rule' : 'manual_selection',
          estado,
          file.name,
          file.mimeType,
          file.modifiedTime,
          file.parents[0] ?? null,
          clasificacion.reason,
          clasificacion.confidence === 'provider_signal',
        ],
      )

      if (estado === 'admitted') admitidos++
      else pendientes++
    }
  })

  return { candidatos: unicos.length, admitidos, pendientes, duplicados: duplicados.length }
}

/** Extrae, segmenta, vectoriza y publica UN archivo admitido. */
export async function ingerirArchivo(
  context: IngestContext,
  fileId: string,
): Promise<IngestOutcome> {
  const file = await context.provider.getFile(fileId)

  // El documento se retira en los tres casos, pero el MOTIVO se distingue:
  // para auditar despues por que desaparecio un dato no da lo mismo que el
  // archivo se haya borrado a que nos hayan quitado el permiso.
  if (!file || file.trashed || !file.canRead) {
    const motivo = file?.trashed
      ? ('source_removed' as const)
      : // Sin archivo tampoco se puede distinguir borrado de revocacion, y
        // ante la duda se registra la hipotesis mas conservadora.
        ('access_revoked' as const)

    await retirar(context, fileId, motivo)
    return {
      fileId,
      resultado: 'retirado',
      motivo: motivo === 'source_removed' ? 'archivo en la papelera' : 'sin permiso de lectura',
    }
  }

  const documento = await context.provider.exportDocument(fileId)
  const parsed = parseDocument(documento)

  if (parsed.charCount === 0 && parsed.complete) {
    return { fileId, resultado: 'omitido', motivo: 'documento sin texto extraible' }
  }

  const clasificacion = classifyFile(file)
  const identidad = resolveMeetingIdentity(file)
  const chunks = chunkDocument(parsed)

  // Los embeddings se calculan FUERA de la transaccion: llamar a un proveedor
  // externo con una transaccion abierta inmoviliza una conexion del pool.
  const embeddings = createEmbeddingAdapter()
  let vectores: number[][] = []
  if (embeddings.status().enabled && chunks.length > 0) {
    try {
      vectores = await embeddings.embed(chunks.map((c) => c.content))
    } catch (error) {
      // Sin vectores el documento se publica igual: la busqueda textual
      // sigue funcionando y es preferible a no indexar nada.
      logger.warn('ingest.embeddings_fallaron', {
        fileId,
        motivo: error instanceof Error ? error.message : 'desconocido',
      })
    }
  }

  return withAuthorizedTransaction('worker', ctx(context), async (client) => {
    // La generacion de la conexion se revalida DENTRO de la transaccion: si
    // hubo una reconexion mientras se extraia, este trabajo quedo obsoleto.
    const conexion = await client.query<{ generation: number; status: string }>(
      `select generation, status from source_connections where id = $1`,
      [context.connectionId],
    )
    const conn = conexion.rows[0]
    if (!conn || conn.status !== 'active') {
      return { fileId, resultado: 'omitido' as const, motivo: 'conexion inactiva' }
    }
    if (conn.generation !== context.connectionGeneration) {
      return { fileId, resultado: 'omitido' as const, motivo: 'generacion obsoleta' }
    }

    const documentId = await upsertDocumento(client, context, {
      fileId,
      titulo: parsed.title || file.name,
      artifactType: clasificacion.artifactType,
      meetingAt: identidad.startedAt,
      // Se distingue de donde salio la fecha. 'unknown' es un valor legitimo:
      // la interfaz muestra "fecha desconocida" en vez de inventar una.
      dateOrigin:
        identidad.confidence === 'provider_key'
          ? 'provider_meeting'
          : identidad.startedAt
            ? 'parsed_heading'
            : 'unknown',
    })

    // Idempotencia por contenido: si el hash coincide con la version vigente,
    // no se crea una version nueva ni se reindexa.
    const vigente = await client.query<{ id: string; content_hash: string }>(
      `select v.id, v.content_hash
         from documents d
         join document_versions v
           on v.tenant_id = d.tenant_id and v.corpus_id = d.corpus_id and v.id = d.current_version_id
        where d.id = $1`,
      [documentId],
    )

    if (vigente.rows[0]?.content_hash === parsed.contentHash) {
      return { fileId, resultado: 'sin_cambios' as const }
    }

    // Un mensaje viejo que llega tarde no puede pisar una version posterior.
    const yaExiste = await client.query<{ id: string; status: string }>(
      `select id, status from document_versions
        where document_id = $1 and source_version = $2`,
      [documentId, parsed.version],
    )
    if (yaExiste.rows[0]?.status === 'superseded') {
      return { fileId, resultado: 'omitido' as const, motivo: 'version ya superada' }
    }

    const version = await client.query<{ id: string }>(
      `insert into document_versions
         (tenant_id, corpus_id, document_id, source_version, content_hash, parser_version,
          status, extraction_complete, extraction_note, char_count)
       values ($1,$2,$3,$4,$5,$6,'staging',$7,$8,$9)
       on conflict (tenant_id, document_id, source_version)
         do update set content_hash = excluded.content_hash, status = 'staging'
       returning id`,
      [
        context.tenantId,
        context.corpusId,
        documentId,
        parsed.version,
        parsed.contentHash,
        PARSER_VERSION,
        parsed.complete,
        parsed.incompleteReason,
        parsed.charCount,
      ],
    )
    const versionId = version.rows[0]?.id
    if (!versionId) throw new Error('no se pudo crear la version')

    // Staging limpio: si un intento anterior dejo fragmentos a medias, se
    // borran antes de escribir los nuevos.
    await client.query(`delete from chunks where version_id = $1`, [versionId])

    for (const [i, chunk] of chunks.entries()) {
      const insertado = await client.query<{ id: string }>(
        `insert into chunks
           (tenant_id, corpus_id, document_id, version_id, ordinal, content, tab_id,
            heading, char_start, char_end, token_estimate)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning id`,
        [
          context.tenantId,
          context.corpusId,
          documentId,
          versionId,
          chunk.ordinal,
          chunk.content,
          chunk.tabId,
          chunk.heading,
          chunk.charStart,
          chunk.charEnd,
          chunk.tokenEstimate,
        ],
      )

      const chunkId = insertado.rows[0]?.id
      const vector = vectores[i]
      if (chunkId && vector) {
        await client.query(
          `insert into chunk_embeddings
             (chunk_id, tenant_id, corpus_id, embedding_model, dimension, pipeline_version, embedding)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [
            chunkId,
            context.tenantId,
            context.corpusId,
            embeddings.model,
            embeddings.dimension,
            CHUNK_PIPELINE_VERSION,
            JSON.stringify(vector),
          ],
        )
      }
    }

    // Publicacion ATOMICA: la version pasa a publicada y el documento apunta
    // a ella en la misma transaccion que escribio los fragmentos.
    await client.query(
      `update document_versions set status = 'superseded'
        where document_id = $1 and id <> $2 and status = 'published'`,
      [documentId, versionId],
    )
    await client.query(
      `update document_versions set status = 'published', indexed_at = now() where id = $1`,
      [versionId],
    )
    await client.query(`update documents set current_version_id = $2 where id = $1`, [
      documentId,
      versionId,
    ])

    await vincularReunion(client, context, documentId, identidad, clasificacion.artifactType)

    return { fileId, resultado: 'publicado' as const }
  })
}

async function upsertDocumento(
  client: PoolClient,
  context: IngestContext,
  datos: {
    fileId: string
    titulo: string
    artifactType: 'meeting_notes' | 'transcript' | 'manual_document'
    meetingAt: string | null
    dateOrigin: string
  },
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into documents
       (tenant_id, corpus_id, purpose_id, connection_id, source_file_id, artifact_type,
        title, meeting_at, date_origin, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')
     on conflict (tenant_id, corpus_id, source_file_id)
       do update set title = excluded.title,
                     artifact_type = excluded.artifact_type,
                     meeting_at = excluded.meeting_at,
                     date_origin = excluded.date_origin,
                     -- La conexion tiene que seguir a la credencial por la que
                     -- se acaba de leer el archivo. Sin esta linea el documento
                     -- queda clavado en la conexion con la que entro la primera
                     -- vez, y esa conexion se revoca en cuanto alguien
                     -- reconecta Google.
                     --
                     -- El efecto no se parece a la causa: la comprobacion de
                     -- vigencia mira el estado de ESTA conexion, asi que todos
                     -- los fragmentos se descartaban por "conexion revocada" y
                     -- el asistente contestaba "no encontre notas" mientras el
                     -- tablero seguia mostrando los documentos. Y no se
                     -- arreglaba reconectando: cada reconexion revocaba una
                     -- generacion mas y dejaba el corpus igual de ciego.
                     connection_id = excluded.connection_id,
                     status = 'active'
     returning id`,
    [
      context.tenantId,
      context.corpusId,
      context.purposeId,
      context.connectionId,
      datos.fileId,
      datos.artifactType,
      datos.titulo,
      datos.meetingAt,
      datos.dateOrigin,
    ],
  )

  const id = rows[0]?.id
  if (!id) throw new Error('no se pudo registrar el documento')
  return id
}

/**
 * Vincula el documento a una reunion SOLO si el proveedor dio una clave
 * estable. Sin clave, el documento queda sin reunion identificada, y esa
 * cantidad se informa en el estado de la fuente como limite de cobertura.
 *
 * Nunca se agrupan documentos por titulo parecido: dos actas llamadas igual
 * son dos documentos, y fusionarlas falsearia el conteo de reuniones.
 */
async function vincularReunion(
  client: PoolClient,
  context: IngestContext,
  documentId: string,
  identidad: { providerMeetingKey: string | null; confidence: string; startedAt: string | null },
  artifactType: 'meeting_notes' | 'transcript' | 'manual_document',
): Promise<void> {
  if (!identidad.providerMeetingKey) return

  const reunion = await client.query<{ id: string }>(
    `insert into meetings
       (tenant_id, corpus_id, purpose_id, provider_meeting_key, started_at, identity_confidence)
     values ($1,$2,$3,$4,$5,'provider_key')
     on conflict (tenant_id, corpus_id, provider_meeting_key) do update set started_at = excluded.started_at
     returning id`,
    [
      context.tenantId,
      context.corpusId,
      context.purposeId,
      identidad.providerMeetingKey,
      identidad.startedAt,
    ],
  )

  const meetingId = reunion.rows[0]?.id
  if (!meetingId) return

  await client.query(
    `insert into meeting_documents (tenant_id, corpus_id, meeting_id, document_id, artifact_type)
     values ($1,$2,$3,$4,$5)
     on conflict (tenant_id, document_id) do update set meeting_id = excluded.meeting_id`,
    [context.tenantId, context.corpusId, meetingId, documentId, artifactType],
  )
}

async function retirar(
  context: IngestContext,
  fileId: string,
  motivo: 'source_removed' | 'access_revoked',
): Promise<void> {
  await withAuthorizedTransaction('worker', ctx(context), async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `update documents set status = 'withdrawn'
        where corpus_id = $1 and source_file_id = $2 and status = 'active'
        returning id`,
      [context.corpusId, fileId],
    )

    const documentId = rows[0]?.id
    if (!documentId) return

    await client.query(
      `update document_versions set status = 'withdrawn' where document_id = $1`,
      [documentId],
    )

    // El historial NO se toca desde aca, por dos razones:
    //
    //   1. El worker no tiene -ni debe tener- privilegios sobre `messages`:
    //      no puede ver conversaciones de nadie.
    //   2. Aunque los tuviera, RLS acotaria el UPDATE a los chats del usuario
    //      del contexto, dejando los del resto sin marcar y SIN fallar.
    //
    // La validez de un mensaje se DERIVA al leerlo, comprobando que todas sus
    // versiones de dependencia sigan publicadas. Un dato derivado no puede
    // quedar a medias.

    await client.query(
      `insert into deletion_tombstones
         (tenant_id, corpus_id, resource_kind, resource_ref, reason, scope)
       values ($1,$2,'document',$3,$4,'document')`,
      [context.tenantId, context.corpusId, documentId, motivo],
    )
  })
}

/**
 * Toma un trabajo pendiente con LEASE. Si el proceso muere, el lease vence y
 * el trabajo vuelve a la cola en vez de quedar bloqueado para siempre.
 */
export async function tomarTrabajo(
  tenantId: string,
  corpusId: string,
  holder: string,
): Promise<{ id: string; fileId: string; kind: string; connectionId: string; generation: number } | null> {
  return withAuthorizedTransaction(
    'worker',
    { tenantId, corpusId },
    async (client) => {
      const { rows } = await client.query<{
        id: string
        provider_file_id: string
        job_kind: string
        connection_id: string
        connection_generation: number
      }>(
        `update ingestion_jobs
            set status = 'leased',
                lease_until = now() + make_interval(secs => $2),
                lease_holder = $3,
                attempts = attempts + 1,
                updated_at = now()
          where id = (
            select id from ingestion_jobs
             where corpus_id = $1
               and (status = 'queued' or (status = 'leased' and lease_until < now()))
               and attempts < $4
             order by created_at asc
             for update skip locked
             limit 1
          )
          returning id, provider_file_id, job_kind, connection_id, connection_generation`,
        [corpusId, LIMITS.JOB_LEASE_MS / 1000, holder, LIMITS.JOB_MAX_ATTEMPTS],
      )

      const fila = rows[0]
      if (!fila) return null

      return {
        id: fila.id,
        fileId: fila.provider_file_id,
        kind: fila.job_kind,
        connectionId: fila.connection_id,
        generation: fila.connection_generation,
      }
    },
  )
}

export async function cerrarTrabajo(
  tenantId: string,
  corpusId: string,
  jobId: string,
  resultado: 'succeeded' | 'failed',
  errorClass?: string,
): Promise<void> {
  await withAuthorizedTransaction('worker', { tenantId, corpusId }, async (client) => {
    await client.query(
      `update ingestion_jobs
          set status = case
                when $2 = 'failed' and attempts >= $4 then 'dead'
                else $2
              end,
              error_class = $3,
              lease_until = null,
              lease_holder = null,
              updated_at = now()
        where id = $1`,
      [jobId, resultado, errorClass ?? null, LIMITS.JOB_MAX_ATTEMPTS],
    )
  })
}
