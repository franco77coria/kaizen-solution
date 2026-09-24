import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, LIMITS, postMessageSchema, validationFailed } from '@kaizen/contracts'
import { logger } from '@kaizen/observability'
import { requireCsrf, resolveCorpusScope } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { ask, type EventoProgreso } from '../services/chat.js'

const idParam = z.object({ id: z.string().uuid() })

/**
 * Chat con progreso en vivo (SSE).
 *
 * DECISION IMPORTANTE SOBRE QUE SE TRANSMITE.
 *
 * No se emiten los tokens del modelo a medida que salen. La razon no es
 * tecnica: las citas se validan DESPUES de que el modelo termina, comprobando
 * que cada chunkId exista y que la cita aparezca textualmente en el fragmento.
 * Emitir texto antes de esa validacion significaria mostrar una afirmacion que
 * todavia puede resultar no respaldada, y despues retractarla. Un asistente
 * que se desdice es peor que uno que tarda un segundo mas.
 *
 * Lo que SI se transmite es el progreso real de cada etapa: buscar, cuantos
 * fragmentos se encontraron, redactar. Para el usuario la sensacion de
 * inmediatez es la misma -o mejor, porque ve que esta pasando- y no se
 * sacrifica ninguna garantia. La respuesta se revela progresivamente en el
 * cliente una vez validada.
 */
export async function streamRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/conversations/:id/messages/stream', async (request, reply) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])

    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const parsed = postMessageSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('mensaje invalido')

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Sin esto, un proxy con buffer retiene los eventos y el streaming
      // deja de serlo sin que nada falle.
      'x-accel-buffering': 'no',
    })

    let cerrado = false
    const enviar = (evento: string, datos: unknown): void => {
      if (cerrado) return
      reply.raw.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`)
    }

    // Si el usuario cierra la pestana, se deja de escribir. Seguir escribiendo
    // en un socket muerto tira EPIPE y ensucia el log.
    request.raw.on('close', () => {
      cerrado = true
    })

    // Latido: algunos proxies cierran una conexion SSE sin trafico.
    const latido = setInterval(() => {
      if (!cerrado) reply.raw.write(': latido\n\n')
    }, 15_000)

    try {
      const respuesta = await ask({
        session,
        conversationId: params.data.id,
        content: parsed.data.content,
        idempotencyKey: parsed.data.idempotencyKey,
        onProgreso: (evento: EventoProgreso) => enviar('progreso', evento),
      })

      enviar('respuesta', respuesta)
    } catch (error) {
      // Solo un AppError tiene un codigo que el cliente sepa interpretar.
      // `'code' in error` era demasiado amplio: un error de Postgres o del
      // runtime tambien trae `code`, y ese valor terminaba viajando al cliente
      // como si fuera un codigo del contrato.
      const esDelContrato = error instanceof AppError
      const code = esDelContrato ? error.code : 'INTERNAL'

      // `AppError.message` ya es el mensaje publico del codigo, asi que no hay
      // una segunda tabla de mensajes que se pueda desincronizar de la primera.
      const message = esDelContrato ? error.message : 'No se pudo completar la consulta.'

      // El codigo solo no alcanza para diagnosticar: sin el nombre y el detalle
      // interno, un fallo del proveedor y uno de la base se ven igual en el log.
      logger.warn('stream.fallo', {
        requestId: request.requestId,
        code,
        causa: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        detalle: esDelContrato ? error.internalDetail : undefined,
      })

      enviar('error', { code, message })
    } finally {
      clearInterval(latido)
      if (!cerrado) {
        enviar('fin', {})
        reply.raw.end()
      }
    }

    return reply
  })

  app.get('/v1/chat/limites', async (request) => {
    await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])
    return { maxCaracteres: LIMITS.MESSAGE_MAX_CHARS }
  })
}
