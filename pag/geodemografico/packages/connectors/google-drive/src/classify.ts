import type { ProviderFile } from './provider.js'

/**
 * Clasificacion de candidatos. Un nombre como "notas" o "reunion" es una
 * PISTA, nunca una certeza ni una autorizacion: por eso el resultado incluye
 * el nivel de confianza y los archivos ambiguos quedan pendientes de
 * seleccion manual en vez de entrar solos.
 */
export type ArtifactGuess = 'meeting_notes' | 'transcript' | 'manual_document'

export interface Classification {
  artifactType: ArtifactGuess
  confidence: 'provider_signal' | 'name_signal' | 'default'
  /** true cuando hace falta que una persona confirme antes de admitirlo. */
  needsConfirmation: boolean
  reason: string
}

const RE_TRANSCRIPCION = /\b(transcripci[oó]n|transcript|grabaci[oó]n)\b/i
const RE_NOTAS = /\b(notas?|minuta|acta|resumen|meeting notes)\b/i
const RE_REUNION = /\b(reuni[oó]n|comit[eé]|sesi[oó]n|consejo|meet)\b/i

export function classifyFile(file: ProviderFile): Classification {
  // 1. Senal del proveedor: es la unica evidencia fuerte.
  if (file.meetingKey) {
    if (RE_TRANSCRIPCION.test(file.name)) {
      return {
        artifactType: 'transcript',
        confidence: 'provider_signal',
        needsConfirmation: false,
        reason: 'archivo de reunion identificado por el proveedor, nombre de transcripcion',
      }
    }
    return {
      artifactType: 'meeting_notes',
      confidence: 'provider_signal',
      needsConfirmation: false,
      reason: 'archivo de reunion identificado por el proveedor',
    }
  }

  // 2. Senal de nombre: sugiere, pero exige confirmacion.
  if (RE_TRANSCRIPCION.test(file.name)) {
    return {
      artifactType: 'transcript',
      confidence: 'name_signal',
      needsConfirmation: true,
      reason: 'el nombre sugiere una transcripcion, sin confirmacion del proveedor',
    }
  }

  if (RE_NOTAS.test(file.name) || RE_REUNION.test(file.name)) {
    return {
      artifactType: 'meeting_notes',
      confidence: 'name_signal',
      needsConfirmation: true,
      reason: 'el nombre sugiere notas de reunion, sin confirmacion del proveedor',
    }
  }

  // 3. Sin senales: documento suelto. Nunca entra solo.
  return {
    artifactType: 'manual_document',
    confidence: 'default',
    needsConfirmation: true,
    reason: 'sin senales de reunion; requiere seleccion explicita',
  }
}
