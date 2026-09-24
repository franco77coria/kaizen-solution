import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { AppError } from '@kaizen/contracts'
import { logger } from '@kaizen/observability'

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string
  }
}

/**
 * Identificador de peticion y manejador de errores uniforme.
 *
 * El cliente recibe SIEMPRE un mensaje fijo por codigo mas el requestId. El
 * detalle real va al log. Interpolar el detalle en la respuesta es como se
 * filtra la existencia de recursos ajenos.
 */
export async function registerRequestContext(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request, reply) => {
    request.requestId = randomUUID()
    reply.header('x-request-id', request.requestId)
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.code === 'INTERNAL') {
        logger.error('http.error', error, { requestId: request.requestId, code: error.code })
      } else {
        logger.warn('http.rechazado', {
          requestId: request.requestId,
          code: error.code,
          detail: error.internalDetail,
          route: request.routeOptions?.url,
        })
      }
      return reply.status(error.status).send(error.toPublic(request.requestId))
    }

    // Errores de validacion de Fastify: no se devuelve el detalle del schema,
    // que revela la forma interna de la entrada esperada.
    if ((error as { validation?: unknown }).validation) {
      return reply
        .status(400)
        .send(new AppError('VALIDATION_FAILED').toPublic(request.requestId))
    }

    logger.error('http.error_no_controlado', error, {
      requestId: request.requestId,
      route: request.routeOptions?.url,
    })
    return reply.status(500).send(new AppError('INTERNAL').toPublic(request.requestId))
  })

  app.setNotFoundHandler((request, reply) => {
    // Misma respuesta que un recurso existente pero no autorizado.
    reply.status(404).send(new AppError('NOT_FOUND').toPublic(request.requestId))
  })
}
