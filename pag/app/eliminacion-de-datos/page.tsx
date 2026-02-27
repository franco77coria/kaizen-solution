import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { prisma } from "@/lib/prisma";

export const metadata = {
    title: "Eliminación de Datos | Kaizen Solution",
    description: "Instrucciones de cómo solicitar la eliminación de datos personales e información asociada a WhatsApp en Kaizen Solution S.A.S.",
};

export default async function EliminacionDatosPage() {
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
                        Instrucciones para la Eliminación de Datos
                    </h1>

                    <div className="prose prose-lg max-w-none text-outer-space space-y-8">
                        <div>
                            <p className="text-slate leading-relaxed font-semibold">
                                En virtud del cumplimiento de nuestra Política de Privacidad y las regulaciones de la plataforma Facebook/Meta sobre la eliminación de datos ("Data Deletion"), a continuación te explicamos cómo puedes solicitar la eliminación permanente de cualquier información o dato personal almacenado en Kaizen Solution S.A.S.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                1. Envía tu solicitud por Correo Electrónico
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Podés solicitarnos la eliminación total de tus registros enviando un correo a <a href="mailto:gerencia@kaizensolutionscol.com" className="text-daylight-sky hover:text-egyptian underline">gerencia@kaizensolutionscol.com</a> utilizando la misma dirección de correo electrónico con la cual creaste la cuenta o nos contactaste inicialmente.
                            </p>
                            <p className="text-slate leading-relaxed mt-4 bg-gray-100 p-4 border-l-4 border-egyptian">
                                <strong>Asunto sugerido:</strong> Solicitud de Eliminación de Datos de Usuario<br /><br />
                                <strong>Cuerpo del mensaje:</strong> Por favor, eliminen cualquier información personal y del negocio asociada a [Tu Nombre / Tu Empresa / Tu Número de WhatsApp] de forma definitiva de los registros de Kaizen Solution S.A.S.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                2. Desconexión de WhatsApp (Meta Business)
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Si has vinculado tu cuenta de WhatsApp Business con nuestra aplicación, ten en cuenta que también deberías remover los permisos otorgados desde el administrador comercial de Facebook (Meta Business Manager).
                            </p>
                            <ol className="list-decimal pl-6 space-y-2 mt-4 text-slate">
                                <li>Ingresa a <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-daylight-sky hover:text-egyptian underline">Facebook Business Manager</a>.</li>
                                <li>Dirígete a la sección <strong>Configuración del Negocio</strong>.</li>
                                <li>En el panel izquierdo, busca <strong>Integraciones</strong> &gt; <strong>Apps conectadas</strong>.</li>
                                <li>Selecciona la App de Kaizen Solution y haz clic en <strong>Eliminar acceso</strong>.</li>
                            </ol>
                        </div>

                        <div>
                            <h2 className="text-2xl font-heading font-bold text-egyptian mb-4">
                                3. Plazos del Procesamiento
                            </h2>
                            <p className="text-slate leading-relaxed">
                                Una vez que recibamos tu confirmación por correo, procesaremos la eliminación de forma permanente de nuestras bases de datos en un plazo no mayor a <strong>7 días hábiles</strong>. Te enviaremos un correo electrónico confirmando que el proceso fue exitoso.
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

