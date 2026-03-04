import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Política de Privacidad | Kaizen Solution",
    description: "Política de privacidad y protección de datos personales de Kaizen Solution S.A.S.",
};

export default async function PrivacidadPage() {
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
                        Política de Privacidad
                    </h1>
                    <p className="text-slate mb-8">
                        Última actualización: 20 de febrero de 2026
                    </p>

                    <div className="prose prose-lg max-w-none text-outer-space space-y-8">

                        {/* 1. Introducción */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                1. Introducción
                            </h2>
                            <p className="text-slate leading-relaxed">
                                En <strong>Kaizen Solution S.A.S.</strong> (en adelante, &ldquo;Kaizen Solution&rdquo;, &ldquo;nosotros&rdquo; o &ldquo;la empresa&rdquo;), nos comprometemos a proteger la privacidad y los datos personales de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información que nos proporcionás al interactuar con nuestro sitio web, servicios y herramientas digitales.
                            </p>
                        </div>

                        {/* 2. Responsable del tratamiento */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                2. Responsable del Tratamiento de Datos
                            </h2>
                            <ul className="list-none space-y-2 text-slate">
                                <li><strong>Razón social:</strong> Kaizen Solution S.A.S.</li>
                                <li><strong>Correo electrónico:</strong> gerencia@kaizensolutionscol.com</li>
                                <li><strong>Ubicación:</strong> Buenos Aires, Argentina / Bogotá D.C., Colombia</li>
                                <li><strong>WhatsApp:</strong> +54 9 11 6351-5966 (ARG) / +57 321 205 0514 (COL)</li>
                            </ul>
                        </div>

                        {/* 3. Datos que recopilamos */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                3. Datos que Recopilamos
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Recopilamos los siguientes tipos de información:
                            </p>

                            <h3 className="text-xl font-semibold text-egyptian mb-2">3.1. Datos proporcionados directamente por el usuario</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate">
                                <li>Nombre completo</li>
                                <li>Correo electrónico</li>
                                <li>Número de teléfono / WhatsApp</li>
                                <li>Nombre de la empresa</li>
                                <li>Mensajes o consultas enviadas a través de formularios de contacto</li>
                                <li>Conversaciones con nuestro asistente virtual (KaiBot)</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-egyptian mt-4 mb-2">3.2. Datos recopilados automáticamente</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate">
                                <li>Dirección IP</li>
                                <li>Tipo de navegador y dispositivo</li>
                                <li>Páginas visitadas y tiempo de permanencia</li>
                                <li>Cookies y tecnologías similares</li>
                            </ul>
                        </div>

                        {/* 4. Finalidad del tratamiento */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                4. Finalidad del Tratamiento
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Utilizamos la información recopilada para:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-slate">
                                <li>Responder consultas y solicitudes de servicio</li>
                                <li>Brindar atención personalizada a través de nuestro chatbot inteligente</li>
                                <li>Enviar información sobre nuestros servicios, novedades y ofertas (solo con tu consentimiento)</li>
                                <li>Mejorar la experiencia de navegación en nuestro sitio web</li>
                                <li>Realizar análisis estadísticos y métricas de uso</li>
                                <li>Cumplir con obligaciones legales y regulatorias</li>
                            </ul>
                        </div>

                        {/* 5. Servicios de terceros */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                5. Servicios de Terceros
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Para brindar nuestros servicios, utilizamos las siguientes plataformas de terceros:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-slate">
                                <li><strong>WhatsApp (Meta Platforms):</strong> Para comunicación directa con nuestros clientes. Los datos compartidos a través de WhatsApp están sujetos a la <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-daylight-sky hover:text-egyptian underline">Política de Privacidad de WhatsApp</a>.</li>
                                <li><strong>Groq (IA):</strong> Para potenciar nuestro asistente virtual KaiBot. Las conversaciones se procesan de manera segura y no se almacenan de forma permanente en servidores de terceros.</li>
                                <li><strong>Vercel / Hostinger:</strong> Para el alojamiento y distribución del sitio web.</li>
                                <li><strong>Google Fonts:</strong> Para la tipografía del sitio web (Inter, Manrope).</li>
                            </ul>
                        </div>

                        {/* 6. Cookies */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                6. Cookies
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Nuestro sitio web utiliza cookies esenciales para su correcto funcionamiento. Estas cookies no recopilan información personal identificable y son necesarias para:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-slate">
                                <li>Mantener la sesión del usuario</li>
                                <li>Recordar preferencias de navegación</li>
                                <li>Garantizar la seguridad del sitio</li>
                            </ul>
                            <p className="text-slate leading-relaxed mt-4">
                                Podés configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
                            </p>
                        </div>

                        {/* 7. Seguridad */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                7. Seguridad de los Datos
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos personales contra acceso no autorizado, pérdida, alteración o destrucción. Estas medidas incluyen:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-slate mt-4">
                                <li>Cifrado de datos en tránsito (HTTPS/SSL)</li>
                                <li>Encriptación de contraseñas con bcrypt</li>
                                <li>Control de acceso basado en roles</li>
                                <li>Protección contra CSRF y SQL injection</li>
                            </ul>
                        </div>

                        {/* 8. Derechos del usuario */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                8. Tus Derechos
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Como titular de tus datos personales, tenés derecho a:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-slate">
                                <li><strong>Acceso:</strong> Solicitar información sobre los datos que tenemos sobre vos.</li>
                                <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
                                <li><strong>Eliminación:</strong> Solicitar la supresión de tus datos personales.</li>
                                <li><strong>Oposición:</strong> Oponerte al tratamiento de tus datos para determinados fines.</li>
                                <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado.</li>
                                <li><strong>Revocación del consentimiento:</strong> Retirar tu consentimiento en cualquier momento.</li>
                            </ul>
                            <p className="text-slate leading-relaxed mt-4">
                                Para ejercer cualquiera de estos derechos, podés contactarnos a <a href="mailto:gerencia@kaizensolutionscol.com" className="text-daylight-sky hover:text-egyptian underline">gerencia@kaizensolutionscol.com</a>.
                            </p>
                        </div>

                        {/* 9. Retención de datos */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                9. Retención de Datos
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Conservamos tus datos personales únicamente durante el tiempo necesario para cumplir con las finalidades descritas en esta política, o según lo exija la legislación aplicable. Una vez que los datos ya no sean necesarios, serán eliminados de manera segura.
                            </p>
                        </div>

                        {/* 10. Legislación aplicable */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                10. Legislación Aplicable
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Esta política se rige por las leyes de protección de datos personales aplicables en:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-slate mt-4">
                                <li><strong>Argentina:</strong> Ley N° 25.326 de Protección de Datos Personales y sus normas complementarias.</li>
                                <li><strong>Colombia:</strong> Ley 1581 de 2012 y el Decreto 1377 de 2013 sobre Protección de Datos Personales.</li>
                            </ul>
                        </div>

                        {/* 11. Menores */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                11. Menores de Edad
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente datos personales de menores. Si detectamos que hemos recopilado información de un menor, procederemos a eliminarla de inmediato.
                            </p>
                        </div>

                        {/* 12. Cambios en la política */}
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                12. Cambios en esta Política
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Cualquier cambio será publicado en esta página con la fecha de la última actualización. Te recomendamos revisar esta política periódicamente.
                            </p>
                        </div>

                        {/* 13. Contacto */}
                        <div className="bg-gradient-to-br from-egyptian/5 to-daylight-sky/5 rounded-2xl p-8 border border-daylight-sky/20">
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                13. Contacto
                            </h2>
                            <p className="text-slate leading-relaxed mb-4">
                                Si tenés preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de tus datos personales, podés contactarnos a través de:
                            </p>
                            <ul className="list-none space-y-2 text-slate">
                                <li>📧 <strong>Email:</strong> <a href="mailto:gerencia@kaizensolutionscol.com" className="text-daylight-sky hover:text-egyptian underline">gerencia@kaizensolutionscol.com</a></li>
                                <li>📱 <strong>WhatsApp ARG:</strong> <a href="https://wa.me/5491163515966" className="text-daylight-sky hover:text-egyptian underline">+54 9 11 6351-5966</a></li>
                                <li>📱 <strong>WhatsApp COL:</strong> <a href="https://wa.me/573212050514" className="text-daylight-sky hover:text-egyptian underline">+57 321 205 0514</a></li>
                            </ul>
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
