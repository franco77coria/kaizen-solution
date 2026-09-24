import { modelAnswerSchema, type ModelAnswer } from '@kaizen/contracts'
import type { EvidenceChunk } from './types.js'

/**
 * Validador de la respuesta del modelo. Es la ultima barrera antes de mostrar
 * algo al usuario, y asume que el modelo puede equivocarse o alucinar.
 *
 * Que rechaza:
 *   - JSON que no cumple el contrato.
 *   - Una cita a un chunkId que el servidor NO entrego (id inventado).
 *   - Una cita cuyo documentId o versionId no coincide con el del chunk real.
 *   - Una "cita textual" que no aparece en el contenido del fragmento.
 *   - Una respuesta no vacia sin ninguna cita.
 */
export interface ValidationOutcome {
  ok: boolean
  answer: ModelAnswer
  /** Motivo tecnico del rechazo, para el log. No se muestra al usuario. */
  problems: string[]
}

/** Normaliza para comparar citas sin depender de espacios ni acentos. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function validateAnswer(raw: unknown, evidence: EvidenceChunk[]): ValidationOutcome {
  const problems: string[] = []

  const parsed = modelAnswerSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      answer: abstencion('La respuesta del modelo no cumplio el formato esperado.'),
      problems: [`schema: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`],
    }
  }

  const answer = parsed.data
  const porId = new Map(evidence.map((e) => [e.chunkId, e]))

  for (const cita of answer.citations) {
    const chunk = porId.get(cita.chunkId)
    if (!chunk) {
      // Un chunkId que no se entrego es una alucinacion, no un detalle menor.
      problems.push(`chunk inexistente: ${cita.chunkId}`)
      continue
    }
    if (chunk.documentId !== cita.documentId) {
      problems.push(`documentId no coincide para ${cita.chunkId}`)
    }
    if (chunk.documentVersionId !== cita.documentVersionId) {
      problems.push(`versionId no coincide para ${cita.chunkId}`)
    }
    if (!normalizar(chunk.content).includes(normalizar(cita.quote))) {
      problems.push(`la cita no aparece literalmente en ${cita.chunkId}`)
    }
  }

  if (!answer.abstained && answer.citations.length === 0) {
    problems.push('respuesta afirmativa sin ninguna cita')
  }

  if (!answer.abstained && answer.answer.trim().length === 0) {
    problems.push('respuesta vacia sin abstencion')
  }

  if (problems.length > 0) {
    // Ante cualquier problema se degrada a abstencion. Mostrar una respuesta
    // con citas invalidas seria peor que no responder.
    return {
      ok: false,
      answer: abstencion(
        'No pude verificar que la respuesta estuviera respaldada por las fuentes disponibles.',
      ),
      problems,
    }
  }

  return { ok: true, answer, problems: [] }
}

function abstencion(motivo: string): ModelAnswer {
  return { abstained: true, answer: '', abstentionReason: motivo, citations: [] }
}
