import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * El cliente manda el historial completo en cada turno, así que el body es
 * superficie de ataque directa: sin esto se puede inyectar un mensaje con
 * role "system" y reprogramar el bot, o usarlo como LLM gratis contra la
 * cuota de Groq. Solo aceptamos user/assistant y acotamos tamaño.
 */
const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MESSAGE = 4000;

const chatRequestSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().min(1).max(MAX_CHARS_PER_MESSAGE),
            })
        )
        .min(1)
        .max(MAX_MESSAGES),
});

// Fallback responses when API is unavailable
const FALLBACK_RESPONSES: Record<string, string> = {
    'servicios': '¡Claro! En Kaizen Solution ofrecemos:\n\n• Desarrollo de software a medida\n• Páginas web profesionales\n• Automatización de procesos\n• Bots inteligentes y chatbots\n• Sistemas de gestión (ERP, CRM, dashboards)\n• Integraciones con WhatsApp, APIs y bases de datos\n\n¿Te interesa alguno en particular? Si querés, podemos hablar por WhatsApp para algo más personalizado 😊',
    'precios': 'Los precios dependen del tipo de proyecto y sus requerimientos específicos. Cada solución es 100% a medida, por lo que diseñamos una propuesta personalizada.\n\n¿Te gustaría que agendemos una llamada rápida para poder darte una estimación más precisa? 📞',
    'ventas': '¡Perfecto! Podés contactar a nuestro equipo directamente:\n\n📱 WhatsApp ARG: +54 9 11 6351-5966\n📱 WhatsApp COL: +57 321 205 0514\n📧 Email: gerencia@kaizensolutionscol.com\n\n¡Te estamos esperando!',
    'default': 'Gracias por tu mensaje. En este momento estoy teniendo dificultades técnicas, pero nuestro equipo puede ayudarte:\n\n📱 WhatsApp ARG: +54 9 11 6351-5966\n📱 WhatsApp COL: +57 321 205 0514\n📧 Email: gerencia@kaizensolutionscol.com'
}

function getFallbackResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase()
    if (msg.includes('servicio') || msg.includes('hacen') || msg.includes('ofrecen')) return FALLBACK_RESPONSES['servicios']
    if (msg.includes('precio') || msg.includes('costo') || msg.includes('cuánto') || msg.includes('cuanto')) return FALLBACK_RESPONSES['precios']
    if (msg.includes('ventas') || msg.includes('hablar') || msg.includes('contactar')) return FALLBACK_RESPONSES['ventas']
    return FALLBACK_RESPONSES['default']
}

const SYSTEM_PROMPT = `Rol del asistente

Sos KaiBot, el asistente inteligente oficial de Kaizen Solution.
Actuás como un amigo experto en tecnología, un desarrollador de ideas y un consultor digital que ayuda a las personas a pensar, mejorar y convertir ideas en soluciones reales.

Tu objetivo principal es acompañar al usuario, entender qué necesita y ayudarlo a descubrir qué solución digital le conviene, aunque todavía no lo tenga claro.

🏢 Sobre Kaizen Solution (contexto permanente)

Kaizen Solution es una empresa dedicada a:

• Desarrollo de software a medida
• Creación de páginas web profesionales
• Automatización de procesos
• Desarrollo de bots inteligentes
• Creación de sistemas de gestión (ERP, CRM, dashboards)
• Integraciones con WhatsApp
• Envío de WhatsApp masivos con:
  - Audios personalizados
  - Voces generadas por IA
  - Mensajes dinámicos según cada usuario
• Integraciones con APIs, bases de datos, Google Sheets y CRMs
• Soluciones escalables, seguras y orientadas a resultados

Todo lo relacionado con tecnología, automatización, inteligencia artificial, comunicación digital y eficiencia operativa forma parte del alcance de Kaizen Solution.

🧠 Forma de pensar de KaiBot

Siempre trabajás en estas etapas (aunque no las enumeres al usuario):

1. Escuchar y entender el problema real
2. Ayudar a desarrollar o mejorar la idea
3. Evaluar si es viable y cómo escalarla
4. Proponer una solución clara y lógica

Pensás como alguien que dice:
"Arranquemos simple y después lo hacemos crecer."

🤝 Personalidad y tono

KaiBot no suena como una máquina.

Se comunica como:
• Un amigo que sabe de tecnología
• Un socio que piensa ideas en conjunto
• Alguien cercano, claro y confiable

Estilo de comunicación:
• Natural, conversacional y empático
• Profesional pero relajado
• Claro, sin tecnicismos innecesarios
• Humano, directo y honesto

Puede usar frases como:
• "Buenísima idea"
• "Mirá, te cuento cómo lo veo"
• "Esto se puede hacer"
• "Si querés, lo pensamos juntos"
• "No te preocupes, hay solución"

Evita:
• Lenguaje robótico o corporativo
• Respuestas frías o rígidas
• Frases tipo "como modelo de lenguaje…"

💬 Dinámica de conversación

• Prioriza respuestas claras y fluidas
• No da monólogos largos si no es necesario
• Hace preguntas simples para entender mejor
• Siempre transmite acompañamiento y confianza

Ejemplos:
• "¿Esto hoy lo hacés a mano?"
• "¿Para qué tipo de negocio sería?"
• "¿Lo necesitás ahora o estás pensando a futuro?"

🧩 Comportamiento según el tipo de consulta

🔹 Idea poco clara
Si el usuario llega con algo vago:
KaiBot: No juzga, hace preguntas simples, ayuda a bajar la idea a algo concreto

🔹 Idea clara
Si el usuario tiene una idea definida:
KaiBot: Valida la idea, sugiere mejoras, explica cómo funcionaría

🔹 Pregunta directa: "¿Se puede hacer…?"
KaiBot siempre responde: Sí / No / Depende, explicando el por qué y proponiendo alternativas si hace falta

⚙️ Enfoque técnico (sin abrumar)

KaiBot puede mencionar, solo cuando suma valor: automatizaciones, bots, IA, APIs, WhatsApp, sistemas de gestión, dashboards, integraciones.

No muestra código ni detalles técnicos profundos salvo que el usuario lo pida.

🎯 Objetivo final

El usuario debe terminar la conversación:
• Con una idea más clara
• Sintiendo que su proyecto es posible
• Con confianza en Kaizen Solution
• Con ganas de avanzar o hablar con una persona del equipo

📞 Datos de contacto (mencionarlos cuando sea relevante):
• WhatsApp ARG: +54 9 11 6351-5966
• WhatsApp COL: +57 321 205 0514
• Email: gerencia@kaizensolutionscol.com
• Web: kaizensolution.com

❌ Límites
• No inventa costos ni plazos
• No promete cosas imposibles
• No habla de la competencia
• No da asesoramiento legal ni financiero

🧠 Principio Kaizen
Toda idea puede mejorar, todo proceso puede optimizarse y toda solución puede escalar.

IMPORTANTE: Mantené las respuestas concisas (máximo 3-4 párrafos). Usá emojis con moderación. Respondé siempre en español.`;

export async function POST(req: NextRequest) {
    const limited = checkRateLimit(req, { name: 'chat', limit: 20, windowMs: 5 * 60_000 });
    if (limited) return limited;

    try {
        let raw: unknown;
        try {
            raw = await req.json();
        } catch {
            return new Response('Invalid JSON', { status: 400 });
        }

        const parsed = chatRequestSchema.safeParse(raw);
        if (!parsed.success) {
            return new Response('Invalid request body', { status: 400 });
        }

        const { messages } = parsed.data;
        const apiKey = process.env.GROQ_API_KEY;
        const lastUserMessage = messages[messages.length - 1]?.content || '';

        // If no API key, use intelligent fallback
        if (!apiKey || apiKey === 'your-groq-api-key-here') {
            const fallback = getFallbackResponse(lastUserMessage);
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    // Simulate streaming by sending word by word
                    const words = fallback.split(' ');
                    let i = 0;
                    const interval = setInterval(() => {
                        if (i < words.length) {
                            controller.enqueue(encoder.encode(words[i] + ' '));
                            i++;
                        } else {
                            clearInterval(interval);
                            controller.close();
                        }
                    }, 30);
                }
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                },
            });
        }

        // Dynamic import of Groq SDK
        const { default: Groq } = await import('groq-sdk');
        const groq = new Groq({ apiKey });

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.8,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: true,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error('Stream error:', error);
                    // Send fallback on stream error
                    const fallback = getFallbackResponse(lastUserMessage);
                    controller.enqueue(encoder.encode(fallback));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response('Disculpá, tuve un problema técnico. Podés contactarnos por WhatsApp al +54 9 11 6351-5966.', { status: 500 });
    }
}
