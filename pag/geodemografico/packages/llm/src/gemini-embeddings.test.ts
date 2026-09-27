import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { GeminiEmbeddingAdapter } from './gemini.js'

/**
 * `batchEmbedContents` acepta hasta 100 textos por pedido. Sin partir en
 * tandas, un documento largo se rechazaba entero y quedaba sin vectores
 * (en produccion: 90 de 928 fragmentos vectorizados).
 */
beforeAll(() => {
  process.env['GEMINI_API_KEY'] = 'clave-de-prueba-suficientemente-larga'
  process.env['EMBEDDINGS_DIMENSION'] = '4'
})

afterEach(() => vi.unstubAllGlobals())

function respuestaOk(cuantos: number): Response {
  return new Response(
    JSON.stringify({ embeddings: Array.from({ length: cuantos }, () => ({ values: [1, 2, 3, 4] })) }),
    { status: 200 },
  )
}

describe('embeddings de Gemini', () => {
  it('parte en tandas de a lo sumo 100 y devuelve un vector por texto, en orden', async () => {
    const tamanos: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const n = (JSON.parse(String(init.body)) as { requests: unknown[] }).requests.length
        tamanos.push(n)
        return respuestaOk(n)
      }),
    )

    const vectores = await new GeminiEmbeddingAdapter().embed(
      Array.from({ length: 250 }, (_, i) => `fragmento ${i}`),
    )

    expect(tamanos).toEqual([100, 100, 50])
    expect(vectores).toHaveLength(250)
  })

  it('reintenta un 429 y sigue', async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockImplementation(async () => respuestaOk(3))
    vi.stubGlobal('fetch', fetchSimulado)

    const vectores = await new GeminiEmbeddingAdapter({ esperasMs: [0, 0, 0] }).embed(['a', 'b', 'c'])

    expect(fetchSimulado).toHaveBeenCalledTimes(2)
    expect(vectores).toHaveLength(3)
  })

  it('un 400 no se reintenta', async () => {
    const fetchSimulado = vi.fn(async () => new Response('{}', { status: 400 }))
    vi.stubGlobal('fetch', fetchSimulado)

    await expect(new GeminiEmbeddingAdapter({ esperasMs: [0, 0, 0] }).embed(['a'])).rejects.toThrow()
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('agotados los reintentos, falla (y el documento se publica sin vectores)', async () => {
    const fetchSimulado = vi.fn(async () => new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchSimulado)

    await expect(new GeminiEmbeddingAdapter({ esperasMs: [0, 0] }).embed(['a'])).rejects.toThrow()
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })
})
