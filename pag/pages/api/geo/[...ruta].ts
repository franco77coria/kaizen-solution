import type { NextApiRequest, NextApiResponse } from 'next'
import { cargarGeodemografico } from '@/lib/geodemografico'

/**
 * API del geodemografico. next.config.js reescribe aca `/app/v1/*`,
 * `/app/auth/*` y `/app/health/*`.
 *
 * Es una ruta del Pages Router a proposito: es la unica forma de tener el
 * pedido de Node crudo (IncomingMessage/ServerResponse) que necesita Fastify,
 * sin que Next lea el cuerpo antes (bodyParser: false) y sin cortar las
 * respuestas en streaming de SUMA.
 */
export const config = {
    api: { bodyParser: false, externalResolver: true, responseLimit: false },
    maxDuration: 300,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Fastify tiene que ver la ruta PUBLICA (/app/v1/...): con ella arma
    // cookies y redirecciones. Se reconstruye desde el parametro de la
    // reescritura, y de la query se quita lo que agrego Next.
    const ruta = req.query.ruta
    const partes = (Array.isArray(ruta) ? ruta : [ruta ?? '']).map(encodeURIComponent)
    const query = new URL(req.url ?? '/', 'http://local').searchParams
    query.delete('ruta')
    const resto = query.toString()
    req.url = `/app/${partes.join('/')}${resto ? `?${resto}` : ''}`

    const geo = await cargarGeodemografico()
    await geo.atenderApi(req, res)
}
