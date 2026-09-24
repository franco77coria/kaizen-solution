export interface RetrievalCandidate {
  chunkId: string
  documentId: string
  documentVersionId: string
  title: string
  section: string | null
  meetingAt: string | null
  artifactType: 'meeting_notes' | 'transcript' | 'manual_document'
  content: string
  /** De que estrategia vino y con que posicion. Sirve para explicar y medir. */
  signals: { textRank?: number; vectorRank?: number; exactRank?: number }
  score: number
}

export interface RetrievalQuery {
  question: string
  /** Vector de la pregunta. null cuando el adaptador de embeddings no esta disponible. */
  questionEmbedding: number[] | null
  topK: number
  /** Filtro temporal opcional, derivado de la pregunta por reglas, no por el modelo. */
  since?: Date
  until?: Date
}
