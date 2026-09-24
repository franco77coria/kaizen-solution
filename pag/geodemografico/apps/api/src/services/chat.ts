import { createHash } from 'node:crypto'
import {
  AppError,
  LIMITS,
  conflict,
  notFound,
  type AnswerSource,
  type ChatAnswer,
  type CorpusScopedSession,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { createEmbeddingAdapter, createLlmAdapter, validateAnswer } from '@kaizen/llm'
import { filtrarVigentes, hybridSearch, type RetrievalCandidate } from '@kaizen/retrieval'
import { enrutar } from '@kaizen/query-plans'
import { leerEstadoDelEspacio, responderConversacional } from './conversacional.js'
import { logger } from '@kaizen/observability'
import { admitir, breakers } from '../plugins/admission.js'
import { registrarAuditoria } from './audit.js'
import { txContext } from '../plugins/session.js'

/**
 * Orquestacion de una pregunta.
 *
 * Orden deliberado:
 *   1. Admision y idempotencia (antes de gastar nada).
 *   2. Recuperacion dentro de una transaccion CORTA.
 *   3. Comprobacion de vigencia de las fuentes.
 *   4. Llamada al modelo FUERA de toda transaccion.
 *   5. Validacion de citas.
 *   6. Persistencia en una segunda transaccion corta.
 *
 * El punto 4 es una regla dura: mantener una transaccion abierta mientras el
 * proveedor genera inmoviliza una conexion del pool durante segundos y, con
 * suficiente concurrencia, agota el pool entero.
 */
/**
 * Progreso de una consulta, para transmitir en vivo.
 *
 * Son etapas REALES del pipeline, no una animacion decorativa: cada evento se
 * emite cuando esa etapa efectivamente termino. Si la busqueda tarda, el
 * usuario ve que esta buscando; no se le miente con una barra que avanza sola.
 */
export type EventoProgreso =
  | { etapa: 'enrutando' }
  | { etapa: 'buscando' }
  | { etapa: 'encontrado'; fragmentos: number; documentos: number }
  | { etapa: 'sin_evidencia' }
  | { etapa: 'redactando' }

export interface AskInput {
  session: CorpusScopedSession
  conversationId: string
  content: string
  idempotencyKey: string
  onProgreso?: (evento: EventoProgreso) => void
}

export async function ask(input: AskInput): Promise<ChatAnswer> {
  const { session } = input

  await admitir('chat', `${session.tenantId}:${session.userId}`)

  const requestHash = createHash('sha256')
    .update(input.conversationId)
    .update('\u0000')
    .update(input.content)
    .digest('hex')

  // --- 1. Idempotencia -----------------------------------------------------
  const reserva = await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const conversacion = await client.query<{ id: string; authz_version: number }>(
      `select id, authz_version from conversations where id = $1 and status = 'active'`,
      [input.conversationId],
    )
    // RLS ya limito a las conversaciones propias: si no aparece, no es suya.
    if (!conversacion.rows[0]) throw notFound('conversacion inexistente o ajena')

    if (conversacion.rows[0].authz_version !== session.authzVersion) {
      // Los permisos cambiaron desde que se creo el chat: no se reutiliza.
      throw new AppError('DEPENDENCY_REVOKED', 'los permisos cambiaron para esta conversacion')
    }

    const existente = await client.query<{
      id: string
      status: string
      request_hash: string
      result_message_id: string | null
    }>(
      `select id, status, request_hash, result_message_id
         from chat_requests
        where user_id = $1 and idempotency_key = $2`,
      [session.userId, input.idempotencyKey],
    )

    const previo = existente.rows[0]
    if (previo) {
      // Misma clave con distinto cuerpo: es un error del cliente, no una
      // reutilizacion. Devolver el resultado viejo seria responder otra cosa.
      if (previo.request_hash !== requestHash) {
        throw conflict('la clave de idempotencia ya se uso con otro contenido')
      }
      return { yaExiste: true, requestId: previo.id, messageId: previo.result_message_id }
    }

    const creada = await client.query<{ id: string }>(
      `insert into chat_requests
         (tenant_id, corpus_id, user_id, conversation_id, idempotency_key, request_hash, status, deadline_at)
       values ($1,$2,$3,$4,$5,$6,'running', now() + interval '45 seconds')
       returning id`,
      [
        session.tenantId,
        session.corpusId,
        session.userId,
        input.conversationId,
        input.idempotencyKey,
        requestHash,
      ],
    )

    await client.query(
      `insert into messages (tenant_id, corpus_id, conversation_id, role, status, content)
       values ($1,$2,$3,'user','complete',$4)`,
      [session.tenantId, session.corpusId, input.conversationId, input.content],
    )

    return { yaExiste: false, requestId: creada.rows[0]?.id ?? '', messageId: null }
  })

  if (reserva.yaExiste) {
    if (!reserva.messageId) {
      // La peticion original sigue corriendo. Un doble clic no lanza una
      // segunda generacion ni devuelve una respuesta a medias.
      throw conflict('la solicitud anterior con esa clave sigue en curso')
    }
    return await leerRespuestaGuardada(session, reserva.messageId)
  }

  try {
    const respuesta = await generar(input)
    await persistir(input, reserva.requestId, respuesta)
    // `evidencia` es plomeria interna: contiene el texto COMPLETO de todos los
    // fragmentos recuperados, incluidos los que el modelo no cito. Devolverlo
    // saltearia el contrato de citas y entregaria contenido que no respalda
    // ninguna afirmacion. Solo sale lo que esta en ChatAnswer.
    const { evidencia: _evidencia, ...publica } = respuesta
    return publica
  } catch (error) {
    await marcarFallo(session, reserva.requestId, error)
    throw error
  }
}

interface RespuestaGenerada extends ChatAnswer {
  evidencia: RetrievalCandidate[]
}

async function generar(input: AskInput): Promise<RespuestaGenerada> {
  const { session } = input

  const avisar = input.onProgreso ?? (() => {})
  avisar({ etapa: 'enrutando' })

  const embeddings = createEmbeddingAdapter()
  const llm = createLlmAdapter()

  // --- 0. Enrutamiento (ticket 17f) --------------------------------------
  // La ruta la decide una REGLA, no el modelo. Una pregunta de conteo no se
  // contesta leyendo notas: los numeros salen de la base.
  const ruta = enrutar(input.content, {
    puedeLeerNotas: session.permissions.has('notes.read'),
    puedeAgregar: session.permissions.has('analytics.aggregate'),
  })

  logger.info('chat.ruta', { tipo: ruta.tipo, motivo: ruta.motivo })

  // Saludos y preguntas sobre el propio asistente se responden con el ESTADO
  // REAL del espacio, sin pasar por el modelo ni por las notas. Abstenerse
  // ante un "hola" seria aplicar a un saludo una regla pensada para no
  // inventar hechos.
  if (ruta.tipo === 'conversacional') {
    const estado = await withAuthorizedTransaction('app', txContext(session), (client) =>
      leerEstadoDelEspacio(client),
    )
    return { ...responderConversacional(ruta.intencion, estado), evidencia: [] }
  }

  if (ruta.tipo !== 'notas') {
    // Una consulta agregada NO se responde por este camino: se le indica al
    // usuario que use la analitica, con la plantilla ya resuelta. Asi el
    // numero nunca sale de un parrafo de un acta.
    const explicacion =
      ruta.tipo === 'analitica'
        ? `Esa pregunta es un ${ruta.motivo} y se responde con una consulta agregada, no leyendo notas. ` +
          `Podés usar la analítica con la plantilla "${ruta.plan.template}" para obtener el número exacto.`
        : ruta.motivo

    return {
      abstained: true,
      answer: '',
      abstentionReason: explicacion,
      sources: [],
      summaryOnly: false,
      modelVersion: llm.status().model,
      promptVersion: 'enrutado-sin-llamada',
      evidencia: [],
    }
  }

  // --- 2. Vector de la pregunta -------------------------------------------
  // Si el proveedor de embeddings no esta disponible, se DEGRADA a busqueda
  // textual en vez de fallar: media respuesta util es mejor que ninguna, y el
  // usuario ve las fuentes igual.
  let vector: number[] | null = null
  if (embeddings.status().enabled) {
    try {
      const vectores = await breakers.embeddings.ejecutar(() =>
        embeddings.embed([input.content]),
      )
      vector = vectores[0] ?? null
    } catch (error) {
      logger.warn('chat.embeddings_no_disponibles', {
        requestId: session.sessionId,
        motivo: error instanceof Error ? error.message : 'desconocido',
      })
    }
  }

  // --- 3. Recuperacion y vigencia, en una transaccion corta ----------------
  avisar({ etapa: 'buscando' })

  const { vigentes, descartados } = await withAuthorizedTransaction(
    'app',
    txContext(session),
    async (client) => {
      const candidatos = await hybridSearch(client, {
        question: input.content,
        questionEmbedding: vector,
        topK: LIMITS.RETRIEVAL_TOP_K,
      })
      return filtrarVigentes(client, candidatos)
    },
  )

  if (descartados.length > 0) {
    logger.info('chat.fuentes_descartadas', {
      cantidad: descartados.length,
      motivos: descartados.map((d) => d.motivo).join(','),
    })
  }

  if (vigentes.length === 0) {
    avisar({ etapa: 'sin_evidencia' })
  } else {
    avisar({
      etapa: 'encontrado',
      fragmentos: vigentes.length,
      documentos: new Set(vigentes.map((c) => c.documentId)).size,
    })
  }

  // Sin evidencia autorizada, se responde con abstencion SIN llamar al modelo:
  // no tiene sentido gastar una llamada para que invente.
  if (vigentes.length === 0) {
    return {
      abstained: true,
      answer: '',
      abstentionReason: 'No encontre notas disponibles que respalden una respuesta.',
      sources: [],
      summaryOnly: false,
      modelVersion: llm.status().model,
      promptVersion: 'sin-llamada',
      evidencia: [],
    }
  }

  // --- 4. Modelo, FUERA de toda transaccion -------------------------------
  avisar({ etapa: 'redactando' })

  const salida = await breakers.llm.ejecutar(() =>
    llm.generateAnswer({
      question: input.content,
      evidence: vigentes.map((c) => ({
        chunkId: c.chunkId,
        documentId: c.documentId,
        documentVersionId: c.documentVersionId,
        title: c.title,
        section: c.section,
        meetingAt: c.meetingAt,
        artifactType: c.artifactType,
        content: c.content,
      })),
      locale: 'es',
      deadlineMs: LIMITS.CHAT_DEADLINE_MS,
    }),
  )

  // --- 5. Validacion de citas ---------------------------------------------
  const validacion = validateAnswer(
    salida.answer,
    vigentes.map((c) => ({
      chunkId: c.chunkId,
      documentId: c.documentId,
      documentVersionId: c.documentVersionId,
      title: c.title,
      section: c.section,
      meetingAt: c.meetingAt,
      artifactType: c.artifactType,
      content: c.content,
    })),
  )

  if (!validacion.ok) {
    logger.warn('chat.respuesta_rechazada', {
      problemas: validacion.problems.join('; '),
      modelo: salida.modelVersion,
    })
  }

  const respuesta = validacion.answer
  const porId = new Map(vigentes.map((c) => [c.chunkId, c]))

  const sources: AnswerSource[] = respuesta.citations.flatMap((cita) => {
    const chunk = porId.get(cita.chunkId)
    if (!chunk) return []
    return [
      {
        documentId: chunk.documentId,
        documentVersionId: chunk.documentVersionId,
        chunkId: chunk.chunkId,
        title: chunk.title,
        meetingAt: chunk.meetingAt,
        dateOrigin: chunk.meetingAt ? 'provider_meeting' : 'unknown',
        artifactType: chunk.artifactType,
        section: chunk.section,
        quote: cita.quote,
      },
    ]
  })

  // Si TODA la evidencia citada son notas resumidas, se avisa: una nota
  // resumida no conserva cada intervencion, y presentarla como si fuera una
  // transcripcion literal seria enganoso.
  const summaryOnly =
    sources.length > 0 && sources.every((s) => s.artifactType === 'meeting_notes')

  return {
    abstained: respuesta.abstained,
    answer: respuesta.answer,
    abstentionReason: respuesta.abstentionReason,
    sources,
    summaryOnly,
    modelVersion: salida.modelVersion,
    promptVersion: salida.promptVersion,
    evidencia: vigentes,
  }
}

async function persistir(
  input: AskInput,
  requestId: string,
  respuesta: RespuestaGenerada,
): Promise<void> {
  const { session } = input

  await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const versiones = [...new Set(respuesta.evidencia.map((c) => c.documentVersionId))]

    const mensaje = await client.query<{ id: string }>(
      `insert into messages
         (tenant_id, corpus_id, conversation_id, role, status, content,
          dependency_version_ids, model_version, prompt_version, summary_only)
       values ($1,$2,$3,'assistant',$4,$5,$6,$7,$8,$9)
       returning id`,
      [
        session.tenantId,
        session.corpusId,
        input.conversationId,
        respuesta.abstained ? 'abstained' : 'complete',
        respuesta.abstained ? respuesta.abstentionReason : respuesta.answer,
        versiones,
        respuesta.modelVersion,
        respuesta.promptVersion,
        respuesta.summaryOnly,
      ],
    )

    const messageId = mensaje.rows[0]?.id
    if (!messageId) throw new AppError('INTERNAL', 'no se pudo guardar el mensaje')

    for (const fuente of respuesta.sources) {
      await client.query(
        `insert into answer_sources
           (tenant_id, corpus_id, message_id, document_id, version_id, chunk_id,
            snapshot_title, snapshot_quote, snapshot_section)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          session.tenantId,
          session.corpusId,
          messageId,
          fuente.documentId,
          fuente.documentVersionId,
          fuente.chunkId,
          fuente.title,
          fuente.quote,
          fuente.section,
        ],
      )
    }

    await client.query(
      `update chat_requests set status = 'succeeded', result_message_id = $2, updated_at = now()
        where id = $1`,
      [requestId, messageId],
    )
  })

  await registrarAuditoria({
    actorUserId: session.userId,
    tenantId: session.tenantId,
    purposeId: session.purposeId,
    action: respuesta.abstained ? 'chat.abstained' : 'chat.message',
    resourceRef: input.conversationId,
    result: 'allowed',
    requestId,
    detail: {
      fuentes: respuesta.sources.length,
      modelo: respuesta.modelVersion,
      prompt: respuesta.promptVersion,
      solo_resumen: respuesta.summaryOnly,
    },
  })
}

async function marcarFallo(
  session: CorpusScopedSession,
  requestId: string,
  error: unknown,
): Promise<void> {
  const code = error instanceof AppError ? error.code : 'INTERNAL'
  try {
    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      await client.query(
        `update chat_requests set status = 'failed', error_code = $2, updated_at = now()
          where id = $1`,
        [requestId, code],
      )
    })
  } catch {
    // Si ni siquiera se puede marcar el fallo, el error original es el que
    // importa: no se lo pisa con este.
  }
}

async function leerRespuestaGuardada(
  session: CorpusScopedSession,
  messageId: string,
): Promise<ChatAnswer> {
  return withAuthorizedTransaction('app', txContext(session), async (client) => {
    const mensaje = await client.query<{
      content: string
      status: string
      model_version: string | null
      prompt_version: string | null
      summary_only: boolean
    }>(
      `select content, status, model_version, prompt_version, summary_only
         from messages where id = $1`,
      [messageId],
    )

    const fila = mensaje.rows[0]
    if (!fila) throw notFound('respuesta no disponible')

    // Se recuperan tambien los metadatos reales del documento. Rellenarlos con
    // valores por defecto haria que una respuesta reproducida por idempotencia
    // difiera de la original, y que la interfaz mostrara "fecha desconocida"
    // para una fuente que si tenia fecha.
    const fuentes = await client.query<{
      document_id: string
      version_id: string
      chunk_id: string
      snapshot_title: string
      snapshot_quote: string
      snapshot_section: string | null
      meeting_at: Date | null
      date_origin: AnswerSource['dateOrigin']
      artifact_type: AnswerSource['artifactType']
    }>(
      `select s.document_id, s.version_id, s.chunk_id,
              s.snapshot_title, s.snapshot_quote, s.snapshot_section,
              d.meeting_at, d.date_origin, d.artifact_type
         from answer_sources s
         join documents d on d.tenant_id = s.tenant_id
                         and d.corpus_id = s.corpus_id
                         and d.id = s.document_id
        where s.message_id = $1
        order by s.id`,
      [messageId],
    )

    const abstained = fila.status === 'abstained'

    return {
      abstained,
      answer: abstained ? '' : fila.content,
      abstentionReason: abstained ? fila.content : '',
      sources: fuentes.rows.map((f) => ({
        documentId: f.document_id,
        documentVersionId: f.version_id,
        chunkId: f.chunk_id,
        // El titulo es el del SNAPSHOT: si el documento se renombro despues,
        // la cita conserva el titulo con el que efectivamente se respondio.
        title: f.snapshot_title,
        meetingAt: f.meeting_at ? f.meeting_at.toISOString() : null,
        dateOrigin: f.date_origin,
        artifactType: f.artifact_type,
        section: f.snapshot_section,
        quote: f.snapshot_quote,
      })),
      summaryOnly: fila.summary_only,
      modelVersion: fila.model_version ?? 'desconocido',
      promptVersion: fila.prompt_version ?? 'desconocido',
    }
  })
}
