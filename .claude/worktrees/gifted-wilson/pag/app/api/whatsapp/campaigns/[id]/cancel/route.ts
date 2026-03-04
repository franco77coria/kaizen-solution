import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const campaignId = params.id;

        // Primero borramos todos los Jobs asociados
        await prisma.campaignJob.deleteMany({
            where: { campaignId }
        });

        // Luego borramos la campaña
        await prisma.whatsAppCampaign.delete({
            where: { id: campaignId }
        });

        return NextResponse.json({ success: true, message: "Campaña Eliminada" });

    } catch (error: any) {
        console.error("Error deleting campaign:", error);
        return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
    }
}
