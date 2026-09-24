import { createHash } from 'node:crypto'
import type { ProviderDocument } from './provider.js'

/**
 * Ticket 08 — parser de documentos.
 *
 * Regla central: NO truncar en silencio. Si el proveedor entrego el documento
 * incompleto, o si el resultado queda vacio, el documento se marca como
 * extraccion incompleta y eso viaja hasta la interfaz. Un resumen que parece
 * completo pero perdio la mitad del contenido es peor que un error visible.
 */
export const PARSER_VERSION = 'docs-tabs-v1'

export interface ParsedDocument {
  title: string
  version: string
  contentHash: string
  charCount: number
  complete: boolean
  incompleteReason: string | null
  blocks: Array<{ tabId: string; tabTitle: string; heading: string | null; text: string }>
}

export function parseDocument(doc: ProviderDocument): ParsedDocument {
  const blocks: ParsedDocument['blocks'] = []

  for (const tab of doc.tabs) {
    for (const block of tab.blocks) {
      const texto = normalizarTexto(block.text)
      if (texto.length === 0) continue
      blocks.push({
        tabId: tab.id,
        tabTitle: tab.title,
        heading: block.heading ? normalizarTexto(block.heading) : null,
        text: texto,
      })
    }
  }

  const charCount = blocks.reduce((acc, b) => acc + b.text.length, 0)

  // El hash cubre el contenido Y la version del parser: si cambia el parser,
  // el contenido derivado se considera distinto y se vuelve a indexar.
  const contentHash = createHash('sha256')
    .update(PARSER_VERSION)
    .update('\u0000')
    .update(blocks.map((b) => `${b.tabId}|${b.heading ?? ''}|${b.text}`).join('\u0000'))
    .digest('hex')

  let complete = doc.complete
  let incompleteReason = doc.incompleteReason

  if (complete && charCount === 0) {
    complete = false
    incompleteReason = 'el documento no produjo texto extraible'
  }

  return {
    title: doc.title,
    version: doc.version,
    contentHash,
    charCount,
    complete,
    incompleteReason,
    blocks,
  }
}

function normalizarTexto(texto: string): string {
  return texto
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
