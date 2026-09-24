import type { PoolClient } from 'pg'
import { reciprocalRankFusion } from './rrf.js'
import type { RetrievalCandidate, RetrievalQuery } from './types.js'

/**
 * Recuperacion hibrida sobre el corpus AUTORIZADO.
 *
 * Nota importante de seguridad: estas consultas NO llevan filtro de tenant.
 * No es un olvido: corren dentro de `withAuthorizedTransaction`, donde RLS
 * ya restringe las filas visibles al tenant y corpus del contexto. Agregar
 * el filtro aqui daria una falsa sensacion de que el control vive en la
 * consulta, cuando vive en la base.
 *
 * Solo se recuperan fragmentos de versiones PUBLICADAS de documentos ACTIVOS:
 * una version antigua o un documento retirado nunca llegan al modelo.
 */
interface FilaCandidata {
  chunk_id: string
  document_id: string
  version_id: string
  title: string
  heading: string | null
  meeting_at: Date | null
  artifact_type: 'meeting_notes' | 'transcript' | 'manual_document'
  content: string
}

const SELECT_BASE = `
  select c.id as chunk_id,
         c.document_id,
         c.version_id,
         d.title,
         c.heading,
         d.meeting_at,
         d.artifact_type,
         c.content
    from chunks c
    join document_versions v on v.tenant_id = c.tenant_id
                            and v.corpus_id = c.corpus_id
                            and v.id = c.version_id
    join documents d on d.tenant_id = c.tenant_id
                    and d.corpus_id = c.corpus_id
                    and d.id = c.document_id
   where v.status = 'published'
     and d.status = 'active'
     and d.current_version_id = v.id
`

export async function hybridSearch(
  client: PoolClient,
  query: RetrievalQuery,
): Promise<RetrievalCandidate[]> {
  const limitePorEstrategia = Math.max(query.topK * 3, 30)

  const filtroTemporal: string[] = []
  const paramsTemporales: unknown[] = []
  if (query.since) {
    paramsTemporales.push(query.since)
    filtroTemporal.push(`and d.meeting_at >= $${paramsTemporales.length + 2}`)
  }
  if (query.until) {
    paramsTemporales.push(query.until)
    filtroTemporal.push(`and d.meeting_at <= $${paramsTemporales.length + 2}`)
  }
  const temporal = filtroTemporal.join(' ')

  // 1. Textual con ranking de Postgres, en espanol.
  const textual = await client.query<FilaCandidata>(
    `${SELECT_BASE} ${temporal}
       and c.search_vector @@ plainto_tsquery('spanish', $1)
     order by ts_rank(c.search_vector, plainto_tsquery('spanish', $1)) desc
     limit $2`,
    [query.question, limitePorEstrategia, ...paramsTemporales],
  )

  // 2. Exacta por subcadena: para expedientes, cifras y nombres propios que
  //    el analizador de texto puede partir o normalizar de mas.
  const termino = extraerTerminoExacto(query.question)
  const exacta = termino
    ? await client.query<FilaCandidata>(
        `${SELECT_BASE} ${temporal}
           and c.content ilike '%' || $1 || '%'
         order by length(c.content) asc
         limit $2`,
        [termino, limitePorEstrategia, ...paramsTemporales],
      )
    : { rows: [] as FilaCandidata[] }

  // 3. Vectorial. Si no hay adaptador de embeddings disponible, se omite y el
  //    sistema degrada a busqueda textual en vez de fallar.
  const vectorial = query.questionEmbedding
    ? await client.query<FilaCandidata>(
        `${SELECT_BASE} ${temporal}
         order by (select e.embedding from chunk_embeddings e where e.chunk_id = c.id) <=> $1::vector
         limit $2`,
        [JSON.stringify(query.questionEmbedding), limitePorEstrategia, ...paramsTemporales],
      )
    : { rows: [] as FilaCandidata[] }

  const fusionado = reciprocalRankFusion(
    [
      { items: textual.rows, peso: 1.0 },
      { items: vectorial.rows, peso: 1.0 },
      // La exacta pesa mas: si el usuario escribio un numero de expediente,
      // la coincidencia literal casi siempre es lo que busca.
      { items: exacta.rows, peso: 1.3 },
    ],
    (fila) => fila.chunk_id,
  )

  return fusionado.slice(0, query.topK).map(({ item, score, ranks }) => ({
    chunkId: item.chunk_id,
    documentId: item.document_id,
    documentVersionId: item.version_id,
    title: item.title,
    section: item.heading,
    meetingAt: item.meeting_at ? item.meeting_at.toISOString() : null,
    artifactType: item.artifact_type,
    content: item.content,
    signals: construirSenales(ranks),
    score,
  }))
}

/**
 * Extrae un termino candidato a busqueda literal: codigos, expedientes,
 * cifras o palabras entre comillas. Es una REGLA, no una decision del modelo.
 */
function extraerTerminoExacto(pregunta: string): string | null {
  const entreComillas = pregunta.match(/"([^"]{3,60})"/)
  if (entreComillas?.[1]) return entreComillas[1]

  const codigo = pregunta.match(/\b([A-Z]{2,}-?\d{2,}[\w-]*)\b/)
  if (codigo?.[1]) return codigo[1]

  const numero = pregunta.match(/\b(\d[\d.,]{3,})\b/)
  if (numero?.[1]) return numero[1]

  return null
}

/** Arma las senales omitiendo las estrategias que no aportaron el fragmento. */
function construirSenales(ranks: Map<number, number>): RetrievalCandidate['signals'] {
  const senales: RetrievalCandidate['signals'] = {}
  const textRank = ranks.get(0)
  const vectorRank = ranks.get(1)
  const exactRank = ranks.get(2)
  if (textRank !== undefined) senales.textRank = textRank
  if (vectorRank !== undefined) senales.vectorRank = vectorRank
  if (exactRank !== undefined) senales.exactRank = exactRank
  return senales
}
