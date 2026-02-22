import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Set up ffmpeg path from the installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Convierte un buffer de audio (ej. el MP3 devuelto por ElevenLabs) a
 * formato Ogg Opus, que es el único que Meta WhatsApp renderizará 
 * con UI de "Nota de Voz" (voice_message) en lugar de un archivo normal.
 */
export async function convertToOggOpus(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // Create temporary file paths
        const tempId = Date.now() + '-' + Math.round(Math.random() * 10000);
        const inputPath = path.join(os.tmpdir(), `input-${tempId}.mp3`);
        const outputPath = path.join(os.tmpdir(), `output-${tempId}.ogg`);

        try {
            // Write the input buffer to a temp file
            fs.writeFileSync(inputPath, inputBuffer);

            // Run FFmpeg conversion
            ffmpeg(inputPath)
                .toFormat('ogg')
                // Opus codec requirements for WhatsApp
                .audioCodec('libopus')
                .audioChannels(1) // Mono
                .audioFrequency(16000) // 16kHz
                .addOutputOptions([
                    '-vbr on',
                    '-compression_level 10',
                    '-frame_duration 20',
                    '-application voip',
                ])
                .on('end', () => {
                    try {
                        // Read the converted file back into a Buffer
                        const outputBuffer = fs.readFileSync(outputPath);

                        // Clean up temp files
                        fs.unlinkSync(inputPath);
                        fs.unlinkSync(outputPath);

                        resolve(outputBuffer);
                    } catch (readErr) {
                        reject(new Error(`Error leyendo el archivo convertido: ${readErr}`));
                    }
                })
                .on('error', (err) => {
                    // Try to clean up on error
                    try {
                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    } catch (e) { }

                    console.error('FFmpeg Conversion Error:', err);
                    reject(new Error(`Error de transcodificación FFmpeg: ${err.message}`));
                })
                .save(outputPath);

        } catch (err: any) {
            reject(new Error(`Error preparando archivos temporales: ${err.message}`));
        }
    });
}
