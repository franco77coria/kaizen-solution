import type { ChangePage, ProviderDocument, ProviderFile, SourceProvider } from './provider.js'

/**
 * Proveedor real de Google Drive + Docs.
 *
 * Estado: IMPLEMENTADO Y SIN VERIFICAR CONTRA EL PROVEEDOR. No existe todavia
 * un proyecto Google Cloud con OAuth configurado, asi que ninguna de estas
 * llamadas se ejecuto. Los campos y rutas siguen la documentacion publica;
 * hay que comprobarlos contra la API real antes del piloto (subtarea P1).
 *
 * SOLO LECTURA: no hay ningun metodo de escritura y los scopes son de lectura.
 * Elegir una carpeta con el Picker NO autoriza sus descendientes futuros: la
 * pertenencia se registra por ID de archivo.
 */
const DRIVE = 'https://www.googleapis.com/drive/v3'
const DOCS = 'https://docs.googleapis.com/v1'

const CAMPOS =
  'id,name,mimeType,createdTime,modifiedTime,version,parents,trashed,capabilities(canDownload),shortcutDetails(targetId)'

interface DriveFileRaw {
  id: string
  name: string
  mimeType: string
  createdTime?: string
  modifiedTime?: string
  version?: string
  parents?: string[]
  trashed?: boolean
  capabilities?: { canDownload?: boolean }
  shortcutDetails?: { targetId?: string }
}

/**
 * El proveedor nego el acceso al CONTENIDO.
 *
 * Se distingue de un fallo cualquiera porque la reaccion correcta es distinta:
 * no hay que reintentar -reintentar no crea permisos- sino pedir que se vuelva
 * a autorizar con los scopes que faltan.
 */
export class AccesoDenegadoError extends Error {
  readonly fileId: string

  constructor(fileId: string) {
    super('el proveedor nego el acceso al contenido del archivo')
    this.name = 'AccesoDenegadoError'
    this.fileId = fileId
  }
}

export interface AccessTokenSource {
  /** Devuelve un access token vigente, renovandolo si hace falta. */
  getAccessToken(): Promise<string>
}

export class GoogleDriveProvider implements SourceProvider {
  readonly name = 'google_drive'

  constructor(private readonly tokens: AccessTokenSource) {}

  status(): { enabled: boolean; reason: string | null } {
    return process.env['GOOGLE_INGESTOR_CLIENT_ID']
      ? { enabled: true, reason: null }
      : { enabled: false, reason: 'falta GOOGLE_INGESTOR_CLIENT_ID' }
  }

  private async call<T>(url: string): Promise<T> {
    const token = await this.tokens.getAccessToken()
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      // El cuerpo puede incluir nombres de archivo: no se registra.
      throw new Error(`drive respondio ${response.status}`)
    }
    return (await response.json()) as T
  }

  async listFiles(options: { pageToken?: string; pageSize: number }): Promise<{
    files: ProviderFile[]
    nextPageToken: string | null
  }> {
    const url = new URL(`${DRIVE}/files`)
    url.searchParams.set('fields', `nextPageToken,files(${CAMPOS})`)
    url.searchParams.set('pageSize', String(options.pageSize))
    url.searchParams.set('q', 'trashed = false')
    url.searchParams.set('supportsAllDrives', 'true')
    url.searchParams.set('includeItemsFromAllDrives', 'true')
    if (options.pageToken) url.searchParams.set('pageToken', options.pageToken)

    const payload = await this.call<{ files?: DriveFileRaw[]; nextPageToken?: string }>(
      url.toString(),
    )

    return {
      files: (payload.files ?? []).map((f) => mapFile(f)),
      nextPageToken: payload.nextPageToken ?? null,
    }
  }

  async getFile(fileId: string): Promise<ProviderFile | null> {
    const url = new URL(`${DRIVE}/files/${encodeURIComponent(fileId)}`)
    url.searchParams.set('fields', CAMPOS)
    url.searchParams.set('supportsAllDrives', 'true')
    try {
      return mapFile(await this.call<DriveFileRaw>(url.toString()))
    } catch {
      // Perder el acceso y que el archivo no exista son indistinguibles desde
      // aqui, y deben tratarse igual: el documento se retira.
      return null
    }
  }

  async getStartCursor(): Promise<string> {
    const payload = await this.call<{ startPageToken: string }>(
      `${DRIVE}/changes/startPageToken?supportsAllDrives=true`,
    )
    return payload.startPageToken
  }

  async listChanges(cursor: string): Promise<ChangePage> {
    const url = new URL(`${DRIVE}/changes`)
    url.searchParams.set('pageToken', cursor)
    url.searchParams.set(
      'fields',
      `nextPageToken,newStartPageToken,changes(fileId,removed,file(${CAMPOS}))`,
    )
    url.searchParams.set('supportsAllDrives', 'true')
    url.searchParams.set('includeItemsFromAllDrives', 'true')

    const payload = await this.call<{
      changes?: Array<{ fileId: string; removed?: boolean; file?: DriveFileRaw }>
      nextPageToken?: string
      newStartPageToken?: string
    }>(url.toString())

    return {
      changes: (payload.changes ?? []).map((c) => ({
        fileId: c.fileId,
        removed: c.removed === true,
        file: c.file ? mapFile(c.file) : null,
      })),
      nextCursor: payload.nextPageToken ?? null,
      newStartCursor: payload.newStartPageToken ?? null,
    }
  }

  async exportDocument(fileId: string): Promise<ProviderDocument> {
    // Docs API preserva estructura y pestanas; exportar a texto plano las
    // pierde, y con ellas la posibilidad de citar una seccion concreta.
    const url = new URL(`${DOCS}/documents/${encodeURIComponent(fileId)}`)
    url.searchParams.set('includeTabsContent', 'true')

    try {
      const doc = await this.call<GoogleDoc>(url.toString())
      return mapDocument(fileId, doc)
    } catch (error) {
      // Un 403 aca casi siempre significa que el token tiene el scope de
      // DESCUBRIMIENTO pero no el de CONTENIDO. Reintentar no sirve.
      if (error instanceof Error && /respondio 403/.test(error.message)) {
        throw new AccesoDenegadoError(fileId)
      }
      throw error
    }
  }
}

function mapFile(raw: DriveFileRaw): ProviderFile {
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    createdTime: raw.createdTime ?? null,
    modifiedTime: raw.modifiedTime ?? null,
    version: raw.version ?? '0',
    parents: raw.parents ?? [],
    shortcutTargetId: raw.shortcutDetails?.targetId ?? null,
    // Drive no expone una clave de reunion estable en `files`. Queda en null
    // hasta comprobar con reuniones piloto que campo la lleva de verdad.
    meetingKey: null,
    trashed: raw.trashed === true,
    canRead: raw.capabilities?.canDownload !== false,
  }
}

interface GoogleDoc {
  title?: string
  revisionId?: string
  tabs?: Array<{
    tabProperties?: { tabId?: string; title?: string }
    documentTab?: { body?: { content?: StructuralElement[] } }
  }>
  body?: { content?: StructuralElement[] }
}

interface StructuralElement {
  paragraph?: {
    elements?: Array<{ textRun?: { content?: string } }>
    paragraphStyle?: { namedStyleType?: string }
  }
  table?: { tableRows?: Array<{ tableCells?: Array<{ content?: StructuralElement[] }> }> }
}

function mapDocument(fileId: string, doc: GoogleDoc): ProviderDocument {
  const tabs: ProviderDocument['tabs'] = []

  if (doc.tabs?.length) {
    for (const tab of doc.tabs) {
      tabs.push({
        id: tab.tabProperties?.tabId ?? 'tab-0',
        title: tab.tabProperties?.title ?? '',
        blocks: extraerBloques(tab.documentTab?.body?.content ?? []),
      })
    }
  } else {
    tabs.push({ id: 'tab-0', title: '', blocks: extraerBloques(doc.body?.content ?? []) })
  }

  return {
    fileId,
    version: doc.revisionId ?? '0',
    title: doc.title ?? '',
    tabs,
    complete: true,
    incompleteReason: null,
  }
}

function extraerBloques(
  content: StructuralElement[],
): Array<{ heading: string | null; text: string }> {
  const bloques: Array<{ heading: string | null; text: string }> = []
  let headingActual: string | null = null

  for (const el of content) {
    if (el.paragraph) {
      const texto = (el.paragraph.elements ?? [])
        .map((e) => e.textRun?.content ?? '')
        .join('')
        .trim()
      if (!texto) continue

      const estilo = el.paragraph.paragraphStyle?.namedStyleType ?? ''
      if (estilo.startsWith('HEADING')) {
        headingActual = texto
        continue
      }
      bloques.push({ heading: headingActual, text: texto })
      continue
    }

    if (el.table) {
      // Las tablas se linealizan preservando filas: descartarlas perderia
      // justamente los acuerdos y responsables, que suelen ir en tabla.
      const filas = (el.table.tableRows ?? []).map((fila) =>
        (fila.tableCells ?? [])
          .map((celda) =>
            extraerBloques(celda.content ?? [])
              .map((b) => b.text)
              .join(' '),
          )
          .join(' | '),
      )
      const texto = filas.filter((f) => f.trim().length > 0).join('\n')
      if (texto) bloques.push({ heading: headingActual, text: texto })
    }
  }

  return bloques
}
