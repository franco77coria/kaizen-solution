import pg from 'pg'
import { logError } from '@kaizen/observability'

/**
 * Pools separados por identidad de servicio. Cada uno usa un rol distinto y
 * ve un subconjunto distinto del esquema. No hay un pool "de todo".
 */
export type ServiceIdentity = 'auth' | 'app' | 'worker' | 'webhook'

const ROLE_BY_IDENTITY: Record<ServiceIdentity, string> = {
  auth: 'kaizen_auth',
  app: 'kaizen_app',
  worker: 'kaizen_worker',
  // Identidad del webhook: sin sesion y sin contexto de tenant, porque el
  // canal es justamente lo que todavia no revela de que tenant se trata.
  // Solo puede traducir un canal y encolar una reconciliacion.
  webhook: 'kaizen_webhook',
}

const pools = new Map<ServiceIdentity, pg.Pool>()

const PROPORCION: Record<ServiceIdentity, number> = {
  app: 1,
  worker: 0.4,
  auth: 0.3,
  webhook: 0.2,
}

function tamanoPool(identity: ServiceIdentity): number {
  const base = Number(process.env['DATABASE_POOL_MAX'] ?? 10)
  return Math.max(2, Math.round(base * PROPORCION[identity]))
}

function connectionString(): string {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL no esta configurada')
  return url
}

export function getPool(identity: ServiceIdentity): pg.Pool {
  const existing = pools.get(identity)
  if (existing) return existing

  const pool = new pg.Pool({
    connectionString: connectionString(),
    // Tamano POR IDENTIDAD, no global. Las cuatro identidades abren pools
    // separados, asi que un mismo numero para todas multiplica por cuatro el
    // consumo real de conexiones.
    //
    // Se reparte segun lo que hace cada una: la API atiende el trafico de
    // usuarios, el worker procesa de a un trabajo por vez, y autenticacion y
    // webhook hacen consultas cortas y esporadicas.
    max: tamanoPool(identity),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Nunca dejar una transaccion abierta esperando a un proveedor externo.
    statement_timeout: Number(process.env['DATABASE_STATEMENT_TIMEOUT_MS'] ?? 15_000),
  })

  pool.on('error', (err) => {
    logError('db.pool_error', err, { identity })
  })

  pools.set(identity, pool)
  return pool
}

export function roleFor(identity: ServiceIdentity): string {
  return ROLE_BY_IDENTITY[identity]
}

export async function closeAllPools(): Promise<void> {
  await Promise.all([...pools.values()].map((p) => p.end().catch(() => {})))
  pools.clear()
}

export type PoolClient = pg.PoolClient
export type QueryResultRow = pg.QueryResultRow
