import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Borra el directorio de datos de la base local. Es destructivo y solo aplica
 * a desarrollo: exige APP_ENV=local para no poder ejecutarse por accidente
 * apuntando a otro entorno.
 */
if (process.env['APP_ENV'] !== 'local') {
  process.stderr.write('db:reset solo corre con APP_ENV=local\n')
  process.exit(1)
}

const dir = resolve(process.cwd(), '.pgdata')
await rm(dir, { recursive: true, force: true })
process.stdout.write(`datos locales borrados: ${dir}\n`)
