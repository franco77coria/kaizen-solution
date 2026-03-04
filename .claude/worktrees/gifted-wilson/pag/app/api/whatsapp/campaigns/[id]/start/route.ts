import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client } from "@upstash/qstash";

// Inicializar QStash Client
const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const campaignId = params.id;

        const campaign = await prisma.whatsAppCampaign.findUnique({
            where: { id: campaignId },
            include: {
                list: { include: { subscribers: { include: { contact: true } } } },
                template: true,
            }
        });

        if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
        if (campaign.status === 'completed') return NextResponse.json({ error: "Ya completada" }, { status: 400 });

        const totalContacts = campaign.list.subscribers.length;
        if (totalContacts === 0) return NextResponse.json({ error: "Lista vacía" }, { status: 400 });

        // 1. Si está en Draft, prepararla: crear registro de Job por cada contacto en la base de datos
        // para tener control sobre quién recibió y quién no
        if (campaign.status === 'draft') {
            const jobsToCreate = campaign.list.subscribers.map(sub => ({
                campaignId: campaign.id,
                phone: sub.contact.phone,
                status: "pending"
            }));

            // Inserción en batch (Evitamos duplicates con ignore/skip si existieran, pero es un createMany fresh)
            await prisma.campaignJob.createMany({
                data: jobsToCreate,
                skipDuplicates: true
            });

            // Actualizar stats de la campaña a 0/total
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: {
                    status: "running",
                    stats: JSON.stringify({ total: totalContacts, sent: 0, delivered: 0, read: 0, failed: 0 })
                }
            });
        } else if (campaign.status === 'paused') {
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: { status: "running" }
            });
        }

        // 2. Disparar el primer Batch a QStash para que lo procese en Background (sin bloquear la API de Vercel)
        // Asumimos que TÚ configuras UPSTASH_WEBHOOK_URL en Vercel (ej: tu-dominio.com/api/whatsapp/campaigns/processor)

        const webhookUrl = process.env.UPSTASH_WEBHOOK_URL;

        // NOTA: Si no hay Token ni Webhook definido (ej. en desarrollo local sin ngrok), simulamos error amigable
        if (!process.env.QSTASH_TOKEN || !webhookUrl) {
            console.warn("⚠️ QStash no configurado. Solo se crearon los Jobs en DB pero no se encolaron.");
            // Dejamos en DB y requerirá un cron normal o un runner manual local.
            return NextResponse.json({ success: true, message: "Modo Local: Jobs en DB listos pero QStash inactivo." });
        }

        await qstash.publishJSON({
            url: webhookUrl,
            body: {
                action: "process_batch",
                campaignId: campaign.id,
                batchSize: 50 // Mandaremos de a 50 para respetar Rate Limits de Meta
            },
            // delay: 5 (Podemos agregar retraso)
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error starting campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to start" }, { status: 500 });
    }
}
