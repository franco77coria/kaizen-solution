/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: [],
    },
    env: {
        NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        NEXT_PUBLIC_APPS_SCRIPT_URL: process.env.NEXT_PUBLIC_APPS_SCRIPT_URL,
    },
}

module.exports = nextConfig
