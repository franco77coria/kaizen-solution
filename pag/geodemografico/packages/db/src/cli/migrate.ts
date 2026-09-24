import { MIGRATIONS_DIR } from '../testing.js'
import { runMigrations } from '../migrate.js'

const url = process.env['DATABASE_MIGRATION_URL'] ?? process.env['DATABASE_URL']
if (!url) {
  process.stderr.write('falta DATABASE_MIGRATION_URL o DATABASE_URL\n')
  process.exit(1)
}

const result = await runMigrations(MIGRATIONS_DIR, url, (m) =>
  process.stdout.write(`${m}\n`),
)
process.stdout.write(
  `migraciones aplicadas: ${result.applied.length}, ya presentes: ${result.skipped.length}\n`,
)
