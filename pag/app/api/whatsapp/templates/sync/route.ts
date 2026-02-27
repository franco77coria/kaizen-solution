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
            const bodyComponent = t.components.find((c: any) => c.type === 'BODY');
            const bodyText = bodyComponent ? bodyComponent.text : "";

            const allNamedParams: string[] = [];
            for (const comp of t.components) {
                const namedParams = comp.example?.header_text_named_params || comp.example?.body_text_named_params || [];
                for (const p of namedParams) {
                    if (p.param_name) allNamedParams.push(p.param_name);
                }
            }
            const uniqueVars = Array.from(new Set(allNamedParams));

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
