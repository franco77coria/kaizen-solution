import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAudioForWhatsApp, getElevenLabsConfig } from "@/lib/elevenlabs";
import { uploadMediaToWhatsApp, sendWhatsAppAudio, getWhatsAppConfig, sendWhatsAppImage } from "@/lib/whatsapp";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await req.json();
        const { testPhone, type, templateId, audioConfig, mapping } = body;

        if (!testPhone) return NextResponse.json({ error: "Número de prueba requerido" }, { status: 400 });

        const config = await getWhatsAppConfig();
        if (!config || !config.apiToken) throw new Error("WhatsApp no configurado");

        if (type === 'image') {
            if (!audioConfig?.imageUrl) {
                return NextResponse.json({ error: "URL de imagen requerida" }, { status: 400 });
            }

            let captionTest = audioConfig.caption || "";
            const matches = captionTest.match(/\{(\w+)\}/g);
            if (matches) {
                const vars = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ""))));
                vars.forEach((v: any) => {
                    captionTest = captionTest.replace(new RegExp(`\\{${v}\\}`, 'g'), `[${v} de prueba]`);
                });
            }

            await sendWhatsAppImage(testPhone, audioConfig.imageUrl, captionTest || undefined);

            return NextResponse.json({ success: true, message: "Prueba de imagen enviada" });
        } else if (type === 'audio') {
            if (!audioConfig?.voiceId || !audioConfig?.prompt) {
                return NextResponse.json({ error: "Voz o Prompt faltante" }, { status: 400 });
            }

            let promptTest = audioConfig.prompt;
            const matches = promptTest.match(/\{(\w+)\}/g);
            if (matches) {
                const vars = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ""))));
                vars.forEach((v: any) => {
                    promptTest = promptTest.replace(new RegExp(`\\{${v}\\}`, 'g'), `[${v} de prueba]`);
                });
            }

            const { audioBuffer } = await generateAudioForWhatsApp(promptTest, audioConfig.voiceId);
            const mediaId = await uploadMediaToWhatsApp(audioBuffer, 'audio/ogg');

            await sendWhatsAppAudio(testPhone, mediaId);

            return NextResponse.json({ success: true, message: "Prueba de audio enviada" });
        } else {
            const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
            if (!template) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });

            const componentsParam: any[] = [];

            const parsedComponents = template.components ? JSON.parse(template.components) : [];
            const allNamedParams: { componentType: string, param_name: string }[] = [];
            for (const comp of parsedComponents) {
                const namedParams = comp.example?.header_text_named_params || comp.example?.body_text_named_params || [];
                for (const p of namedParams) {
                    if (p.param_name) allNamedParams.push({ componentType: comp.type, param_name: p.param_name });
                }
            }

            if (allNamedParams.length > 0) {
                const headerParams = allNamedParams
                    .filter(p => p.componentType === 'HEADER')
                    .map(p => ({ type: "text", parameter_name: p.param_name, text: `[${p.param_name}]` }));
                const bodyParams = allNamedParams
                    .filter(p => p.componentType === 'BODY')
                    .map(p => ({ type: "text", parameter_name: p.param_name, text: `[${p.param_name}]` }));

                if (headerParams.length > 0) componentsParam.push({ type: "header", parameters: headerParams });
                if (bodyParams.length > 0) componentsParam.push({ type: "body", parameters: bodyParams });
            }

            for (const comp of parsedComponents) {
                if (comp.type === 'BUTTONS' && comp.buttons) {
                    comp.buttons.forEach((btn: any, idx: number) => {
                        if (btn.type === 'FLOW') {
                            componentsParam.push({ type: "button", sub_type: "flow", index: String(idx), parameters: [] });
                        }
                    });
                }
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
