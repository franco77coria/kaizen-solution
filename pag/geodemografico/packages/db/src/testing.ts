import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { runMigrations } from './migrate.js'
import { closeAllPools } from './pool.js'

/**
 * Base efimera para pruebas. Levanta PGlite en memoria, la expone por el
 * protocolo de cable y aplica todas las migraciones. Cada suite obtiene un
 * esquema limpio, de modo que una prueba no pueda pasar por residuo de otra.
 */
export interface TestDatabase {
  url: string
  stop: () => Promise<void>
}

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

/** Puerto base alto para no chocar con un PostgreSQL real del equipo. */
let puertoSiguiente = 56_000

export async function startTestDatabase(): Promise<TestDatabase> {
  // Importacion dinamica: PGlite es dependencia de desarrollo y no debe
  // entrar en el bundle de produccion.
  const [
    { PGlite },
    { vector },
    { pgcrypto },
    { pg_trgm },
    { unaccent },
    { PGLiteSocketServer },
  ] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite-pgvector'),
    import('@electric-sql/pglite/contrib/pgcrypto'),
    import('@electric-sql/pglite/contrib/pg_trgm'),
    import('@electric-sql/pglite/contrib/unaccent'),
    import('@electric-sql/pglite-socket'),
  ])

  const db = await PGlite.create({ extensions: { vector, pgcrypto, pg_trgm, unaccent } })

  // Reintenta si el puerto esta ocupado por otra suite en paralelo.
  let server: InstanceType<typeof PGLiteSocketServer> | undefined
  let port = 0
  for (let intento = 0; intento < 40; intento++) {
    port = puertoSiguiente++
    const candidato = new PGLiteSocketServer({
      db,
      port,
      host: '127.0.0.1',
      maxConnections: 20,
    })
    try {
      await candidato.start()
      server = candidato
      break
    } catch {
      await candidato.stop().catch(() => {})
    }
  }
  if (!server) throw new Error('no se pudo abrir un puerto para la base de pruebas')

  const url = `postgresql://postgres@127.0.0.1:${port}/postgres`
  await runMigrations(MIGRATIONS_DIR, url)
  process.env['DATABASE_URL'] = url

  const srv = server
  return {
    url,
    stop: async () => {
      await closeAllPools()
      await srv.stop().catch(() => {})
      await db.close().catch(() => {})
    },
  }
}

export { MIGRATIONS_DIR }
