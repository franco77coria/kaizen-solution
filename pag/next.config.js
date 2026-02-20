/** @type {import('next').NextConfig} */
const nextConfig = {
    // Standalone mode for deployment on traditional hosting (Hostinger, VPS, etc.)
    // Standalone mode removed for Vercel
    // output: 'standalone',

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
}

module.exports = nextConfig
