import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Obtiene el ID del municipio de forma ultra-rápida y cacheada en memoria.
 * Evita la consulta secuencial previa que bloqueaba 500ms cada petición.
 */
export const getCachedMunicipioId = cache(async (slug: string): Promise<string | null> => {
    const fetchId = unstable_cache(
        async (s: string) => {
            const mun = await prisma.polMunicipio.findUnique({
                where: { slug: s },
                select: { id: true },
            })
            return mun?.id || null
        },
        [`mun-id-${slug}`],
        { revalidate: 3600, tags: [`municipio-${slug}`] }
    )
    return fetchId(slug)
})
