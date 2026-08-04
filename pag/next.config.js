/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

// 'unsafe-inline' en script-src sigue estando porque el JSON-LD y los bootstrap
// scripts de Next van inline. Sacarlo requiere migrar a nonce por request
// (middleware + next/script), que es el siguiente paso, no este.
// 'unsafe-eval' solo en dev: lo necesita el refresh de webpack.
const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    // GSAP y framer-motion escriben estilos inline en cada frame
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // next/font self-hostea las fuentes, no hay pedidos a googleapis
    `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
]

const nextConfig = {
    // Standalone mode for deployment on traditional hosting (Hostinger, VPS, etc.)
    // Standalone mode removed for Vercel
    // output: 'standalone',

    poweredByHeader: false,

    images: {
        // Antes esto era hostname: '**', que convierte /_next/image en un
        // optimizador de imágenes gratis para cualquier host de internet.
        remotePatterns: [
            { protocol: 'https', hostname: '**.supabase.co' },
            { protocol: 'https', hostname: 'www.kaizensolutionscol.com' },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ]
    },
}

module.exports = nextConfig
