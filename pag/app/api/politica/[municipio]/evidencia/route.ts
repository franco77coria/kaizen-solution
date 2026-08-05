import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obtenerSesionPol } from '@/lib/politica/session'
import { getMunicipio } from '@/lib/politica/municipios'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(
    req: NextRequest,
    { params }: { params: { municipio: string } }
) {
    const municipio = getMunicipio(params.municipio)
    if (!municipio) return NextResponse.json({ error: 'Municipio no encontrado' }, { status: 404 })

    const sesion = await obtenerSesionPol()
    if (!sesion) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const fileExt = file.name.split('.').pop()
        const fileName = `${municipio.slug}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data, error } = await supabase.storage
            .from('politica-evidencias')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            })

        if (error) {
            console.error('Error al subir a Supabase Storage:', error)
            return NextResponse.json({ error: 'Error al guardar archivo en el almacenamiento' }, { status: 500 })
        }

        const { data: publicData } = supabase.storage
            .from('politica-evidencias')
            .getPublicUrl(fileName)

        return NextResponse.json({
            success: true,
            url: publicData.publicUrl,
            nombre: file.name,
            mime: file.type,
            tamano: file.size,
        })
    } catch (err: any) {
        console.error('Error procesando evidencia:', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
