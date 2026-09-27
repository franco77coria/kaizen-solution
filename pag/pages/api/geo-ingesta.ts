import type { NextApiRequest, NextApiResponse } from 'next'
import { cargarGeodemografico } from '@/lib/geodemografico'

/**
 * Cola de ingesta de Drive del geodemografico. La llaman el cron diario
 * (vercel.json, firmado con CRON_SECRET) y la propia API apenas encola.
 * La autorizacion la valida el modulo, en tiempo constante.
 */
export const config = {
    api: { bodyParser: false },
    maxDuration: 300,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const geo = await cargarGeodemografico()
    await geo.atenderIngesta(req, res)
}
