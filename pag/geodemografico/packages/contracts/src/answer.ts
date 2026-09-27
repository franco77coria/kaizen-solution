import { z } from 'zod'
import type { AnalyticsResult, QueryTemplate } from './query-plan.js'

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

/**
 * Datos que respaldan una respuesta de conteo. El resultado es el de una
 * consulta cerrada ya suprimida (un grupo chico es n/d, no cero): el modelo
 * no escribe ninguno de estos numeros.
 */
export interface RespuestaDatos {
  runId: string
  template: QueryTemplate
  /** Titulo legible, por ejemplo "Personas sumadas por municipio". */
  titulo: string
  /** Filtros aplicados, en palabras. Se muestran siempre junto al numero. */
  filtros: string[]
  resultado: AnalyticsResult
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
  /** Presente cuando la respuesta sale de una consulta analitica. */
  datos?: RespuestaDatos
  /** Id del mensaje guardado: con el se exporta la respuesta a un dashboard. */
  messageId?: string
}
