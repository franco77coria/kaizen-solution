import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// POST es público (lo usa el formulario de contacto y el chatbot).
// GET y PATCH exponen/modifican datos de leads: solo admin.

const createLeadSchema = z
    .object({
        name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
        email: z.union([z.string().trim().email('Email inválido').max(200), z.literal('')]).optional(),
        whatsapp: z.union([z.string().trim().min(6, 'Teléfono inválido').max(30), z.literal('')]).optional(),
        company: z.string().trim().max(150).optional(),
        message: z.string().trim().max(2000).optional(),
        conversationSummary: z.string().max(2000).optional(),
        // Honeypot: los bots completan todo; una persona no ve este campo.
        website: z.string().max(200).optional(),
    })
    // El formulario pide email y el chatbot pide WhatsApp: sirve cualquiera de
    // los dos, pero un lead sin ninguna forma de contacto no sirve para nada.
    .refine((d) => Boolean(d.email || d.whatsapp), {
        message: 'Hace falta un email o un teléfono de contacto',
        path: ['email'],
    });

const updateLeadSchema = z.object({
    id: z.string().min(1),
    status: z.enum(['new', 'contacted', 'qualified', 'closed', 'discarded']).optional(),
    notes: z.string().max(2000).nullish(),
});

export async function POST(req: NextRequest) {
    const limited = checkRateLimit(req, { name: 'leads', limit: 5, windowMs: 10 * 60_000 });
    if (limited) return limited;

    let parsed;
    try {
        parsed = createLeadSchema.safeParse(await req.json());
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { name, email, whatsapp, company, message, conversationSummary, website } = parsed.data;

    // Honeypot completado -> bot. Respondemos 200 para no darle señal.
    if (website) {
        return NextResponse.json({ success: true });
    }

    const summary =
        conversationSummary ||
        [
            message ? `Mensaje: ${message}` : 'Sin mensaje',
            company ? `Empresa: ${company}` : null,
            email ? `Email: ${email}` : null,
        ]
            .filter(Boolean)
            .join(' | ');

    try {
        await prisma.chatLead.create({
            data: {
                name,
                email: email || null,
                whatsapp: whatsapp || '',
                company: company || null,
                conversationSummary: summary,
                status: 'new',
            },
        });

        // No devolvemos el lead: el cliente no necesita el id ni los timestamps.
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[api/leads] POST falló:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'No se pudo guardar la solicitud' }, { status: 500 });
    }
}

export async function GET() {
    const denied = await requireAdmin();
    if (denied) return denied;

    try {
        const leads = await prisma.chatLead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 500,
        });

        return NextResponse.json({ leads });
    } catch (error) {
        console.error('[api/leads] GET falló:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const denied = await requireAdmin();
    if (denied) return denied;

    let parsed;
    try {
        parsed = updateLeadSchema.safeParse(await req.json());
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { id, status, notes } = parsed.data;

    try {
        const lead = await prisma.chatLead.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
            },
        });

        return NextResponse.json({ success: true, lead });
    } catch (error) {
        console.error('[api/leads] PATCH falló:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }
}
