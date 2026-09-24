import { loadConfig } from './config.js'
import { buildApp } from './app.js'
import { logger } from '@kaizen/observability'
import { closeAllPools } from '@kaizen/db'
import { limpiarContadores } from './plugins/admission.js'
import { createLlmAdapter, createEmbeddingAdapter } from '@kaizen/llm'

const config = loadConfig()
const app = await buildApp(config)

// Estado de los adaptadores AL ARRANCAR. Un adaptador deshabilitado se anuncia
// con su motivo, en vez de fallar la primera vez que alguien pregunte algo.
const llm = createLlmAdapter()
const emb = createEmbeddingAdapter()
logger.info('api.adaptadores', {
  llm: llm.name,
  llmHabilitado: llm.status().enabled,
  llmMotivo: llm.status().reason,
  modelo: llm.status().model,
  embeddings: emb.name,
  embeddingsHabilitado: emb.status().enabled,
})

const limpieza = setInterval(limpiarContadores, 60_000)
limpieza.unref()

await app.listen({ port: config.port, host: '0.0.0.0' })
logger.info('api.escuchando', { port: config.port, appEnv: config.appEnv })

async function apagar(senal: string): Promise<void> {
  logger.info('api.apagando', { senal })
  clearInterval(limpieza)
  await app.close().catch(() => {})
  await closeAllPools()
  process.exit(0)
}

process.on('SIGINT', () => void apagar('SIGINT'))
process.on('SIGTERM', () => void apagar('SIGTERM'))
