import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWhatsAppConfig, getTwilioTemplates } from "@/lib/whatsapp";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const config = await getWhatsAppConfig();

        if (!config) {
            return NextResponse.json({ error: "WhatsApp API no está configurada" }, { status: 400 });
        }

        // ── Twilio: sync from Content API ──
        if (config.provider === "twilio") {
            const contents = await getTwilioTemplates(config);

            if (!contents.length) {
                return NextResponse.json({ count: 0, message: "No se encontraron plantillas en Twilio." });
            }

            // Helper: fetch approval status from Twilio's dedicated endpoint
            const credentials = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")
            const fetchApprovalStatus = async (sid: string): Promise<{ status: string; category: string }> => {
                try {
                    const res = await fetch(`https://content.twilio.com/v1/Content/${sid}/ApprovalRequests`, {
                        headers: { Authorization: `Basic ${credentials}` },
                    })
                    if (!res.ok) return { status: "PENDING", category: "UTILITY" }
                    const data = await res.json()
                    // Twilio returns: { whatsapp: { status: "approved", category: "MARKETING", ... } }
                    const wa = data?.whatsapp || data || {}
                    return {
                        status: (wa.status || "pending").toUpperCase(),
                        category: (wa.category || "UTILITY").toUpperCase(),
                    }
                } catch {
                    return { status: "PENDING", category: "UTILITY" }
                }
            }

            let syncedCount = 0;
            for (const t of contents) {
                // Twilio template body lives in types e.g. "twilio/text" or "twilio/media"
                const typeKey = Object.keys(t.types || {})[0] || "";
                const typeData = t.types?.[typeKey] || {};
                const bodyText: string = typeData.body || "";

                // Extract {{1}} style variables from body
                const varMatches = bodyText.match(/\{\{(\w+)\}\}/g) || [];
                const uniqueVars = Array.from(new Set(varMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""))));

                const language: string = t.language || "es"
                const name: string = t.friendly_name || t.sid

                // Fetch real approval status from Twilio
                const approval = await fetchApprovalStatus(t.sid)
                console.log(`[Twilio Sync] Template "${name}" (${t.sid}) — status: ${approval.status}, category: ${approval.category}`)

                // Build a components-like structure for compatibility with campaign UI
                const components = [{ type: "BODY", text: bodyText }];

                await prisma.whatsAppTemplate.upsert({
                    where: { name_language: { name, language } },
                    update: {
                        status: approval.status,
                        category: approval.category,
                        bodyText,
                        components: JSON.stringify(components),
                        variables: JSON.stringify(uniqueVars),
                        wabaId: t.sid,
                    },
                    create: {
                        wabaId: t.sid,
                        name,
                        language,
                        status: approval.status,
                        category: approval.category,
                        bodyText,
                        components: JSON.stringify(components),
                        variables: JSON.stringify(uniqueVars),
                    }
                });
                syncedCount++;
            }

            return NextResponse.json({
                success: true,
                message: `Se sincronizaron ${syncedCount} plantillas desde Twilio.`
            });
        }

        // ── Meta: sync from Graph API ──
        if (!config.apiToken || !config.wabaId) {
            return NextResponse.json({ error: "Falta el API Token de Meta o el WABA ID en la configuración" }, { status: 400 });
        }

        const url = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}/message_templates?limit=100`;

        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.apiToken}` },
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
                    bodyText,
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
                    bodyText,
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
        const config = await getWhatsAppConfig()
        const isTwilio = config?.provider === "twilio"

        const allTemplates = await prisma.whatsAppTemplate.findMany({
            orderBy: { name: 'asc' }
        });
        const templates = isTwilio
            ? allTemplates.filter(t => t.wabaId?.startsWith("HX"))
            : allTemplates.filter(t => !t.wabaId?.startsWith("HX"));
        return NextResponse.json(templates);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}
