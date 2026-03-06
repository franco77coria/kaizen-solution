import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWhatsAppConfig, getTwilioTemplates, decrypt } from "@/lib/whatsapp";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const url = new URL(request.url)
        const senderId = url.searchParams.get('senderId')

        // If a specific sender is provided, sync templates for that sender
        if (senderId && senderId !== 'global') {
            const sender = await prisma.twilioSender.findUnique({ where: { id: senderId } })
            if (!sender) {
                return NextResponse.json({ error: "Sender no encontrado" }, { status: 404 })
            }

            const accountSid = decrypt(sender.accountSid)
            const authToken = decrypt(sender.authToken)
            const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

            // Fetch Content Templates from Twilio for this sender's account
            const listRes = await fetch("https://content.twilio.com/v1/Content?PageSize=100", {
                headers: { Authorization: `Basic ${credentials}` },
            })
            if (!listRes.ok) {
                const err = await listRes.json()
                return NextResponse.json({ error: err.message || "Error fetching templates from Twilio" }, { status: 500 })
            }
            const listData = await listRes.json()
            const contents = listData.contents || []

            if (!contents.length) {
                return NextResponse.json({ count: 0, message: "No se encontraron plantillas para este sender." })
            }

            const fetchApprovalStatus = async (sid: string): Promise<{ status: string; category: string }> => {
                try {
                    const res = await fetch(`https://content.twilio.com/v1/Content/${sid}/ApprovalRequests`, {
                        headers: { Authorization: `Basic ${credentials}` },
                    })
                    if (!res.ok) return { status: "PENDING", category: "UTILITY" }
                    const data = await res.json()
                    const wa = data?.whatsapp || data || {}
                    return {
                        status: (wa.status || "pending").toUpperCase(),
                        category: (wa.category || "UTILITY").toUpperCase(),
                    }
                } catch {
                    return { status: "PENDING", category: "UTILITY" }
                }
            }

            let syncedCount = 0
            for (const t of contents) {
                const typeKey = Object.keys(t.types || {})[0] || ""
                const typeData = t.types?.[typeKey] || {}
                const bodyText: string = typeData.body || ""
                const varMatches = bodyText.match(/\{\{(\w+)\}\}/g) || []
                const uniqueVars = Array.from(new Set(varMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""))))
                const language: string = t.language || "es"
                const name: string = t.friendly_name || t.sid

                const approval = await fetchApprovalStatus(t.sid)
                console.log(`[Sender Sync] Template "${name}" (${t.sid}) for ${sender.phoneNumber} — status: ${approval.status}`)

                const components = [{ type: "BODY", text: bodyText }]

                await prisma.whatsAppTemplate.upsert({
                    where: { name_language_senderPhone: { name, language, senderPhone: sender.phoneNumber } },
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
                        senderPhone: sender.phoneNumber,
                    }
                })
                syncedCount++
            }

            return NextResponse.json({
                success: true,
                message: `Se sincronizaron ${syncedCount} plantillas para ${sender.name} (${sender.phoneNumber}).`
            })
        }

        // Default: sync from global config
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
                    const wa = data?.whatsapp || data || {}
                    return {
                        status: (wa.status || "pending").toUpperCase(),
                        category: (wa.category || "UTILITY").toUpperCase(),
                    }
                } catch {
                    return { status: "PENDING", category: "UTILITY" }
                }
            }

            const senderPhone = config.twilioNumber || ""

            let syncedCount = 0;
            for (const t of contents) {
                const typeKey = Object.keys(t.types || {})[0] || "";
                const typeData = t.types?.[typeKey] || {};
                const bodyText: string = typeData.body || "";
                const varMatches = bodyText.match(/\{\{(\w+)\}\}/g) || [];
                const uniqueVars = Array.from(new Set(varMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ""))));
                const language: string = t.language || "es"
                const name: string = t.friendly_name || t.sid

                const approval = await fetchApprovalStatus(t.sid)
                console.log(`[Twilio Sync] Template "${name}" (${t.sid}) — status: ${approval.status}, category: ${approval.category}`)

                const components = [{ type: "BODY", text: bodyText }];

                await prisma.whatsAppTemplate.upsert({
                    where: { name_language_senderPhone: { name, language, senderPhone } },
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
                        senderPhone,
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

        const metaUrl = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}/message_templates?limit=100`;

        const metaRes = await fetch(metaUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.apiToken}` },
        });

        if (!metaRes.ok) {
            const errorData = await metaRes.json();
            throw new Error(errorData.error?.message || "Error al obtener plantillas de Meta");
        }

        const metaData = await metaRes.json();
        const templates = metaData.data;

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
                where: { name_language_senderPhone: { name: t.name, language: t.language, senderPhone: "" } },
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
                    senderPhone: "",
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

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const reqUrl = new URL(request.url)
        const senderPhone = reqUrl.searchParams.get('senderPhone')

        const config = await getWhatsAppConfig()
        const isTwilio = config?.provider === "twilio"

        const allTemplates = await prisma.whatsAppTemplate.findMany({
            orderBy: { name: 'asc' }
        });

        let templates
        if (senderPhone) {
            // Filter by specific sender phone
            templates = allTemplates.filter(t => t.senderPhone === senderPhone)
        } else if (isTwilio) {
            templates = allTemplates.filter(t => t.wabaId?.startsWith("HX"))
        } else {
            templates = allTemplates.filter(t => !t.wabaId?.startsWith("HX"))
        }

        return NextResponse.json(templates);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}
