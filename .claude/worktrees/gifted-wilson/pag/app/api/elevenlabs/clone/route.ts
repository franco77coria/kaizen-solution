import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cloneVoice, deleteVoice, logApiUsage } from "@/lib/elevenlabs"

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const name = formData.get("name") as string
        const description = formData.get("description") as string || ""
        const files = formData.getAll("files") as File[]

        if (!name) {
            return NextResponse.json({ error: "Nombre de voz requerido" }, { status: 400 })
        }

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "Subí al menos un archivo de audio de referencia" }, { status: 400 })
        }

        // Convert files to buffers
        const audioBuffers: Buffer[] = []
        const fileNames: string[] = []

        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer()
            audioBuffers.push(Buffer.from(arrayBuffer))
            fileNames.push(file.name)
        }

        const result = await cloneVoice(name, description, audioBuffers, fileNames)

        await logApiUsage("elevenlabs", "voice_clone", 1, 0, {
            voiceName: name,
            voiceId: result.voice_id,
            filesCount: files.length,
        })

        return NextResponse.json({
            success: true,
            voice_id: result.voice_id,
            name: result.name,
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Error al clonar voz" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    try {
        const { voiceId } = await request.json()
        if (!voiceId) {
            return NextResponse.json({ error: "Voice ID requerido" }, { status: 400 })
        }

        await deleteVoice(voiceId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Error al eliminar voz" },
            { status: 500 }
        )
    }
}
