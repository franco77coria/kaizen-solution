import { z } from 'zod'

/**
 * Contrato de respuesta del modelo. El modelo devuelve JSON que cumple este
 * schema y NADA mas: no URLs, no SQL, no llamadas a herramientas.
 * Las citas se validan despues contra los fragmentos que el servidor
 * realmente entrego; un chunk_id inventado invalida la respuesta entera.
 */
export const citationSchema = z.object({
  chunkId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentVersionId: z.string().uuid(),
  /** Fragmento textual corto que respalda la afirmacion. */
  quote: z.string().min(1).max(500),
})

export const modelAnswerSchema = z.object({
  /** true cuando la evidencia entregada no alcanza para responder. */
  abstained: z.boolean(),
  /** Respuesta breve en espanol. Vacia si abstained. */
  answer: z.string().max(4_000),
  /** Motivo de abstencion, visible al usuario. Vacio si no abstained. */
  abstentionReason: z.string().max(500).default(''),
  citations: z.array(citationSchema).max(20).default([]),
})

export type ModelAnswer = z.infer<typeof modelAnswerSchema>
export type Citation = z.infer<typeof citationSchema>

/** Fuente ya resuelta y reautorizada, tal como se muestra al usuario. */
export interface AnswerSource {
  documentId: string
  documentVersionId: string
  chunkId: string
  title: string
  /** Fecha conocida del documento. null cuando la fuente no la declara. */
  meetingAt: string | null
  /** De donde salio la fecha. No inventar una fecha para rellenar. */
  dateOrigin: 'provider_meeting' | 'document_metadata' | 'parsed_heading' | 'unknown'
  artifactType: 'meeting_notes' | 'transcript' | 'manual_document'
  /** Seccion o pestana dentro del documento, si el parser la identifico. */
  section: string | null
  quote: string
}

export interface ChatAnswer {
  abstained: boolean
  answer: string
  abstentionReason: string
  sources: AnswerSource[]
  /** true si toda la evidencia proviene de notas resumidas, no de transcripcion. */
  summaryOnly: boolean
  modelVersion: string
  promptVersion: string
}
