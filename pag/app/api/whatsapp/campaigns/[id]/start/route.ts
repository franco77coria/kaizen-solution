import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Client } from "@upstash/qstash";

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || "NO_TOKEN",
});

const JOB_CHUNK_SIZE = 500;

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const campaignId = params.id;

        const campaign = await prisma.whatsAppCampaign.findUnique({
            where: { id: campaignId },
            include: { template: true, list: { include: { _count: { select: { subscribers: true } } } } }
        });

        if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
        if (campaign.status === 'completed') return NextResponse.json({ error: "Ya completada" }, { status: 400 });

        const totalContacts = campaign.list._count.subscribers;
        if (totalContacts === 0) return NextResponse.json({ error: "Lista vacía" }, { status: 400 });

        if (campaign.status === 'draft') {
            const fresh = await prisma.whatsAppCampaign.findUnique({ where: { id: campaignId } });
            if (fresh?.status !== 'draft') return NextResponse.json({ error: "Campaña ya fue iniciada" }, { status: 400 });

            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: {
                    status: "running",
                    stats: JSON.stringify({ total: totalContacts, sent: 0, delivered: 0, read: 0, failed: 0 })
                }
            });

            let offset = 0;
            let created = 0;
            while (offset < totalContacts) {
                const subs = await prisma.listSubscriber.findMany({
                    where: { listId: campaign.listId },
                    include: { contact: true },
                    skip: offset,
                    take: JOB_CHUNK_SIZE,
                });

                if (subs.length === 0) break;

                await prisma.campaignJob.createMany({
                    data: subs.map(sub => ({
                        campaignId: campaign.id,
                        phone: sub.contact.phone,
                        status: "pending"
                    })),
                    skipDuplicates: true
                });

                created += subs.length;
                offset += JOB_CHUNK_SIZE;
            }
        } else if (campaign.status === 'paused') {
            await prisma.whatsAppCampaign.update({
                where: { id: campaignId },
                data: { status: "running" }
            });
        }

        const webhookUrl = process.env.UPSTASH_WEBHOOK_URL;

        if (!process.env.QSTASH_TOKEN || !webhookUrl) {
            console.warn("QStash no configurado. Jobs creados en DB pero no encolados.");
            return NextResponse.json({ success: true, message: "Modo Local: Jobs en DB listos pero QStash inactivo." });
        }

        await qstash.publishJSON({
            url: webhookUrl,
            body: {
                action: "process_batch",
                campaignId: campaign.id,
                batchSize: 50
            },
        });

        return NextResponse.json({ success: true, totalJobs: totalContacts });

    } catch (error: any) {
        console.error("Error starting campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to start" }, { status: 500 });
    }
}
