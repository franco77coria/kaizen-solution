import type { PoolClient } from 'pg'
import { getPool, roleFor, type ServiceIdentity } from './pool.js'

/**
 * Contexto que el backend coloca en la transaccion. Las politicas RLS leen
 * estos valores. El cliente NUNCA los provee: salen de la sesion de servidor.
 */
export interface TransactionContext {
  tenantId?: string
  userId?: string
  corpusId?: string
  purposeId?: string
}

/**
 * Patron obligatorio de acceso a datos.
 *
 *   1. SET LOCAL ROLE al rol de la identidad de servicio.
 *   2. set_config(..., true) para cada clave de contexto, PARAMETRIZADO.
 *   3. Consultas dentro de la transaccion.
 *   4. COMMIT o ROLLBACK, y el contexto desaparece con la transaccion.
 *
 * El tercer parametro `true` de set_config hace el alcance LOCAL: el valor no
 * sobrevive al COMMIT ni queda pegado a la conexion cuando vuelve al pool.
 * Usar variables de sesion en su lugar filtraria contexto entre peticiones.
 *
 * Nunca mantener esta transaccion abierta mientras se espera a un proveedor
 * externo (modelo, Drive): se resuelve primero, se persiste despues.
 */
export async function withAuthorizedTransaction<T>(
  identity: ServiceIdentity,
  context: TransactionContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool(identity).connect()
  try {
    await client.query('begin')
    // El nombre del rol viene de una tabla interna, no de entrada de usuario.
    await client.query(`set local role ${roleFor(identity)}`)

    const entries: Array<[string, string]> = []
    if (context.tenantId) entries.push(['app.tenant_id', context.tenantId])
    if (context.userId) entries.push(['app.user_id', context.userId])
    if (context.corpusId) entries.push(['app.corpus_id', context.corpusId])
    if (context.purposeId) entries.push(['app.purpose_id', context.purposeId])

    for (const [key, value] of entries) {
      await client.query('select set_config($1, $2, true)', [key, value])
    }

    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

/**
 * Transaccion SIN contexto de tenant, para el flujo de autenticacion, que
 * ocurre antes de conocer el tenant. Usa la identidad `auth`, que no tiene
 * ningun privilegio sobre documentos, chats ni registros de personas.
 */
export async function withAuthTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  userId?: string,
): Promise<T> {
  return withAuthorizedTransaction('auth', userId ? { userId } : {}, fn)
}
