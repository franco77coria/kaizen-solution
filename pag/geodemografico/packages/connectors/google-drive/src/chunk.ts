import type { ParsedDocument } from './parser.js'

/**
 * Ticket 10 — segmentacion.
 *
 * Se segmenta respetando la estructura: nunca se parte a la mitad de una
 * frase, y un fragmento no cruza de pestana. Los offsets se conservan para
 * poder abrir la fuente en el lugar exacto que respalda una cita.
 */
export const CHUNK_PIPELINE_VERSION = 'chunk-estructural-v1'

const OBJETIVO_CARACTERES = 1_200
const MAXIMO_CARACTERES = 1_800
const SOLAPE_CARACTERES = 150

export interface Chunk {
  ordinal: number
  content: string
  tabId: string
  heading: string | null
  charStart: number
  charEnd: number
  tokenEstimate: number
}

export function chunkDocument(parsed: ParsedDocument): Chunk[] {
  const chunks: Chunk[] = []
  let ordinal = 0
  let offsetGlobal = 0

  for (const block of parsed.blocks) {
    const piezas = partirTexto(block.text)

    for (const pieza of piezas) {
      chunks.push({
        ordinal: ordinal++,
        content: block.heading ? `${block.heading}\n${pieza.texto}` : pieza.texto,
        tabId: block.tabId,
        heading: block.heading,
        charStart: offsetGlobal + pieza.inicio,
        charEnd: offsetGlobal + pieza.fin,
        // Estimacion, no medicion: 4 caracteres por token es la regla de bolsillo
        // habitual para espanol. Solo se usa para acotar el contexto.
        tokenEstimate: Math.ceil(pieza.texto.length / 4),
      })
    }

    offsetGlobal += block.text.length
  }

  return chunks
}

interface Pieza {
  texto: string
  inicio: number
  fin: number
}

function partirTexto(texto: string): Pieza[] {
  if (texto.length <= MAXIMO_CARACTERES) {
    return [{ texto, inicio: 0, fin: texto.length }]
  }

  const frases = dividirEnFrases(texto)
  const piezas: Pieza[] = []

  let actual = ''
  let inicio = 0
  let cursor = 0

  for (const frase of frases) {
    // Una sola frase mas larga que el maximo se corta por longitud: es el
    // unico caso donde se parte sin respetar la estructura, y se hace
    // explicitamente en vez de descartar el texto.
    if (frase.length > MAXIMO_CARACTERES) {
      if (actual.length > 0) {
        piezas.push({ texto: actual.trim(), inicio, fin: cursor })
        actual = ''
      }
      for (let i = 0; i < frase.length; i += MAXIMO_CARACTERES) {
        const trozo = frase.slice(i, i + MAXIMO_CARACTERES)
        piezas.push({ texto: trozo, inicio: cursor + i, fin: cursor + i + trozo.length })
      }
      cursor += frase.length
      inicio = cursor
      continue
    }

    if (actual.length + frase.length > OBJETIVO_CARACTERES && actual.length > 0) {
      piezas.push({ texto: actual.trim(), inicio, fin: cursor })
      // Solape: arrastra el final del fragmento anterior para que una idea
      // partida en el limite siga siendo recuperable.
      const solape = actual.slice(-SOLAPE_CARACTERES)
      actual = solape
      inicio = Math.max(0, cursor - solape.length)
    }

    actual += frase
    cursor += frase.length
  }

  if (actual.trim().length > 0) {
    piezas.push({ texto: actual.trim(), inicio, fin: cursor })
  }

  return piezas
}

function dividirEnFrases(texto: string): string[] {
  // Mantiene el separador para que los offsets sigan siendo correctos.
  const partes = texto.split(/(?<=[.!?:\n])\s+/)
  return partes.map((p, i) => (i < partes.length - 1 ? `${p} ` : p)).filter((p) => p.length > 0)
}
