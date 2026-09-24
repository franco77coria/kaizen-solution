import type { FastifyRequest } from 'fastify'
import { isUuid, validationFailed } from '@kaizen/contracts'
import type { ScopeRequest } from '../plugins/session.js'

/**
 * El cliente INDICA sobre que espacio y finalidad quiere operar mediante
 * cabeceras. No se le cree: `resolveScope` comprueba despues membresia
 * activa, que el proposito pertenezca a ese tenant y que existan concesiones
 * explicitas. Aqui solo se valida la forma.
 */
export function leerAmbito(request: FastifyRequest): ScopeRequest {
  const tenantId = request.headers['x-tenant-id']
  const purposeId = request.headers['x-purpose-id']

  if (typeof tenantId !== 'string' || !isUuid(tenantId)) {
    throw validationFailed('falta o es invalido el encabezado x-tenant-id')
  }
  if (typeof purposeId !== 'string' || !isUuid(purposeId)) {
    throw validationFailed('falta o es invalido el encabezado x-purpose-id')
  }

  return { tenantId, purposeId }
}
