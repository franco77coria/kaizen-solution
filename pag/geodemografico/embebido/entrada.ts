import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../apps/api/dist/app.js'
import { limpiarContadores } from '../apps/api/dist/plugins/admission.js'
import { unaPasada } from '../apps/worker/dist/ciclo.js'
import { secretsEqual } from '../packages/authz/dist/crypto.js'
import { logger } from '../packages/observability/dist/index.js'

/**
 * El geodemografico embebido en la app de Kaizen (Next.js, carpeta `pag/`).
 *
 * No es un proyecto de Vercel aparte: Next reescribe `/app/v1`, `/app/auth` y
 * `/app/health` a una ruta suya (`pages/api/geo/...`) que delega aca, y la
 * interfaz se sirve como archivos estaticos en `/app`. Este archivo se
 * empaqueta en un solo modulo con esbuild (`pag/scripts/construir-geodemografico.mjs`).
 */

/**
 * Plazo para EMPEZAR trabajo en una pasada de ingesta. La funcion tiene un
 * tope de 300 s; una tanda de embeddings puede tardar hasta ~2 min entre
 * reintentos por cuota, asi que se deja ese margen.
 */
const PLAZO_PASADA_MS = 150_000

type App = Awaited<ReturnType<typeof buildApp>>

let lista: Promise<App> | undefined

/**
 * La app se construye una vez por instancia y se reutiliza, asi los pools de
 * la base no se abren en cada pedido. Si el arranque falla (una variable de
 * entorno mal puesta), el pedido siguiente lo reintenta.
 */
function preparar(): Promise<App> {
  const promesa = buildApp().then(async (app) => {
    await app.ready()
    setInterval(limpiarContadores, 60_000).unref()
    return app
  })
  promesa.catch(() => {
    lista = undefined
  })
  return promesa
}

/**
 * `req.url` tiene que llegar con la ruta PUBLICA (`/app/v1/...`): la API quita
 * el prefijo al entrar (`rewriteUrl`) y arma cookies y redirecciones con el.
 */
export async function atenderApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  lista ??= preparar()
  const app = await lista
  app.server.emit('request', req, res)
}

/**
 * Procesa la cola de ingesta una vez. La llaman el cron diario (GET, firmado
 * por Vercel con CRON_SECRET) y la API apenas encola trabajo (POST).
 *
 * Falla cerrada (leccion 17): sin secreto configurado responde 503. Dos
 * pasadas en paralelo no se pisan: cada trabajo se toma con un lease.
 */
export async function atenderIngesta(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const secreto = process.env['CRON_SECRET']
  if (!secreto) return responder(res, 503, { error: 'ingesta sin configurar' })
  if (req.method !== 'GET' && req.method !== 'POST') return responder(res, 405, {})
  if (!secretsEqual(req.headers.authorization ?? '', `Bearer ${secreto}`)) return responder(res, 401, {})

  try {
    const procesados = await unaPasada({ hasta: Date.now() + PLAZO_PASADA_MS })
    logger.info('ingesta.pasada', { procesados, origen: req.method === 'GET' ? 'cron' : 'api' })
    responder(res, 200, { procesados })
  } catch (error) {
    logger.error('ingesta.pasada_fallida', error)
    responder(res, 500, { error: 'la pasada fallo' })
  }
}

function responder(res: ServerResponse, status: number, cuerpo: object): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(cuerpo))
}
