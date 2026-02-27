import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const campaigns = await prisma.whatsAppCampaign.findMany({
            include: {
                list: true,
                template: true,
                _count: { select: { jobs: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(campaigns);
    } catch (error) {
        console.error("Error fetching campaigns:", error);
        return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const body = await req.json();
        const { name, type, listId, templateId, mapping, audioConfig, audienceMode } = body;

        let finalListId = listId;

        if (audienceMode === 'active_window' && (type === 'image' || type === 'audio')) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const activeContacts = await prisma.whatsAppContact.findMany({
                where: {
                    lastMessageAt: { gte: twentyFourHoursAgo },
                    optInStatus: true,
                },
                select: { id: true, phone: true }
            });

            if (activeContacts.length === 0) {
                return NextResponse.json({ error: "No hay contactos con ventana activa en las últimas 24hs" }, { status: 400 });
            }

            const windowList = await prisma.contactList.create({
                data: {
                    name: `Ventana Activa - ${name} (${activeContacts.length})`,
                    description: `Lista generada automáticamente con ${activeContacts.length} contactos que tienen ventana abierta`,
                }
            });

            const CHUNK = 500;
            for (let i = 0; i < activeContacts.length; i += CHUNK) {
                const chunk = activeContacts.slice(i, i + CHUNK);
                await prisma.listSubscriber.createMany({
                    data: chunk.map(c => ({
                        listId: windowList.id,
                        contactId: c.id,
                    })),
                    skipDuplicates: true,
                });
            }

            finalListId = windowList.id;
        }

        const newCampaign = await prisma.whatsAppCampaign.create({
            data: {
                name,
                type: type || "template",
                listId: finalListId,
                templateId: templateId || null,
                mapping: JSON.stringify(mapping || {}),
                audioConfig: audioConfig ? JSON.stringify(audioConfig) : null,
                status: "draft",
                stats: JSON.stringify({ total: 0, sent: 0, delivered: 0, read: 0, failed: 0 })
            },
        });

        return NextResponse.json(newCampaign);
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to create campaign" }, { status: 500 });
    }
}
