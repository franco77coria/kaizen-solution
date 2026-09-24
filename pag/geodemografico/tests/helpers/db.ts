import pg from 'pg'
import { startTestDatabase, type TestDatabase } from '@kaizen/db'
import { seedFixtures } from '@kaizen/fixtures'

/**
 * Prepara una base efimera con el esquema completo y los fixtures de las dos
 * alcaldias. Devuelve tambien un cliente con la identidad de MIGRACION, para
 * montar escenarios; las pruebas de aislamiento usan los pools de runtime.
 */
export interface TestEnv {
  db: TestDatabase
  owner: pg.Client
  close: () => Promise<void>
}

export async function setupTestEnv(): Promise<TestEnv> {
  const db = await startTestDatabase()
  const owner = new pg.Client({ connectionString: db.url })
  await owner.connect()
  await seedFixtures(owner)

  return {
    db,
    owner,
    close: async () => {
      await owner.end().catch(() => {})
      await db.stop()
    },
  }
}
