import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { contacts, listId } = body;

        // contacts = [{ phone: "+54911...", name: "Juan", tags: "['VIP']", externalId: "123" }]

        if (!contacts || !Array.isArray(contacts)) {
            return NextResponse.json({ error: "Formato de contactos inválido" }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Iteramos y guardamos (Upsert para no duplicar por número)
        for (const contact of contacts) {
            if (!contact.phone) {
                errorCount++;
                errors.push({ fila: contact, error: "Teléfono faltante" });
                continue;
            }

            try {
                // En una app más avanzada, aquí validaríamos E.164 con librerías como google-libphonenumber
                const phone = contact.phone.replace(/[^0-9]/g, ""); // limpieza básica

                const dbContact = await prisma.whatsAppContact.upsert({
                    where: { phone },
                    update: {
                        name: contact.name || undefined,
                        tags: contact.tags || undefined,
                        externalId: contact.externalId || undefined,
                        source: "CSV",
                    },
                    create: {
                        phone,
                        name: contact.name,
                        tags: contact.tags || "[]",
                        externalId: contact.externalId,
                        source: "CSV",
                    }
                });

                // Si se seleccionó una lista, suscribirlo
                if (listId) {
                    // Buscamos si ya está para no violar Constraint
                    const exists = await prisma.listSubscriber.findUnique({
                        where: { listId_contactId: { listId, contactId: dbContact.id } }
                    });

                    if (!exists) {
                        await prisma.listSubscriber.create({
                            data: {
                                listId,
                                contactId: dbContact.id
                            }
                        });
                    }
                }

                successCount++;
            } catch (err: any) {
                errorCount++;
                errors.push({ phone: contact.phone, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            successCount,
            errorCount,
            errors
        });

    } catch (error: any) {
        console.error("Error importing contacts:", error);
        return NextResponse.json({ error: error.message || "Failed to import contacts" }, { status: 500 });
    }
}
