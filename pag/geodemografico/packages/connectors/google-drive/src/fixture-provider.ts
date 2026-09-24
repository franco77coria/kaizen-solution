import { readFile } from 'node:fs/promises'
import type { ChangePage, ProviderDocument, ProviderFile, SourceProvider } from './provider.js'

/**
 * Proveedor de FIXTURES. Reproduce el comportamiento de Drive leyendo un
 * archivo JSON local, incluyendo los casos incomodos que hay que soportar:
 * accesos directos, documentos multipestana, titulos repetidos, archivos en
 * la papelera, perdida de acceso y cambios de carpeta.
 *
 * Permite construir y probar TODO el pipeline sin proyecto Google, sin OAuth
 * y sin red. No es un mock de conveniencia: implementa la misma interfaz y
 * las mismas reglas de paginacion y cursor.
 */
export interface FixtureData {
  files: ProviderFile[]
  documents: Record<string, ProviderDocument>
  /** Cambios simulados, agrupados por cursor de origen. */
  changes?: Array<{ fromCursor: string; toCursor: string; fileIds: string[]; removed?: string[] }>
}

export class FixtureSourceProvider implements SourceProvider {
  readonly name = 'fixture'
  private data: FixtureData

  constructor(data: FixtureData) {
    this.data = data
  }

  static async fromFile(path: string): Promise<FixtureSourceProvider> {
    const raw = await readFile(path, 'utf8')
    return new FixtureSourceProvider(JSON.parse(raw) as FixtureData)
  }

  status(): { enabled: boolean; reason: string | null } {
    return { enabled: true, reason: null }
  }

  async listFiles(options: { pageToken?: string; pageSize: number }): Promise<{
    files: ProviderFile[]
    nextPageToken: string | null
  }> {
    const offset = options.pageToken ? Number(options.pageToken) : 0
    const slice = this.data.files.slice(offset, offset + options.pageSize)
    const next = offset + options.pageSize
    return {
      files: slice,
      nextPageToken: next < this.data.files.length ? String(next) : null,
    }
  }

  async getFile(fileId: string): Promise<ProviderFile | null> {
    return this.data.files.find((f) => f.id === fileId) ?? null
  }

  async getStartCursor(): Promise<string> {
    return 'cursor-0'
  }

  async listChanges(cursor: string): Promise<ChangePage> {
    const lote = this.data.changes?.find((c) => c.fromCursor === cursor)
    if (!lote) {
      return { changes: [], nextCursor: null, newStartCursor: cursor }
    }

    const changes = [
      ...lote.fileIds.map((id) => ({
        fileId: id,
        removed: false,
        file: this.data.files.find((f) => f.id === id) ?? null,
      })),
      ...(lote.removed ?? []).map((id) => ({ fileId: id, removed: true, file: null })),
    ]

    return { changes, nextCursor: null, newStartCursor: lote.toCursor }
  }

  async exportDocument(fileId: string): Promise<ProviderDocument> {
    const doc = this.data.documents[fileId]
    if (!doc) throw new Error(`fixture sin documento para ${fileId}`)
    return doc
  }

  /** Solo para pruebas: reemplaza el estado del proveedor. */
  setData(data: FixtureData): void {
    this.data = data
  }
}
