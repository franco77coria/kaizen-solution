import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  LIMITS,
  createConversationSchema,
  notFound,
  paginationSchema,
  postMessageSchema,
  validationFailed,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveCorpusScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { ask } from '../services/chat.js'

const idParam = z.object({ id: z.string().uuid() })

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/conversations', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])

    const parsed = createConversationSchema.safeParse(request.body ?? {})
    if (!parsed.success) throw validationFailed('cuerpo invalido')

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{ id: string; created_at: Date }>(
        `insert into conversations
           (tenant_id, corpus_id, purpose_id, owner_user_id, title, authz_version)
         values ($1,$2,$3,$4,$5,$6)
         returning id, created_at`,
        [
          session.tenantId,
          session.corpusId,
          session.purposeId,
          session.userId,
          parsed.data.title ?? null,
          session.authzVersion,
        ],
      )
      const fila = rows[0]
      if (!fila) throw notFound('no se pudo crear la conversacion')
      return { id: fila.id, createdAt: fila.created_at }
    })
  })

  app.get('/v1/conversations', async (request) => {
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])
    const page = paginationSchema.parse(request.query ?? {})

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      // RLS ya restringe a las conversaciones propias: no hace falta (ni
      // conviene) repetir el filtro por owner aqui.
      const { rows } = await client.query<{ id: string; title: string | null; created_at: Date }>(
        `select id, title, created_at from conversations
          where status = 'active'
          order by created_at desc
          limit $1`,
        [page.limit],
      )
      return { items: rows }
    })
  })

  app.get('/v1/conversations/:id', async (request) => {
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const conversacion = await client.query<{ id: string; title: string | null }>(
        `select id, title from conversations where id = $1`,
        [params.data.id],
      )
      if (!conversacion.rows[0]) throw notFound('conversacion inexistente o ajena')

      // `dependencias_vigentes` se DERIVA: un mensaje deja de mostrarse cuando
      // alguna de las versiones que lo respaldan ya no esta publicada. No se
      // guarda un estado "bloqueado" porque escribirlo exigiria que el worker
      // tuviera acceso a los chats, y bajo RLS solo alcanzaria los del usuario
      // que dispara la revocacion: el resto quedaria sin marcar, sin error.
      const mensajes = await client.query<{
        id: string
        role: string
        status: string
        content: string
        summary_only: boolean
        created_at: Date
        dependencias_vigentes: boolean
      }>(
        `select m.id, m.role, m.status, m.content, m.summary_only, m.created_at,
                not exists (
                  select 1
                    from unnest(m.dependency_version_ids) as dep(version_id)
                    left join document_versions v
                           on v.tenant_id = m.tenant_id
                          and v.corpus_id = m.corpus_id
                          and v.id = dep.version_id
                   where v.id is null or v.status <> 'published'
                ) as dependencias_vigentes
           from messages m
          where m.conversation_id = $1
          order by m.created_at asc limit $2`,
        [params.data.id, LIMITS.PAGE_SIZE_MAX],
      )

      const fuentes = await client.query<{
        message_id: string
        document_id: string
        version_id: string
        chunk_id: string
        snapshot_title: string
        snapshot_quote: string
        snapshot_section: string | null
      }>(
        `select s.message_id, s.document_id, s.version_id, s.chunk_id,
                s.snapshot_title, s.snapshot_quote, s.snapshot_section
           from answer_sources s
           join messages m on m.tenant_id = s.tenant_id and m.id = s.message_id
          where m.conversation_id = $1
          order by s.id`,
        [params.data.id],
      )

      const porMensaje = new Map<string, typeof fuentes.rows>()
      for (const f of fuentes.rows) {
        const lista = porMensaje.get(f.message_id) ?? []
        lista.push(f)
        porMensaje.set(f.message_id, lista)
      }

      return {
        id: conversacion.rows[0].id,
        title: conversacion.rows[0].title,
        messages: mensajes.rows.map((m) => {
          const bloqueado = m.status === 'blocked' || !m.dependencias_vigentes
          return {
            id: m.id,
            role: m.role,
            status: bloqueado ? 'blocked' : m.status,
            // Un mensaje cuya fuente se revoco NO se muestra: se reemplaza por
            // un aviso. El texto sigue en la base para la traza, pero deja de
            // servirse.
            content: bloqueado
              ? 'Esta respuesta dependia de una fuente que ya no esta disponible.'
              : m.content,
            summaryOnly: m.summary_only,
            createdAt: m.created_at,
            sources: bloqueado
              ? []
              : (porMensaje.get(m.id) ?? []).map((f) => ({
                  documentId: f.document_id,
                  documentVersionId: f.version_id,
                  chunkId: f.chunk_id,
                  title: f.snapshot_title,
                  quote: f.snapshot_quote,
                  section: f.snapshot_section,
                })),
          }
        }),
      }
    })
  })

  app.post('/v1/conversations/:id/messages', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const parsed = postMessageSchema.safeParse(request.body)
    if (!parsed.success) {
      throw validationFailed(
        `mensaje invalido: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
      )
    }

    return ask({
      session,
      conversationId: params.data.id,
      content: parsed.data.content,
      idempotencyKey: parsed.data.idempotencyKey,
    })
  })
}
