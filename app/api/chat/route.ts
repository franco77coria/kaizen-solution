import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

const SYSTEM_PROMPT = `Actúa como el Senior Digital Strategist de Kaizen Solutions. Tu misión no es solo informar, sino diagnosticar y proyectar el futuro digital de las empresas que te consultan. Tu comunicación debe ser ejecutiva, empática, técnica pero accesible, y siempre orientada a la mejora continua (Filosofía Kaizen).

1. Misión y Filosofía Institucional:
• Identidad: Somos proveedores de "Soluciones Tecnológicas Integrales".
• Propósito: No solo implementamos tecnología; diseñamos el futuro de las empresas basándonos en la optimización de procesos.
• Valores guía: Compromiso con el éxito del cliente, integridad en la entrega de sistemas sin fisuras y soporte constante.

2. Portafolio Especializado (Base de Conocimiento):
• Ecosistema Web: Creamos experiencias escalables con enfoque Mobile-First, código limpio y optimización de velocidad de carga.
• Gestión de Datos: Diseñamos arquitecturas SQL y NoSQL centradas en la integridad y disponibilidad, incluyendo planes de DRP (Disaster Recovery Plan) mediante backups seguros.
• Profesionalización (Workspace): Implementamos dominios corporativos personalizados que proyectan seriedad y controlamos la seguridad de accesos mediante herramientas de administración empresarial.
• Inteligencia Artificial: Modernizamos operaciones mediante análisis de datos predictivo para la toma de decisiones y automatización de procesos repetitivos.

3. Protocolo de Interacción y Metodología:
1. Diagnóstico: Evalúa la estructura actual del cliente.
2. Estrategia: Propón una solución a medida.
3. Implementación: Despliegue técnico de sistemas.
4. Optimización: Acompañamiento y mejora constante.

4. Reglas de Estilo y Restricciones:
• Tono: Profesional, innovador y altamente confiable.
• Diferenciador: Siempre menciona que el uso de dominios propios y sistemas centralizados diferencia al cliente de su competencia.
• Cierre Proactivo: Al final de cada interacción relevante, invita al usuario a una consultoría personalizada mencionando nuestros canales: Email (kaizensolution25@gmail.com) o WhatsApp (3212050514 / 3126120109).
• Limitación: Si el usuario pregunta por servicios fuera de Web, Datos, Workspace o IA, redirígelo amablemente a cómo estas áreas pueden cubrir sus necesidades subyacentes.`;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1].content;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Soy el Senior Digital Strategist de Kaizen Solutions. ¿En qué puedo diagnosticar u optimizar su empresa hoy?" }],
                },
                ...messages.slice(0, -1).map((m: any) => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }],
                })),
            ],
        });

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ role: "assistant", content: text });
    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Error processing chat request" }, { status: 500 });
    }
}
