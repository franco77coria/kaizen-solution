import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export async function POST() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const config = await getWhatsAppConfig();

        if (!config || !config.apiToken || !config.wabaId) {
            return NextResponse.json({ error: "WhatsApp API no está configurada o falta WABA ID" }, { status: 400 });
        }

        // Llamar a Graph API para obtener plantillas de la WABA (WhatsApp Business Account)
        const url = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}/message_templates?limit=100`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
            },
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || "Error al obtener plantillas de Meta");
        }

        const data = await res.json();
        const templates = data.data;

        if (!templates) {
            return NextResponse.json({ count: 0, message: "No se encontraron plantillas en Meta." });
        }

        let syncedCount = 0;

        // Procesar y guardar en BD Local
        for (const t of templates) {
            // Intentamos extraer las variables requeridas (ej. {{1}}, {{2}}) del texto (BODY)
            const bodyComponent = t.components.find((c: any) => c.type === 'BODY');
            const bodyText = bodyComponent ? bodyComponent.text : "";

            const regex = /\{\{([^}]+)\}\}/g;
            const variablesEncontradas = [];
            let match;
            while ((match = regex.exec(bodyText)) !== null) {
                variablesEncontradas.push(match[1]);
            }

            const uniqueVars = Array.from(new Set(variablesEncontradas)).sort((a, b) => {
                const na = parseInt(a), nb = parseInt(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.localeCompare(b);
            });

            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/f9affe2b-8796-441f-9dcd-82782f1c48ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'templates-sync-route.ts:SYNC',message:'Template variable detection',data:{templateName:t.name,bodyText,variablesEncontradas,uniqueVars},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
            // #endregion

            await prisma.whatsAppTemplate.upsert({
                where: { name_language: { name: t.name, language: t.language } },
                update: {
                    status: t.status,
                    category: t.category,
                    bodyText: bodyText,
                    components: JSON.stringify(t.components),
                    variables: JSON.stringify(uniqueVars),
                    wabaId: t.id
                },
                create: {
                    wabaId: t.id,
                    name: t.name,
                    language: t.language,
                    status: t.status,
                    category: t.category,
                    bodyText: bodyText,
                    components: JSON.stringify(t.components),
                    variables: JSON.stringify(uniqueVars),
                }
            });
            syncedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Se sincronizaron ${syncedCount} plantillas correctamente.`
        });

    } catch (error: any) {
        console.error("Error sincronizando plantillas:", error);
        return NextResponse.json({ error: error.message || "Failed to sync templates" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const templates = await prisma.whatsAppTemplate.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(templates);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}
