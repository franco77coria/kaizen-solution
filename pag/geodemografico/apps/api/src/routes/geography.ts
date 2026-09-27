import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import {
  CUNDINAMARCA_MUNICIPALITIES,
  EXPECTED_MUNICIPALITY_COUNT,
  getActiveVersion,
} from '@kaizen/geography'
import { resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'

const querySchema = z.object({ level: z.enum(['municipality']).default('municipality') }).strict()

/**
 * Catalogo territorial. Devuelve la lista de areas del nivel pedido y el
 * estado de la cartografia. NO devuelve ninguna estadistica: es un catalogo,
 * no una fuente de datos privados.
 */
export async function geographyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/geography/areas', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['notes.read'])

    const parsed = querySchema.safeParse(request.query ?? {})
    if (!parsed.success) throw validationFailed('parametros invalidos')

    const version = await withAuthorizedTransaction('app', txContext(session), (client) =>
      getActiveVersion(client),
    )

    return {
      level: parsed.data.level,
      expectedCount: EXPECTED_MUNICIPALITY_COUNT,
      count: CUNDINAMARCA_MUNICIPALITIES.length,
      areas: CUNDINAMARCA_MUNICIPALITIES.map((m) => ({ code: m.code, name: m.name })),
      // La ausencia de cartografia se DECLARA. Sin esto, un mapa vacio se
      // leeria como "no hay datos" en vez de "falta la geografia".
      geometry: version
        ? {
            available: version.geometryLoaded,
            version: version.version,
            source: version.sourceName,
            sourceUrl: version.sourceUrl,
            crs: version.crs,
          }
        : {
            available: false,
            reason:
              'No hay una version de cartografia activa. Cargar geometrias oficiales antes de usar mapas.',
          },
    }
  })
}
