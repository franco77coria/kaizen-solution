import { waitUntil } from '@vercel/functions'
import { logger } from '@kaizen/observability'

/**
 * Despierta la ingesta despues de encolar trabajo.
 *
 * En Vercel no hay un worker corriendo en bucle, y el plan Hobby solo permite
 * un cron DIARIO: sin esto, conectar Drive o pedir una sincronizacion dejaria
 * el trabajo en cola hasta el dia siguiente. Se llama a la funcion de ingesta
 * (`/api/geo-ingesta` de la app de Kaizen), que procesa la cola en su propia
 * invocacion.
 *
 * `waitUntil` mantiene viva esta invocacion hasta que la llamada sale, sin
 * demorar la respuesta a quien pidio sincronizar.
 *
 * Fuera de Vercel no hace nada: en local el worker largo (`pnpm worker`) ya
 * toma los trabajos solo. Si la llamada falla, el trabajo NO se pierde: sigue
 * en la cola y lo toma el cron del dia.
 */
export function despertarIngesta(motivo: string): void {
  const host = process.env['VERCEL_PROJECT_PRODUCTION_URL']
  const secreto = process.env['CRON_SECRET']
  if (!host || !secreto) return

  waitUntil(
    fetch(`https://${host}/api/geo-ingesta`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secreto}` },
    })
      .then((r) => {
        if (!r.ok) logger.warn('ingesta.no_desperto', { motivo, status: r.status })
      })
      .catch((error: unknown) => {
        logger.error('ingesta.no_desperto', error, { motivo })
      }),
  )
}
