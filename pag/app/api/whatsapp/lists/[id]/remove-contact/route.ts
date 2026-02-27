import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const { searchParams } = new URL(request.url)
        const contactId = searchParams.get("contactId")

        if (!contactId) {
            return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 })
        }

        await prisma.listSubscriber.delete({
            where: {
                listId_contactId: {
                    listId: params.id,
                    contactId: contactId
                }
            }
        })
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
