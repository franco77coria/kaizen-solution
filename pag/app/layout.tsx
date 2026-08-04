import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import ChatBot from "@/components/ui/chatbot";
import SmoothScroll from "@/components/ui/smooth-scroll";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
    display: 'swap',
});

const manrope = Manrope({
    subsets: ["latin"],
    variable: '--font-manrope',
    display: 'swap',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    // Sin maximumScale ni userScalable: bloquear el zoom incumple WCAG 1.4.4.
    // El zoom accidental al enfocar inputs en iOS ya está resuelto en
    // globals.css forzando font-size 16px en los campos.
    viewportFit: 'cover',
    themeColor: '#0a0f1e',
};

const siteUrl = 'https://www.kaizensolutionscol.com'

export const metadata: Metadata = {
    title: {
        default: 'Kaizen Solution | Tecnología Electoral y Transformación Digital',
        template: '%s | Kaizen Solution',
    },
    description: 'Soluciones digitales para campañas políticas, sector público y empresas. Tecnología electoral, dashboards geodemográficos, WhatsApp CRM con Audio IA personalizado. Colombia y Argentina.',
    keywords: [
        'transformación digital', 'consultoría TI', 'business intelligence',
        'automatización', 'desarrollo a medida', 'Bogotá', 'Colombia', 'Buenos Aires', 'Argentina',
        // Sector público + electoral
        'tecnología electoral', 'software electoral', 'testigos electorales',
        'gestión electoral Colombia', 'sector público Colombia', 'gestión pública digital',
        'campañas políticas tecnología', 'análisis geodemográfico', 'análisis geodemográfico Colombia',
        'Cundinamarca 2026', 'Partido Liberal Colombia', 'Cambio Radical Colombia',
        // IA + WhatsApp
        'WhatsApp CRM Colombia', 'WhatsApp masivo campañas', 'ElevenLabs Colombia',
        'audio IA personalizado', 'chatbot político', 'automatización WhatsApp político',
        'campañas WhatsApp masivas', 'mensajes de voz personalizados IA',
    ],
    authors: [{ name: 'Kaizen Solution S.A.S.', url: siteUrl }],
    creator: 'Kaizen Solution S.A.S.',
    metadataBase: new URL(siteUrl),
    alternates: { canonical: '/' },
    openGraph: {
        title: 'Kaizen Solution | Tecnología Electoral y Transformación Digital',
        description: 'Soluciones digitales para campañas políticas, sector público y empresas. WhatsApp CRM con Audio IA, testigos electorales y análisis geodemográfico. Colombia y Argentina.',
        url: siteUrl,
        siteName: 'Kaizen Solution',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Kaizen Solution — Tecnología Electoral y Transformación Digital',
            },
        ],
        locale: 'es_CO',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Kaizen Solution | Tecnología Electoral y Transformación Digital',
        description: 'Tecnología de punta para campañas políticas y sector público. WhatsApp CRM + Audio IA.',
        images: ['/og-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

const organizationLd = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Kaizen Solution S.A.S.',
    alternateName: 'Kaizen Solution',
    url: siteUrl,
    logo: `${siteUrl}/kaizen-logo.jpg`,
    description:
        'Empresa de tecnología especializada en transformación digital, tecnología electoral y soluciones de IA para el sector público y privado en Colombia y Argentina.',
    address: [
        {
            '@type': 'PostalAddress',
            addressLocality: 'Bogotá',
            addressCountry: 'CO',
        },
        {
            '@type': 'PostalAddress',
            addressLocality: 'Buenos Aires',
            addressCountry: 'AR',
        },
    ],
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'Spanish',
        telephone: '+57-321-205-0514',
        email: 'gerencia@kaizensolutionscol.com',
    },
    sameAs: [
        'https://www.linkedin.com/company/kaizen-solution',
        'https://www.instagram.com/kaizensolution',
    ],
    knowsAbout: [
        'Tecnología Electoral',
        'Transformación Digital',
        'Business Intelligence',
        'WhatsApp Marketing Masivo',
        'Inteligencia Artificial',
        'ElevenLabs Audio IA',
        'Sector Público Colombia',
        'Campañas Políticas',
        'Análisis Geodemográfico',
    ],
}

const websiteLd = {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: 'Kaizen Solution',
    inLanguage: 'es',
    publisher: { '@id': `${siteUrl}/#organization` },
}

// ProfessionalService le da a Google el contexto de "qué vende y dónde",
// que Organization sola no aporta.
const serviceLd = {
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}/#service`,
    name: 'Kaizen Solution — Transformación Digital y Tecnología Electoral',
    url: siteUrl,
    image: `${siteUrl}/og-image.jpg`,
    parentOrganization: { '@id': `${siteUrl}/#organization` },
    areaServed: [
        { '@type': 'Country', name: 'Colombia' },
        { '@type': 'Country', name: 'Argentina' },
    ],
    availableLanguage: 'es',
    hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Servicios',
        itemListElement: [
            'Consultoría Estratégica en TI',
            'Analítica y Business Intelligence',
            'Adopción e Implementación Tecnológica',
            'Desarrollo de software a medida',
            'WhatsApp CRM y campañas masivas con Audio IA',
            'Tecnología electoral y gestión de testigos',
            'Análisis geodemográfico',
            'Visión artificial aplicada',
        ].map((name) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name },
        })),
    },
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [organizationLd, websiteLd, serviceLd],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Sin scroll-smooth: Lenis maneja el scroll y `scroll-behavior: smooth`
        // de CSS pelea con él (saltos al navegar por anclas).
        <html lang="es">
            <body className={`${inter.variable} ${manrope.variable} antialiased`}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <SmoothScroll>
                    {children}
                </SmoothScroll>
                <ChatBot />
            </body>
        </html>
    );
}
