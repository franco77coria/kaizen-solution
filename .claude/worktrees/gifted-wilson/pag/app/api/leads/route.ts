import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { name, whatsapp, conversationSummary } = await req.json();

        if (!name || !whatsapp) {
            return NextResponse.json(
                { error: 'Name and WhatsApp are required' },
                { status: 400 }
            );
        }

        const lead = await prisma.chatLead.create({
            data: {
                name,
                whatsapp,
                conversationSummary: conversationSummary || 'No summary provided',
                status: 'new'
            }
        });

        return NextResponse.json({ success: true, lead });
    } catch (error) {
        console.error('Error saving lead:', error);
        return NextResponse.json(
            { error: 'Failed to save lead' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const leads = await prisma.chatLead.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ leads });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leads' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, status, notes } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Lead ID is required' },
                { status: 400 }
            );
        }

        const lead = await prisma.chatLead.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes })
            }
        });

        return NextResponse.json({ success: true, lead });
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json(
            { error: 'Failed to update lead' },
            { status: 500 }
        );
    }
}
