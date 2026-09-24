import type { ModelAnswer } from '@kaizen/contracts'

/** Fragmento autorizado que el servidor entrega como contexto. */
export interface EvidenceChunk {
  chunkId: string
  documentId: string
  documentVersionId: string
  title: string
  section: string | null
  meetingAt: string | null
  artifactType: 'meeting_notes' | 'transcript' | 'manual_document'
  content: string
}

export interface AnswerRequest {
  question: string
  evidence: EvidenceChunk[]
  /** Idioma de salida. El corpus es en espanol. */
  locale: 'es'
  deadlineMs: number
}

export interface AnswerOutcome {
  answer: ModelAnswer
  modelVersion: string
  promptVersion: string
  usage: { inputTokens: number; outputTokens: number }
}

export interface LlmAdapter {
  readonly name: string
  /** Estado del adaptador. `disabled` cuando falta configuracion externa. */
  status(): { enabled: boolean; reason: string | null; model: string }
  generateAnswer(request: AnswerRequest): Promise<AnswerOutcome>
}

export interface EmbeddingAdapter {
  readonly name: string
  readonly model: string
  readonly dimension: number
  status(): { enabled: boolean; reason: string | null }
  embed(texts: string[]): Promise<number[][]>
}
