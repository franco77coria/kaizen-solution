/**
 * Contrato del proveedor de documentos. La aplicacion habla con esta interfaz;
 * Google Drive es UNA implementacion, no la unica.
 *
 * El conector es de SOLO LECTURA. No hay ningun metodo para escribir, mover,
 * renombrar ni borrar en el proveedor, para que sea imposible por construccion.
 */
export interface ProviderFile {
  /** ID del archivo tal como lo ve el proveedor. */
  id: string
  name: string
  mimeType: string
  createdTime: string | null
  modifiedTime: string | null
  /** Version declarada por el proveedor. Cambia con cada edicion. */
  version: string
  /** Carpetas contenedoras. Metadata opcional: NO define pertenencia. */
  parents: string[]
  /** Si es un acceso directo, el ID del archivo destino. */
  shortcutTargetId: string | null
  /** Indicios de origen Meet, cuando el proveedor los expone. */
  meetingKey: string | null
  /** El archivo esta en la papelera. */
  trashed: boolean
  /** El usuario autenticado conserva permiso de lectura. */
  canRead: boolean
}

export interface ProviderChange {
  fileId: string
  removed: boolean
  file: ProviderFile | null
}

export interface ChangePage {
  changes: ProviderChange[]
  nextCursor: string | null
  /** Cursor para reanudar mas adelante cuando no hay mas paginas. */
  newStartCursor: string | null
}

/** Documento estructurado, antes de segmentar. */
export interface ProviderDocument {
  fileId: string
  version: string
  title: string
  /** Pestanas del documento. Un documento simple tiene una sola. */
  tabs: Array<{
    id: string
    title: string
    blocks: Array<{ heading: string | null; text: string }>
  }>
  /** true si el proveedor entrego el documento completo. */
  complete: boolean
  incompleteReason: string | null
}

export interface SourceProvider {
  readonly name: string
  status(): { enabled: boolean; reason: string | null }
  /** Inventario paginado de metadata. No descarga cuerpos. */
  listFiles(options: { pageToken?: string; pageSize: number }): Promise<{
    files: ProviderFile[]
    nextPageToken: string | null
  }>
  getFile(fileId: string): Promise<ProviderFile | null>
  /** Cambios desde un cursor. Puede repetir eventos: el consumidor es idempotente. */
  listChanges(cursor: string): Promise<ChangePage>
  getStartCursor(): Promise<string>
  /** Extrae el contenido estructurado de un documento admitido. */
  exportDocument(fileId: string): Promise<ProviderDocument>
}
