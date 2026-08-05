import { NextRequest, NextResponse } from 'next/server'
import { cerrarSesionPol } from '@/lib/politica/session'

export async function POST(
    req: NextRequest,
    { params }: { params: { municipio: string } }
) {
    await cerrarSesionPol()
    return NextResponse.json({ success: true, redirect: `/politica/${params.municipio}/login` })
}
