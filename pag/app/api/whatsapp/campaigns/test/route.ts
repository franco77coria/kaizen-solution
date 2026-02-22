import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAudio, getElevenLabsConfig } from "@/lib/elevenlabs";
import { convertToOggOpus } from "@/lib/audio-converter";
import { uploadMediaToWhatsApp, sendWhatsAppAudio } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await req.json();
        const { testPhone, type, templateId, audioConfig, mapping } = body;

        if (!testPhone) return NextResponse.json({ error: "Número de prueba requerido" }, { status: 400 });

        const config = await prisma.whatsAppConfig.findFirst();
        if (!config || !config.apiToken) throw new Error("WhatsApp no configurado");

        if (type === 'audio') {
            if (!audioConfig?.voiceId || !audioConfig?.prompt) {
                return NextResponse.json({ error: "Voz o Prompt faltante" }, { status: 400 });
            }

            // Para la prueba, simplemente reemplazamos con valores dummy visibles
            let promptTest = audioConfig.prompt;
            const matches = promptTest.match(/\{(\w+)\}/g);
            if (matches) {
                const vars = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ""))));
                vars.forEach((v: any) => {
                    promptTest = promptTest.replace(new RegExp(`\\{${v}\\}`, 'g'), `[${v} de prueba]`);
                });
            }

            const { audioBuffer } = await generateAudio(promptTest, audioConfig.voiceId);
            const oggBuffer = await convertToOggOpus(audioBuffer);
            const mediaId = await uploadMediaToWhatsApp(oggBuffer, 'audio/ogg');

            await sendWhatsAppAudio(testPhone, mediaId);

            return NextResponse.json({ success: true, message: "Prueba de audio enviada" });
        } else {
            const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
            if (!template) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });

            const componentsParam: any[] = [];
            const bodyParams: any[] = [];

            // Dummy mapping vars
            const mappingObj = mapping || {};
            for (const [varIndex, _] of Object.entries(mappingObj)) {
                bodyParams.push({
                    type: "text",
                    text: `[Prueba ${varIndex}]`
                });
            }

            if (bodyParams.length > 0) {
                componentsParam.push({
                    type: "body",
                    parameters: bodyParams
                });
            }

            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: testPhone,
                type: "template",
                template: {
                    name: template.name,
                    language: { code: template.language || 'es' },
                    ...(componentsParam.length > 0 && { components: componentsParam })
                }
            };

            const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                return NextResponse.json({ success: true, message: "Template de prueba enviado" });
            } else {
                throw new Error(data.error?.message || "Error Graph API");
            }
        }
    } catch (e: any) {
        console.error("Test Campaign Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
