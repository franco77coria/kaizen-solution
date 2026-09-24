import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import pg from 'pg'

/**
 * Runner de migraciones. Explicito y sin magia: archivos .sql numerados,
 * aplicados en orden, cada uno en su propia transaccion, con hash registrado
 * para detectar si un archivo ya aplicado fue modificado despues.
 *
 * Corre con la identidad de MIGRACION, que es distinta de las de runtime.
 */
export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

const LEDGER = `
create table if not exists schema_migrations (
  filename text primary key,
  sha256 text not null,
  applied_at timestamptz not null default now()
)
`

export async function runMigrations(
  migrationsDir: string,
  connectionString: string,
  log: (msg: string) => void = () => {},
): Promise<MigrationResult> {
  const client = new pg.Client({ connectionString })
  await client.connect()

  const applied: string[] = []
  const skipped: string[] = []

  try {
    await client.query(LEDGER)

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, 'en'))

    const { rows } = await client.query<{ filename: string; sha256: string }>(
      'select filename, sha256 from schema_migrations',
    )
    const previous = new Map(rows.map((r) => [r.filename, r.sha256]))

    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), 'utf8')
      const hash = createHash('sha256').update(sql).digest('hex')
      const seen = previous.get(file)

      if (seen) {
        // Una migracion aplicada que cambio de contenido es un error de
        // proceso, no algo que se pueda ignorar: el esquema real y el
        // archivo ya no coinciden.
        if (seen !== hash) {
          throw new Error(
            `la migracion ${file} ya aplicada fue modificada despues (hash distinto)`,
          )
        }
        skipped.push(file)
        continue
      }

      log(`aplicando ${file}`)
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query(
          'insert into schema_migrations (filename, sha256) values ($1, $2)',
          [file, hash],
        )
        await client.query('commit')
        applied.push(file)
      } catch (error) {
        await client.query('rollback').catch(() => {})
        throw new Error(
          `migracion ${file} fallo: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        )
      }
    }
  } finally {
    await client.end().catch(() => {})
  }

  return { applied, skipped }
}
