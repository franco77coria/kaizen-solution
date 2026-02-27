import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const contacts = await prisma.whatsAppContact.findMany({
            where: {
                lastMessageAt: { gte: twentyFourHoursAgo },
                optInStatus: true,
            },
            orderBy: { lastMessageAt: 'desc' },
            select: {
                id: true,
                phone: true,
                name: true,
                lastMessageAt: true,
            }
        });

        return NextResponse.json({
            count: contacts.length,
            contacts,
            windowCutoff: twentyFourHoursAgo.toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
