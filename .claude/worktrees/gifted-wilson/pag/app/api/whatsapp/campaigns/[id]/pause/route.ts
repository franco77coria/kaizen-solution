import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const campaignId = params.id;

        // Solo marca la BD como 'paused'. El próximo Worker de QStash que ejecute un batch
        // consultará el status: si está paused, aborta y no encola el siguiente batch.
        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { status: "paused" }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error pausing campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to pause" }, { status: 500 });
    }
}
