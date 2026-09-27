import { AppError } from '@kaizen/contracts'
import { logError, logger } from '@kaizen/observability'
import type { AnswerOutcome, AnswerRequest, EmbeddingAdapter, LlmAdapter } from './types.js'
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from './prompt.js'
import { loadGeminiApiKey } from './secret.js'

/**
 * Adaptador de Gemini Developer API.
 *
 * Estado: IMPLEMENTADO Y SIN VERIFICAR CONTRA EL PROVEEDOR. Durante el
 * desarrollo no se hizo ninguna llamada real: no hay credencial configurada
 * ni proyecto con facturacion. Ver ADR 0003 y el script verify-gemini.
 *
 * El adaptador NO habilita herramientas generales, busqueda web ni ejecucion
 * de codigo: solo generacion con schema de salida fijo.
 */
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** Estados transitorios: vale la pena reintentar. 401, 403 y 404 no. */
const REINTENTABLES = new Set([429, 500, 502, 503, 504])
const MAX_INTENTOS = 4

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    abstained: { type: 'BOOLEAN' },
    answer: { type: 'STRING' },
    abstentionReason: { type: 'STRING' },
    citations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          chunkId: { type: 'STRING' },
          documentId: { type: 'STRING' },
          documentVersionId: { type: 'STRING' },
          quote: { type: 'STRING' },
        },
        required: ['chunkId', 'documentId', 'documentVersionId', 'quote'],
      },
    },
  },
  required: ['abstained', 'answer', 'abstentionReason', 'citations'],
} as const

export class GeminiLlmAdapter implements LlmAdapter {
  readonly name = 'gemini_developer'
  private readonly model: string
  private readonly thinking: string

  constructor() {
    this.model = process.env['GEMINI_MODEL'] ?? 'gemini-3.7-flash'
    // La ficha admite low, medium y high. `minimal` NO esta soportado.
    const nivel = process.env['GEMINI_THINKING_LEVEL'] ?? 'low'
    this.thinking = ['low', 'medium', 'high'].includes(nivel) ? nivel : 'low'
  }

  status(): { enabled: boolean; reason: string | null; model: string } {
    try {
      const key = loadGeminiApiKey()
      if (!key) {
        return {
          enabled: false,
          // Se informa AUSENCIA, nunca un fragmento de la clave.
          reason: 'falta GEMINI_API_KEY (o GEMINI_API_KEY_FILE)',
          model: this.model,
        }
      }
      return { enabled: true, reason: null, model: this.model }
    } catch (error) {
      return {
        enabled: false,
        reason: error instanceof Error ? error.message : 'credencial invalida',
        model: this.model,
      }
    }
  }

  /**
   * Clasifica el fallo SIN registrar cabeceras ni la URL con clave.
   * Distinguir 401/403 de 429 importa: uno es configuracion, el otro capacidad.
   */
  private clasificarError(status: number): AppError {
    const causa =
      status === 401 || status === 403
        ? 'credencial rechazada o sin permiso sobre el modelo'
        : status === 404
          ? 'modelo inexistente o no disponible para este proyecto'
          : status === 429
            ? 'cuota agotada o limite de tasa'
            : `respuesta ${status} del proveedor`

    logError('llm.gemini_error', new Error(causa), { status, model: this.model })

    if (status === 429) return new AppError('RATE_LIMITED', causa)
    return new AppError('PROVIDER_UNAVAILABLE', causa)
  }

  /**
   * Una llamada con reintentos ante fallos TRANSITORIOS.
   *
   * Medido contra el proveedor el 2026-09-20 con una clave de nivel gratuito:
   * solo 2 de cada 6 llamadas devolvian 200. El resto alternaba 429 (limite de
   * tasa) y 503 ("high demand"). Un adaptador que se rinde al primer 429 es
   * inservible con esa cuota.
   *
   * 401, 403 y 404 NO se reintentan: son de configuracion, y reintentarlos
   * solo gasta tiempo y cuota.
   */
  private async llamarConReintentos(
    apiKey: string,
    body: unknown,
    deadlineMs: number,
  ): Promise<Response> {
    const limite = Date.now() + deadlineMs
    let ultimoEstado = 0

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const restante = limite - Date.now()
      if (restante <= 1_000) break

      let response: Response
      try {
        response = await fetch(`${BASE_URL}/models/${this.model}:generateContent`, {
          method: 'POST',
          // La clave viaja en CABECERA, no en la URL: una URL con clave termina
          // en logs de proxies, de acceso y en trazas de error.
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(restante, 30_000)),
        })
      } catch (error) {
        // Un `fetch` abortado por tiempo, o un fallo de red, lanza en vez de
        // devolver un estado. Sin este catch el error escapaba crudo y llegaba
        // al usuario como "error inesperado", cuando es exactamente el mismo
        // caso que un 503: el proveedor no contesto. Se trata como reintentable
        // y, si se agotan los intentos, sale clasificado como tal.
        ultimoEstado = 503
        logger.warn('llm.sin_respuesta', {
          model: this.model,
          causa: error instanceof Error ? error.name : 'desconocida',
        })

        const espera = Math.min(500 * 2 ** intento, 4_000) + Math.random() * 400
        if (Date.now() + espera >= limite) break
        await new Promise((r) => setTimeout(r, espera))
        continue
      }

      if (response.ok) return response

      ultimoEstado = response.status
      if (!REINTENTABLES.has(response.status)) return response

      // Espera exponencial con desfase aleatorio, para que varias peticiones
      // simultaneas no reintenten todas en el mismo instante y se vuelvan a
      // pisar entre si.
      const espera = Math.min(500 * 2 ** intento, 4_000) + Math.random() * 400
      if (Date.now() + espera >= limite) break
      await new Promise((r) => setTimeout(r, espera))
    }

    logger.warn('llm.reintentos_agotados', { status: ultimoEstado, model: this.model })
    throw this.clasificarError(ultimoEstado || 503)
  }

  async generateAnswer(request: AnswerRequest): Promise<AnswerOutcome> {
    const apiKey = loadGeminiApiKey()
    if (!apiKey) throw new AppError('PROVIDER_UNAVAILABLE', 'credencial de Gemini no configurada')

    const base = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { role: 'user', parts: [{ text: buildUserPrompt(request.question, request.evidence) }] },
      ],
    }

    const conSchema = {
      ...base,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2_048,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: this.thinking },
      },
    }

    // El plazo se fija UNA vez y lo comparten los dos intentos. Si la
    // degradacion abriera un presupuesto nuevo, el plazo que pide quien llama
    // dejaria de significar nada: se medio una espera de 55 s con un
    // `deadlineMs` de 35 s, y el exceso terminaba saliendo como un error
    // inesperado en vez de como "proveedor ocupado".
    const vence = Date.now() + request.deadlineMs

    let response: Response
    try {
      response = await this.llamarConReintentos(apiKey, conSchema, request.deadlineMs)
    } catch (error) {
      // Degradacion: la salida estructurada se sirve con capacidad propia y
      // puede estar saturada mientras la generacion normal responde. El prompt
      // ya exige JSON, asi que se reintenta sin el schema y se parsea el texto.
      // Lo que NO se degrada es la validacion: validateAnswer corre igual, asi
      // que una cita inventada se sigue rechazando.
      if (!(error instanceof AppError)) throw error

      // Con el plazo ya consumido no queda margen para un segundo intento, y
      // estirarlo solo convierte un fallo claro en una espera larga que termina
      // igual. Se propaga el error original, que ya es del contrato.
      const restante = vence - Date.now()
      if (restante <= 2_000) throw error

      logger.warn('llm.degrada_sin_schema', { model: this.model, restanteMs: restante })
      const sinSchema = {
        ...base,
        generationConfig: { temperature: 0.1, maxOutputTokens: 2_048 },
      }
      response = await this.llamarConReintentos(apiKey, sinSchema, restante)
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }

    const texto = payload.candidates?.[0]?.content?.parts?.[0]?.text
    if (!texto) throw new AppError('PROVIDER_UNAVAILABLE', 'el proveedor no devolvio contenido')

    const crudo = extraerJson(texto)
    if (crudo === null) {
      throw new AppError('PROVIDER_UNAVAILABLE', 'el proveedor devolvio JSON invalido')
    }

    // La validacion de citas ocurre fuera, en validateAnswer: este adaptador
    // no decide si la respuesta es aceptable.
    return {
      answer: crudo as AnswerOutcome['answer'],
      modelVersion: this.model,
      promptVersion: PROMPT_VERSION,
      usage: {
        inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}

/**
 * Extrae el objeto JSON de la respuesta. Sin responseSchema el modelo puede
 * envolverlo en un bloque de codigo o agregar una linea antes, aunque se le
 * pida que no lo haga. Devuelve null si no hay JSON utilizable.
 */
function extraerJson(texto: string): unknown {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  try {
    return JSON.parse(limpio)
  } catch {
    // Ultimo recurso: el primer objeto balanceado del texto.
    const inicio = limpio.indexOf('{')
    const fin = limpio.lastIndexOf('}')
    if (inicio === -1 || fin <= inicio) return null
    try {
      return JSON.parse(limpio.slice(inicio, fin + 1))
    } catch {
      return null
    }
  }
}

/** Embeddings de Gemini. Modelo separado del de generacion, por decision del plan. */
export class GeminiEmbeddingAdapter implements EmbeddingAdapter {
  readonly name = 'gemini_developer'
  readonly model: string
  readonly dimension: number

  constructor() {
    this.model = process.env['EMBEDDINGS_MODEL'] ?? 'gemini-embedding-001'
    this.dimension = Number(process.env['EMBEDDINGS_DIMENSION'] ?? 768)
  }

  status(): { enabled: boolean; reason: string | null } {
    try {
      const key = loadGeminiApiKey()
      return key
        ? { enabled: true, reason: null }
        : { enabled: false, reason: 'falta GEMINI_API_KEY (o GEMINI_API_KEY_FILE)' }
    } catch (error) {
      return {
        enabled: false,
        reason: error instanceof Error ? error.message : 'credencial invalida',
      }
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = loadGeminiApiKey()
    if (!apiKey) throw new AppError('PROVIDER_UNAVAILABLE', 'credencial de Gemini no configurada')

    const response = await fetch(`${BASE_URL}/models/${this.model}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
          outputDimensionality: this.dimension,
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      logError('llm.embeddings_error', new Error(`status ${response.status}`), {
        status: response.status,
        model: this.model,
      })
      throw new AppError(
        response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_UNAVAILABLE',
        `embeddings: respuesta ${response.status}`,
      )
    }

    const payload = (await response.json()) as { embeddings?: Array<{ values?: number[] }> }
    const vectores = payload.embeddings?.map((e) => e.values ?? []) ?? []

    if (vectores.length !== texts.length) {
      throw new AppError('PROVIDER_UNAVAILABLE', 'el proveedor devolvio menos vectores que textos')
    }
    for (const v of vectores) {
      if (v.length !== this.dimension) {
        // Una dimension distinta a la declarada corrompe el indice entero.
        throw new AppError('PROVIDER_UNAVAILABLE', `dimension inesperada: ${v.length}`)
      }
    }

    return vectores
  }
}
