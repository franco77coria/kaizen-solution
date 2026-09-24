import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const raiz = dirname(fileURLToPath(import.meta.url))
const src = (ruta: string) => resolve(raiz, ruta)

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    // Levantar PGlite y aplicar las migraciones cuesta unos segundos.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Cada archivo levanta su propia base efimera; un solo proceso evita
    // abrir decenas de instancias WASM a la vez.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@kaizen/contracts': src('packages/contracts/src/index.ts'),
      '@kaizen/observability': src('packages/observability/src/index.ts'),
      '@kaizen/db': src('packages/db/src/index.ts'),
      '@kaizen/authz': src('packages/authz/src/index.ts'),
      '@kaizen/llm': src('packages/llm/src/index.ts'),
      '@kaizen/retrieval': src('packages/retrieval/src/index.ts'),
      '@kaizen/query-plans': src('packages/query-plans/src/index.ts'),
      '@kaizen/geography': src('packages/geography/src/index.ts'),
      '@kaizen/visualizations': src('packages/visualizations/src/index.ts'),
      '@kaizen/connector-google-drive': src('packages/connectors/google-drive/src/index.ts'),
      '@kaizen/connector-structured-source': src('packages/connectors/structured-source/src/index.ts'),
      '@kaizen/fixtures': src('evals/fixtures/src/index.ts'),
    },
  },
})
