import { closeAllPools } from '@kaizen/db'
import { logger } from '@kaizen/observability'
import { unaPasada } from './ciclo.js'

/**
 * Worker de ingesta como proceso largo (desarrollo, o un servidor propio).
 * Repite `unaPasada` y descansa cuando no hubo trabajo.
 */
const INTERVALO_MS = Number(process.env['WORKER_POLL_MS'] ?? 2_000)

async function bucle(): Promise<void> {
  logger.info('worker.iniciado', {})

  let corriendo = true
  const detener = async (senal: string) => {
    logger.info('worker.deteniendo', { senal })
    corriendo = false
  }
  process.on('SIGINT', () => void detener('SIGINT'))
  process.on('SIGTERM', () => void detener('SIGTERM'))

  while (corriendo) {
    try {
      const total = await unaPasada()
      if (total === 0) {
        await new Promise((r) => setTimeout(r, INTERVALO_MS))
      }
    } catch (error) {
      logger.error('worker.ciclo_fallido', error)
      await new Promise((r) => setTimeout(r, INTERVALO_MS * 3))
    }
  }

  await closeAllPools()
  process.exit(0)
}

await bucle()
