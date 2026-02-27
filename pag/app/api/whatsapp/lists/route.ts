import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const lists = await prisma.contactList.findMany({
            include: {
                _count: {
                    select: { subscribers: true },
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(lists);
    } catch (error) {
        console.error("Error fetching lists:", error);
        return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }
        const body = await req.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const newList = await prisma.contactList.create({
            data: {
                name,
                description: description || null,
            },
        });

        return NextResponse.json(newList);
    } catch (error) {
        console.error("Error creating list:", error);
        return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
    }
}
