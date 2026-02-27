import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const campaignId = params.id;

        await prisma.campaignJob.updateMany({
            where: { campaignId, status: "pending" },
            data: { status: "cancelled" }
        });

        await prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: { status: "cancelled" }
        });

        return NextResponse.json({ success: true, message: "Campaña cancelada" });

    } catch (error: any) {
        console.error("Error deleting campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
    }
}
