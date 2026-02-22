import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

/**
 * Convierte un buffer de audio (ej. el MP3 devuelto por ElevenLabs) a
 * formato Ogg Opus, que es el único que Meta WhatsApp renderizará 
 * con UI de "Nota de Voz" (voice_message) en lugar de un archivo normal.
 * 
 * NOTA: Usa @ffmpeg/ffmpeg (WebAssembly) para compatibilidad con Vercel.
 */
export async function convertToOggOpus(inputBuffer: Buffer): Promise<Buffer> {
    const ffmpeg = new FFmpeg();

    try {
        await ffmpeg.load();

        const inputName = 'input.mp3';
        const outputName = 'output.ogg';

        // Escribir el buffer MP3 en el sistema de archivos virtual de FFmpeg (WASM)
        const uint8Input = new Uint8Array(inputBuffer);
        const inputBlob = new Blob([uint8Input], { type: 'audio/mpeg' });
        const inputDataArray = await fetchFile(inputBlob);
        await ffmpeg.writeFile(inputName, inputDataArray);

        // Ejecutar transcodificación a Opus/Ogg
        await ffmpeg.exec([
            '-i', inputName,
            '-c:a', 'libopus',
            '-ac', '1',
            '-ar', '16000',
            '-vbr', 'on',
            '-compression_level', '10',
            '-frame_duration', '20',
            '-application', 'voip',
            outputName
        ]);

        // Leer el archivo Ogg Opus generado
        const fileData = await ffmpeg.readFile(outputName);
        const data = fileData as Uint8Array;

        return Buffer.from(data);

    } catch (err: any) {
        console.error('FFmpeg Conversion Error:', err);
        throw new Error(`Error de transcodificación FFmpeg (WASM): ${err.message}`);
    } finally {
        try {
            ffmpeg.terminate();
        } catch (e) { }
    }
}
