import type { Permission } from './permissions.js'
import type { CorpusId, PurposeId, TenantId, UserId } from './ids.js'

/**
 * Identidad y ambito resueltos EXCLUSIVAMENTE en el servidor.
 * Nada de esto puede venir del cliente: ni el tenant, ni el proposito,
 * ni los permisos, ni el corpus.
 */
export interface AuthenticatedSession {
  sessionId: string
  userId: UserId
  /** Identidad estable del proveedor. El email no sustituye a esto. */
  issuer: string
  subject: string
  emailDisplay: string
  createdAt: Date
  expiresAt: Date
}

export interface ScopedSession extends AuthenticatedSession {
  tenantId: TenantId
  purposeId: PurposeId
  /** Version de autorizacion. Cambia al revocar; invalida trabajo en curso. */
  authzVersion: number
  permissions: ReadonlySet<Permission>
}

export interface CorpusScopedSession extends ScopedSession {
  corpusId: CorpusId
}

export function hasPermission(session: ScopedSession, permission: Permission): boolean {
  return session.permissions.has(permission)
}
