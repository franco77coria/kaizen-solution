import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Client } from "@upstash/qstash";
import { SenderPool } from "@/lib/sender-pool";

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
        if (!campaign.list) return NextResponse.json({ error: "La lista asociada fue eliminada" }, { status: 400 });

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
                    where: { listId: campaign.listId! },
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

        if (!process.env.QSTASH_TOKEN) {
            console.warn("QStash no configurado. Jobs creados en DB pero no encolados.");
            return NextResponse.json({ success: true, message: "Modo Local: Jobs en DB listos pero QStash inactivo." });
        }

        // Intentar usar el nuevo worker distribuido
        const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
        const workerUrl = `${appUrl}/api/whatsapp/campaigns/worker`;
        const legacyUrl = process.env.UPSTASH_WEBHOOK_URL;

        // Verificar si hay multi-senders configurados
        const senderPool = new SenderPool();
        await senderPool.initialize();

        if (senderPool.isReady()) {
            // Multi-sender: distribuir entre senders
            const distribution = senderPool.distribute(Math.min(totalContacts, 50));

            for (const { senderId, jobCount } of distribution) {
                await qstash.publishJSON({
                    url: workerUrl,
                    body: {
                        campaignId: campaign.id,
                        senderId,
                        batchSize: jobCount,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                totalJobs: totalContacts,
                senders: senderPool.getCount(),
                distribution: distribution.map(d => ({
                    senderId: d.senderId,
                    jobs: d.jobCount,
                })),
            });
        } else {
            // Sin multi-sender: usar worker con pool automático o legacy
            const targetUrl = legacyUrl || workerUrl;
            await qstash.publishJSON({
                url: targetUrl,
                body: {
                    action: "process_batch",
                    campaignId: campaign.id,
                    batchSize: 50
                },
            });

            return NextResponse.json({ success: true, totalJobs: totalContacts, mode: "single-sender" });
        }

    } catch (error: any) {
        console.error("Error starting campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to start" }, { status: 500 });
    }
}

