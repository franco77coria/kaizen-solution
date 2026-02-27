import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Términos y Condiciones | Kaizen Solution",
    description: "Términos y Condiciones de uso de los servicios de Kaizen Solution S.A.S.",
};

export default async function TerminosPage() {
    let siteConfig;
    try {
        siteConfig = await prisma.siteConfig.findFirst();
    } catch (e) {
        console.warn("Database connection failed during render.", e);
    }

    return (
        <main className="min-h-screen">
            <Navbar />
            <section className="pt-32 pb-24 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-heading font-bold text-egyptian mb-8">
                        Términos y Condiciones
                    </h1>
                    <p className="text-slate mb-8">
                        Última actualización: 20 de febrero de 2026
                    </p>

                    <div className="prose prose-lg max-w-none text-outer-space space-y-8">
                        <div>
                            <p className="text-slate leading-relaxed">
                                Bienvenido a Kaizen Solution S.A.S. Al acceder y utilizar nuestros servicios, incluyendo nuestro sitio web, panel administrativo y servicios de WhatsApp Business (Meta), el usuario acepta los siguientes Términos y Condiciones.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                1. Uso de los Servicios
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Kaizen Solution S.A.S. provee soluciones tecnológicas, incluyendo integración con IA y WhatsApp. Al utilizar nuestros servicios, te comprometes a hacer un uso lícito y adecuado de las herramientas proporcionadas. Queda estrictamente prohibido utilizar nuestros servicios para enviar spam, mensajes fraudulentos o contenido que viole las políticas de WhatsApp (Meta).
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                2. Integración con Meta (WhatsApp)
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Como parte de nuestros servicios brindamos acceso a la API oficial de WhatsApp Business (Meta Platforms). El usuario es el único responsable de mantener la calidad de su número y cumplir con todos los <a href="https://www.whatsapp.com/legal/commerce-policy/" target="_blank" rel="noopener noreferrer" className="text-daylight-sky hover:text-egyptian underline">Términos Comerciales de WhatsApp</a>. Kaizen Solution no se hace responsable por suspensiones o bloqueos de cuentas derivados del mal uso de la API por parte del usuario.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                3. Responsabilidad de la Información
                            </h2>
                            <p className="text-slate leading-relaxed">
                                La información proporcionada al bot (KaiBot) para interactuar con tus clientes es responsabilidad tuya. No somos responsables por errores u omisiones en las respuestas automatizadas o errores introducidos en las plantillas.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                4. Terminación de la Cuenta
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Kaizen Solution se reserva el derecho de suspender temporal o permanentemente el acceso a cualquier cuenta que incumpla estos términos, incluyendo el incumplimiento de las normativas vigentes sobre protección de datos o normativas anti-spam de WhatsApp.
                            </p>
                        </div>

                    </div>
                </div>
            </section>
            <Footer
                companyName={siteConfig?.companyName}
                email={siteConfig?.email}
                phone={siteConfig?.phone || undefined}
                address={siteConfig?.address || undefined}
                linkedinUrl={siteConfig?.linkedinUrl}
                instagramUrl={siteConfig?.instagramUrl}
                facebookUrl={siteConfig?.facebookUrl}
                twitterUrl={siteConfig?.twitterUrl}
            />
        </main>
    );
}

