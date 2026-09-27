import type { AnswerOutcome, AnswerRequest, EmbeddingAdapter, LlmAdapter } from './types.js'
import { PROMPT_VERSION } from './prompt.js'

/**
 * Adaptador DETERMINISTA para desarrollo local, pruebas y evaluaciones.
 * No hace red, no cuesta dinero y da siempre el mismo resultado.
 *
 * Implementa una recuperacion literal honesta: busca en los fragmentos las
 * palabras de la pregunta y cita la frase que las contiene. Si no encuentra
 * respaldo, se abstiene, igual que se le pide al modelo real.
 */
export class FakeLlmAdapter implements LlmAdapter {
  readonly name = 'fake'

  status(): { enabled: boolean; reason: string | null; model: string } {
    return { enabled: true, reason: null, model: 'fake-deterministic-v1' }
  }

  async generateAnswer(request: AnswerRequest): Promise<AnswerOutcome> {
    const terminos = tokenizar(request.question).filter((t) => t.length > 3)

    let mejor: { score: number; frase: string; chunkIndex: number } | null = null

    request.evidence.forEach((chunk, chunkIndex) => {
      for (const frase of dividirFrases(chunk.content)) {
        const texto = normalizar(frase)
        const score = terminos.reduce((acc, t) => (texto.includes(t) ? acc + 1 : acc), 0)
        if (score > 0 && (!mejor || score > mejor.score)) {
          mejor = { score, frase: frase.trim(), chunkIndex }
        }
      }
    })

    const elegido = mejor as { score: number; frase: string; chunkIndex: number } | null

    if (!elegido || elegido.score === 0) {
      return this.resultado({
        abstained: true,
        answer: '',
        abstentionReason: 'No encontre respaldo suficiente en las notas disponibles.',
        citations: [],
      })
    }

    const chunk = request.evidence[elegido.chunkIndex]
    if (!chunk) {
      return this.resultado({
        abstained: true,
        answer: '',
        abstentionReason: 'No encontre respaldo suficiente en las notas disponibles.',
        citations: [],
      })
    }

    return this.resultado({
      abstained: false,
      answer: elegido.frase,
      abstentionReason: '',
      citations: [
        {
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          documentVersionId: chunk.documentVersionId,
          quote: elegido.frase.slice(0, 400),
        },
      ],
    })
  }

  private resultado(answer: AnswerOutcome['answer']): AnswerOutcome {
    return {
      answer,
      modelVersion: 'fake-deterministic-v1',
      promptVersion: PROMPT_VERSION,
      usage: { inputTokens: 0, outputTokens: 0 },
    }
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function dividirFrases(texto: string): string[] {
  return texto.split(/(?<=[.!?])\s+/).filter((f) => f.trim().length > 0)
}

/**
 * Embeddings deterministas. Mismo texto, mismo vector, sin llamar a ningun
 * proveedor. Sirve para desarrollar y probar recuperacion sin credenciales.
 */
export class FakeEmbeddingAdapter implements EmbeddingAdapter {
  readonly name = 'fake'
  readonly model = 'fake-deterministic-768'
  readonly dimension = 768

  status(): { enabled: boolean; reason: string | null } {
    return { enabled: true, reason: null }
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => embeddingDeterminista(t, this.dimension))
  }
}

export function embeddingDeterminista(texto: string, dimension = 768): number[] {
  const vector = new Array<number>(dimension).fill(0)
  for (let i = 0; i < texto.length; i++) {
    const code = texto.charCodeAt(i)
    const idx = (code * 31 + i) % dimension
    vector[idx] = (vector[idx] ?? 0) + ((code % 17) - 8) / 8
  }
  const norma = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0)) || 1
  return vector.map((v) => v / norma)
}
