import {
  AppError,
  DASHBOARD_DIAS_VIGENCIA,
  conflict,
  notFound,
  type AnswerSource,
  type CorpusScopedSession,
  type DashboardDocumento,
  type QueryTemplate,
  type RespuestaDatos,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { createLlmAdapter, validateAnswer, type EvidenceChunk } from '@kaizen/llm'
import { logger } from '@kaizen/observability'
import { breakers } from '../plugins/admission.js'
import { txContext } from '../plugins/session.js'
import { ejecutarAnalitica } from './analytics.js'
import { registrarAuditoria } from './audit.js'
import { leerRespuestaGuardada } from './chat.js'
import { describirPlan } from './datos-chat.js'

/**
 * Crea un dashboard a partir de una respuesta de SUMA.
 *
 * Que entra y de donde sale cada cosa:
 *   - El RESUMEN lo redacta el modelo con el mismo contrato que el chat, y
 *     solo con los fragmentos que la respuesta ya habia citado. Pasa por el
 *     mismo validador de citas. Si el modelo falla, se abstiene o no valida,
 *     se usa la respuesta original de SUMA (ya validada al responder).
 *   - Los DATOS son resultados de consultas cerradas, con supresion. Si la
 *     pregunta fue de datos, se suman los indicadores estandar del espacio.
 *     El modelo no escribe ningun numero.
 */

/** Indicadores que acompanan a una respuesta de datos. */
const PANORAMA: QueryTemplate[] = [
  'records.total',
  'records.count_by_municipality',
  'records.count_by_gender',
  'records.count_by_capture_month',
]

const PROMPT_RESUMEN = (pregunta: string) =>
  `Redactá un resumen ejecutivo breve (de 3 a 5 oraciones), para un tablero de gerencia, ` +
  `sobre lo que responde esta pregunta: "${pregunta}". Usá únicamente la evidencia.`

export async function crearDashboard(input: {
  session: CorpusScopedSession
  messageId: string
  requestId: string
}): Promise<{ id: string }> {
  const { session, messageId } = input

  // --- 1. La respuesta y su pregunta (RLS: solo conversaciones propias) ----
  const origen = await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const { rows } = await client.query<{
      conversation_id: string
      created_at: Date
      vigente: boolean
    }>(
      `select m.conversation_id, m.created_at,
              not exists (
                select 1 from unnest(m.dependency_version_ids) as dep(version_id)
                  left join document_versions v on v.tenant_id = m.tenant_id and v.id = dep.version_id
                 where v.id is null or v.status <> 'published'
              ) as vigente
         from messages m
        where m.id = $1 and m.role = 'assistant' and m.status = 'complete'`,
      [messageId],
    )
    const mensaje = rows[0]
    if (!mensaje) throw notFound('respuesta inexistente, ajena o sin contenido')
    if (!mensaje.vigente) throw conflict('la respuesta dependia de una fuente que ya no esta disponible')

    const pregunta = await client.query<{ content: string }>(
      `select content from messages
        where conversation_id = $1 and role = 'user' and created_at <= $2
        order by created_at desc limit 1`,
      [mensaje.conversation_id, mensaje.created_at],
    )
    const epoch = await client.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [session.tenantId],
    )
    return {
      pregunta: pregunta.rows[0]?.content ?? 'Consulta a SUMA',
      privacyEpoch: epoch.rows[0]?.privacy_epoch ?? 0,
    }
  })

  const respuesta = await leerRespuestaGuardada(session, messageId)

  // --- 2. Datos ---------------------------------------------------------
  const datos: RespuestaDatos[] = respuesta.datos ? [respuesta.datos] : []
  if (respuesta.datos && session.permissions.has('analytics.aggregate')) {
    for (const template of PANORAMA) {
      const repetido = datos.some((d) => d.template === template && d.filtros.length === 0)
      if (repetido) continue
      const plan = { template, filters: [], limit: 200 }
      const { runId, result } = await ejecutarAnalitica({
        session,
        plan,
        idempotencyKey: `dash:${messageId}:${template}`,
        requestId: input.requestId,
      })
      const { titulo, filtros } = describirPlan(plan)
      datos.push({ runId, template, titulo, filtros, resultado: result })
    }
  }

  // --- 3. Resumen ---------------------------------------------------------
  const resumen =
    respuesta.sources.length > 0
      ? await redactarResumen(session, origen.pregunta, respuesta.answer, respuesta.sources)
      : respuesta.answer && !respuesta.datos
        ? { texto: respuesta.answer, fuentes: [], generado: false }
        : null

  const documento: DashboardDocumento = { version: 1, pregunta: origen.pregunta, resumen, datos }
  const titulo = origen.pregunta.replace(/\s+/g, ' ').trim().slice(0, 160) || 'Dashboard de SUMA'

  // --- 4. Guardado ------------------------------------------------------
  const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `insert into dashboards
         (tenant_id, purpose_id, owner_user_id, autor, titulo, documento, privacy_epoch, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7, now() + make_interval(days => $8))
       returning id`,
      [
        session.tenantId,
        session.purposeId,
        session.userId,
        session.emailDisplay,
        titulo,
        JSON.stringify(documento),
        origen.privacyEpoch,
        DASHBOARD_DIAS_VIGENCIA,
      ],
    )
    const creado = rows[0]?.id
    if (!creado) throw new AppError('INTERNAL', 'no se pudo guardar el dashboard')
    return creado
  })

  await registrarAuditoria({
    actorUserId: session.userId,
    tenantId: session.tenantId,
    purposeId: session.purposeId,
    action: 'dashboard.create',
    resourceRef: id,
    result: 'allowed',
    requestId: input.requestId,
    detail: { datos: datos.length, resumen_generado: resumen?.generado ?? false },
  })

  return { id }
}

/**
 * Resumen ejecutivo con el mismo contrato y validador que el chat. La
 * evidencia son SOLO los fragmentos que la respuesta ya citaba (reautorizados
 * y vigentes); si algo falla, queda la respuesta original.
 */
async function redactarResumen(
  session: CorpusScopedSession,
  pregunta: string,
  respuestaOriginal: string,
  fuentesOriginales: AnswerSource[],
): Promise<NonNullable<DashboardDocumento['resumen']>> {
  const original = { texto: respuestaOriginal, fuentes: fuentesOriginales, generado: false }
  const llm = createLlmAdapter()
  if (!llm.status().enabled) return original

  const evidencia = await withAuthorizedTransaction('app', txContext(session), async (client) => {
    const { rows } = await client.query<{
      chunk_id: string
      document_id: string
      version_id: string
      content: string
      heading: string | null
      title: string
      meeting_at: Date | null
      artifact_type: EvidenceChunk['artifactType']
    }>(
      `select c.id as chunk_id, c.document_id, c.version_id, c.content, c.heading,
              d.title, d.meeting_at, d.artifact_type
         from chunks c
         join documents d on d.tenant_id = c.tenant_id and d.id = c.document_id
         join document_versions v on v.tenant_id = c.tenant_id and v.id = c.version_id
        where c.id = any($1::uuid[]) and v.status = 'published'`,
      [[...new Set(fuentesOriginales.map((f) => f.chunkId))]],
    )
    return rows.map(
      (r): EvidenceChunk => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        documentVersionId: r.version_id,
        title: r.title,
        section: r.heading,
        meetingAt: r.meeting_at ? r.meeting_at.toISOString() : null,
        artifactType: r.artifact_type,
        content: r.content,
      }),
    )
  })
  if (evidencia.length === 0) return original

  try {
    const salida = await breakers.llm.ejecutar(() =>
      llm.generateAnswer({ question: PROMPT_RESUMEN(pregunta), evidence: evidencia, locale: 'es', deadlineMs: 25_000 }),
    )
    const validacion = validateAnswer(salida.answer, evidencia)
    if (!validacion.ok || validacion.answer.abstained || !validacion.answer.answer.trim()) return original

    const porId = new Map(evidencia.map((e) => [e.chunkId, e]))
    const fuentes: AnswerSource[] = validacion.answer.citations.flatMap((cita) => {
      const e = porId.get(cita.chunkId)
      if (!e) return []
      return [
        {
          documentId: e.documentId,
          documentVersionId: e.documentVersionId,
          chunkId: e.chunkId,
          title: e.title,
          meetingAt: e.meetingAt,
          dateOrigin: e.meetingAt ? ('provider_meeting' as const) : ('unknown' as const),
          artifactType: e.artifactType,
          section: e.section,
          quote: cita.quote,
        },
      ]
    })
    if (fuentes.length === 0) return original
    return { texto: validacion.answer.answer, fuentes, generado: true }
  } catch (error) {
    logger.warn('dashboard.resumen_no_generado', {
      motivo: error instanceof Error ? error.message : 'desconocido',
    })
    return original
  }
}
