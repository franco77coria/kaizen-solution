import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * El geodemografico vive dentro de esta app, en /app. Su API es un modulo
 * aparte (`.geo/entrada.mjs`), que genera `scripts/construir-geodemografico.mjs`
 * antes de `next build`.
 *
 * Se carga con un import nativo en runtime (`webpackIgnore`): webpack no lo
 * toca, y `outputFileTracingIncludes` (next.config.js) lo suma a la funcion.
 * Una sola carga por instancia.
 */
interface Geodemografico {
    atenderApi(req: IncomingMessage, res: ServerResponse): Promise<void>
    atenderIngesta(req: IncomingMessage, res: ServerResponse): Promise<void>
}

let modulo: Promise<Geodemografico> | undefined

export function cargarGeodemografico(): Promise<Geodemografico> {
    const ruta = pathToFileURL(join(process.cwd(), '.geo', 'entrada.mjs')).href
    modulo ??= import(/* webpackIgnore: true */ ruta) as Promise<Geodemografico>
    // Si la carga falla, el pedido siguiente la reintenta.
    modulo.catch(() => {
        modulo = undefined
    })
    return modulo
}
