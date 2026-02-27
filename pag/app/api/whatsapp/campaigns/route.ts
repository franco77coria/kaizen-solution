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
        const { name, type, listId, templateId, mapping, audioConfig } = body;

        const newListData = await prisma.whatsAppCampaign.create({
            data: {
                name,
                type: type || "template",
                listId,
                templateId: templateId || null,
                mapping: JSON.stringify(mapping || {}),
                audioConfig: audioConfig ? JSON.stringify(audioConfig) : null,
                status: "draft",
                stats: JSON.stringify({ total: 0, sent: 0, delivered: 0, read: 0, failed: 0 })
            },
        });

        return NextResponse.json(newListData);
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to create campaign" }, { status: 500 });
    }
}
