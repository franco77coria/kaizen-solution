import type { PoolClient } from 'pg'
import type { RetrievalCandidate } from './types.js'

/**
 * Ticket 12 — comprobacion VIGENTE de fuentes.
 *
 * Que un fragmento este indexado no significa que siga siendo legible hoy.
 * Entre la indexacion y la pregunta pueden haber pasado: el documento se
 * retiro, su version quedo superseded, la conexion se revoco o el archivo
 * salio de la coleccion. Cualquiera de esos casos lo saca del contexto
 * ANTES de llamar al modelo.
 *
 * Esta comprobacion no reemplaza a RLS: RLS decide de que tenant es el dato,
 * esto decide si el dato sigue autorizado dentro de ese tenant.
 */
export interface RevocationOutcome {
  vigentes: RetrievalCandidate[]
  descartados: Array<{ chunkId: string; motivo: string }>
}

export async function filtrarVigentes(
  client: PoolClient,
  candidatos: RetrievalCandidate[],
): Promise<RevocationOutcome> {
  if (candidatos.length === 0) return { vigentes: [], descartados: [] }

  const ids = candidatos.map((c) => c.chunkId)

  const { rows } = await client.query<{ chunk_id: string; motivo: string | null }>(
    `select c.id as chunk_id,
            case
              when d.status <> 'active'            then 'documento retirado'
              when v.status <> 'published'         then 'version no vigente'
              when d.current_version_id <> v.id    then 'version superada'
              when sc.status <> 'active'           then 'conexion revocada'
              when cm.status is distinct from 'admitted' then 'archivo fuera de la coleccion'
              else null
            end as motivo
       from chunks c
       join document_versions v on v.tenant_id = c.tenant_id and v.corpus_id = c.corpus_id and v.id = c.version_id
       join documents d on d.tenant_id = c.tenant_id and d.corpus_id = c.corpus_id and d.id = c.document_id
       join source_connections sc on sc.tenant_id = d.tenant_id and sc.id = d.connection_id
       left join source_collections col on col.tenant_id = sc.tenant_id and col.connection_id = sc.id
       left join collection_members cm on cm.tenant_id = col.tenant_id
                                      and cm.collection_id = col.id
                                      and cm.target_file_id = d.source_file_id
      where c.id = any($1::uuid[])`,
    [ids],
  )

  const motivoPorChunk = new Map(rows.map((r) => [r.chunk_id, r.motivo]))

  const vigentes: RetrievalCandidate[] = []
  const descartados: Array<{ chunkId: string; motivo: string }> = []

  for (const candidato of candidatos) {
    // Si el chunk ya no aparece en la consulta, desaparecio o dejo de ser
    // visible. Falla CERRADA: fuera del contexto.
    if (!motivoPorChunk.has(candidato.chunkId)) {
      descartados.push({ chunkId: candidato.chunkId, motivo: 'fragmento no disponible' })
      continue
    }

    const motivo = motivoPorChunk.get(candidato.chunkId)
    if (motivo) {
      descartados.push({ chunkId: candidato.chunkId, motivo })
      continue
    }

    vigentes.push(candidato)
  }

  return { vigentes, descartados }
}

/**
 * Propaga la revocacion de una fuente: retira sus documentos y sus versiones,
 * y deja una lapida de borrado para purgar los derivados.
 *
 * El historial NO se borra ni se reescribe: un mensaje deja de mostrarse
 * cuando alguna de sus versiones de dependencia ya no esta publicada, y eso se
 * comprueba al leerlo.
 */
export async function propagarRevocacion(
  client: PoolClient,
  connectionId: string,
  motivo: 'source_removed' | 'access_revoked' | 'user_request' | 'retention',
): Promise<{ documentos: number }> {
  const documentos = await client.query<{ id: string }>(
    `update documents
        set status = 'withdrawn'
      where connection_id = $1 and status = 'active'
      returning id`,
    [connectionId],
  )

  if (documentos.rowCount === 0) return { documentos: 0 }

  const docIds = documentos.rows.map((r) => r.id)

  // Los derivados caen por FK en cascada cuando se borra, pero aqui NO se
  // borra: se retira. Las versiones se marcan explicitamente.
  await client.query(
    `update document_versions set status = 'withdrawn'
      where document_id = any($1::uuid[]) and status <> 'withdrawn'`,
    [docIds],
  )

  // El historial no se reescribe: la validez de un mensaje se DERIVA de que
  // sus versiones de dependencia sigan publicadas. Ver el comentario extenso
  // en apps/worker/src/ingest.ts.

  for (const id of docIds) {
    await client.query(
      `insert into deletion_tombstones (tenant_id, corpus_id, resource_kind, resource_ref, reason, scope)
       select tenant_id, corpus_id, 'document', $2, $3, 'document'
         from documents where id = $1`,
      [id, id, motivo],
    )
  }

  return { documentos: documentos.rowCount ?? 0 }
}
