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

// Cabeceras de /app (el geodemográfico). Su propia política: es una SPA de
// Vite sin scripts inline, así que no necesita 'unsafe-inline' en script-src.
const cabecerasApp = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://tile.openstreetmap.org https://server.arcgisonline.com",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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

    compress: true,
    swcMinify: true,

    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion'],
        serverActions: {
            bodySizeLimit: '2mb',
        },
        // El módulo del geodemográfico se carga en runtime (lib/geodemografico.ts),
        // así que el trazado automático no lo ve: hay que sumarlo a mano.
        outputFileTracingIncludes: {
            '/api/geo/[...ruta]': ['./.geo/**', './node_modules/@resvg/**'],
            '/api/geo-ingesta': ['./.geo/**'],
        },
    },

    async headers() {
        return [
            {
                // Todo menos /app, que tiene su propia política (cabecerasApp).
                // Dos CSP sobre la misma respuesta se intersectan, y la de la
                // landing no está pensada para esa app.
                source: '/((?!app/|app$).*)',
                headers: securityHeaders,
            },
            { source: '/app', headers: cabecerasApp },
            { source: '/app/:ruta*', headers: cabecerasApp },
            {
                source: '/app/assets/:archivo*',
                headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
        ]
    },

    // /app es el geodemográfico, embebido en esta misma app
    // (scripts/construir-geodemografico.mjs). Su API la atiende
    // pages/api/geo/[...ruta].ts; su interfaz son archivos de public/app.
    async rewrites() {
        return {
            beforeFiles: [
                { source: '/app/:area(v1|auth|health)', destination: '/api/geo/:area' },
                { source: '/app/:area(v1|auth|health)/:resto*', destination: '/api/geo/:area/:resto*' },
            ],
            // Cualquier otra ruta de /app que no sea un archivo es una pantalla
            // de la SPA: la resuelve su propio router.
            fallback: [
                { source: '/app', destination: '/app/index.html' },
                { source: '/app/:ruta*', destination: '/app/index.html' },
            ],
        }
    },
}

module.exports = nextConfig
