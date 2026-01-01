import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import ChatBot from "@/components/ui/chatbot";

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

export const metadata: Metadata = {
    title: "Kaizen Solution | Transformación Digital con Propósito",
    description: "Soluciones digitales a medida para tu negocio y la gestión pública. Consultoría estratégica, Business Intelligence, automatizaciones y desarrollo de sistemas robustos.",
    keywords: ["transformación digital", "consultoría TI", "business intelligence", "automatización", "desarrollo a medida", "Bogotá", "Colombia"],
    authors: [{ name: "Kaizen Solution S.A.S." }],
    openGraph: {
        title: "Kaizen Solution | Transformación Digital con Propósito",
        description: "Impulsamos la mejora continua, la eficiencia y la adopción inteligente de tecnología",
        type: "website",
        locale: "es_CO",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="scroll-smooth">
            <body className={`${inter.variable} ${manrope.variable} antialiased`}>
                {children}
                <ChatBot />
            </body>
        </html>
    );
}
