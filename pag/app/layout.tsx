import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import ChatBot from "@/components/ui/chatbot";
import CustomCursor from "@/components/ui/custom-cursor";

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
    maximumScale: 1,
    viewportFit: 'cover',
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
                url: '/og-image.png',
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
        images: ['/og-image.png'],
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

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="scroll-smooth">
            <body className={`${inter.variable} ${manrope.variable} antialiased`}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                {children}
                <ChatBot />
                <CustomCursor />
            </body>
        </html>
    );
}
