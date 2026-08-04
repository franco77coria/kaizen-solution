import { MetadataRoute } from 'next'

const siteUrl = 'https://www.kaizensolutionscol.com'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // El panel y las APIs no aportan nada al índice y exponen
                // superficie innecesaria en los resultados de búsqueda.
                disallow: ['/admin', '/admin/', '/api/', '/login'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
