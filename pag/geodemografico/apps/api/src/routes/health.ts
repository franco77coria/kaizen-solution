import type { FastifyInstance } from 'fastify'

/**
 * Sonda publica. Devuelve lo minimo: si expusiera versiones o el estado de
 * las dependencias, daria a un atacante un mapa gratis de la infraestructura.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health/live', async () => ({ status: 'ok' }))
}
