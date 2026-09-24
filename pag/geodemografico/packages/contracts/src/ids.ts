/**
 * Identificadores internos. Son UUID no predecibles, pero eso NO es una defensa
 * de autorización: todo acceso se comprueba igual. El branding sirve para que el
 * compilador impida pasar un TenantId donde se espera un CorpusId.
 */
declare const brand: unique symbol

type Brand<T, B extends string> = T & { readonly [brand]: B }

export type TenantId = Brand<string, 'TenantId'>
export type UserId = Brand<string, 'UserId'>
export type PurposeId = Brand<string, 'PurposeId'>
export type CorpusId = Brand<string, 'CorpusId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type DocumentVersionId = Brand<string, 'DocumentVersionId'>
export type ChunkId = Brand<string, 'ChunkId'>
export type MeetingId = Brand<string, 'MeetingId'>
export type ConversationId = Brand<string, 'ConversationId'>
export type MessageId = Brand<string, 'MessageId'>
export type SourceConnectionId = Brand<string, 'SourceConnectionId'>
export type ReaderConnectionId = Brand<string, 'ReaderConnectionId'>
export type AnalysisId = Brand<string, 'AnalysisId'>
export type AnalyticsRunId = Brand<string, 'AnalyticsRunId'>
export type VisualizationId = Brand<string, 'VisualizationId'>
export type RecordId = Brand<string, 'RecordId'>
export type RequestId = Brand<string, 'RequestId'>
export type GrantId = Brand<string, 'GrantId'>

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Convierte una cadena validada en un identificador tipado. Lanza si no es UUID. */
export function asId<T extends string>(value: string): T {
  if (!isUuid(value)) throw new Error('identificador con formato invalido')
  return value as T
}
