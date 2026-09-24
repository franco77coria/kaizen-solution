import type { EmbeddingAdapter, LlmAdapter } from './types.js'
import { FakeEmbeddingAdapter, FakeLlmAdapter } from './fake.js'
import { GeminiEmbeddingAdapter, GeminiLlmAdapter } from './gemini.js'

/**
 * Seleccion del proveedor. Por defecto `fake`, que es determinista y no hace
 * red: en desarrollo y pruebas no hay forma de llamar al proveedor real por
 * accidente ni de gastar cuota sin quererlo.
 *
 * El modulo de Gemini solo define clases, sin efectos al importarse: elegir
 * `fake` no abre ninguna conexion ni lee ninguna credencial.
 */
export function createLlmAdapter(): LlmAdapter {
  const provider = process.env['LLM_PROVIDER'] ?? 'fake'
  switch (provider) {
    case 'fake':
      return new FakeLlmAdapter()
    case 'gemini_developer':
      return new GeminiLlmAdapter()
    default:
      throw new Error(`LLM_PROVIDER desconocido: ${provider}`)
  }
}

export function createEmbeddingAdapter(): EmbeddingAdapter {
  const provider = process.env['EMBEDDINGS_PROVIDER'] ?? process.env['LLM_PROVIDER'] ?? 'fake'
  switch (provider) {
    case 'fake':
      return new FakeEmbeddingAdapter()
    case 'gemini_developer':
      return new GeminiEmbeddingAdapter()
    default:
      throw new Error(`EMBEDDINGS_PROVIDER desconocido: ${provider}`)
  }
}
