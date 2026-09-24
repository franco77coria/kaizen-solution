/**
 * Servidor PostgreSQL local para desarrollo y pruebas.
 *
 * Levanta PGlite (PostgreSQL 18.3 compilado a WASM) con pgvector y lo expone
 * por el protocolo de cable de Postgres. La aplicacion se conecta con el
 * cliente `pg` normal: no hay ninguna rama de codigo especifica de desarrollo.
 *
 * Ver docs/adr/0006-base-de-datos-local.md para lo que esto cubre y lo que no.
 */
import { PGlite } from '@electric-sql/pglite'
import { extensions } from './pglite-extensions.mjs'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const PORT = Number(process.env.DEV_DB_PORT ?? 55432)
const DATA_DIR = resolve(process.cwd(), '.pgdata')
const EPHEMERAL = process.env.DEV_DB_EPHEMERAL === '1'

if (!EPHEMERAL) mkdirSync(DATA_DIR, { recursive: true })

const db = await PGlite.create({
  ...(EPHEMERAL ? {} : { dataDir: DATA_DIR }),
  extensions,
})

await db.exec('create extension if not exists vector;')

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: '127.0.0.1',
  // Por defecto es 1, lo que hace que un pool con mas de una conexion
  // reciba ECONNRESET. Ver ADR 0006.
  //
  // El techo tiene que cubrir la suma de TODOS los pools de identidad de
  // servicio, no el de uno. Con cuatro identidades y 10 conexiones cada una
  // ya se pasa de 20, y el sintoma es un ECONNRESET que parece de red pero es
  // de cupo.
  maxConnections: Number(process.env.DEV_DB_MAX_CONNECTIONS ?? 120),
})

await server.start()

process.stdout.write(
  `base local lista en postgresql://postgres@127.0.0.1:${PORT}/postgres` +
    `${EPHEMERAL ? ' (efimera)' : ` (datos en ${DATA_DIR})`}\n`,
)

let cerrando = false
async function cerrar() {
  if (cerrando) return
  cerrando = true
  await server.stop().catch(() => {})
  await db.close().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)
