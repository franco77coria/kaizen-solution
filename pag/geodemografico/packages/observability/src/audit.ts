/**
 * Eventos de auditoria. Contienen QUIEN hizo QUE sobre QUE recurso y con
 * que RESULTADO. Nunca contienen el contenido del recurso.
 */
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.login_denied',
  'auth.logout',
  'auth.session_rejected',
  'membership.suspended',
  'leader.registered',
  'leader.revoked',
  'source.connect',
  'source.disconnect',
  'source.sync',
  'source.revoked',
  'document.published',
  'document.withdrawn',
  'chat.message',
  'chat.abstained',
  'chat.blocked',
  'analytics.run',
  'analytics.denied',
  'analysis.saved',
  'analysis.shared',
  'analysis.grant_revoked',
  'analysis.deleted',
  'record.captured',
  'record.submitted',
  'record.reviewed',
  'record.lookup',
  'privacy.request',
  'privacy.withdrawal',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditEvent {
  actorUserId: string | null
  tenantId: string | null
  purposeId: string | null
  action: AuditAction
  /** Identificador opaco del recurso. Nunca su contenido ni su titulo. */
  resourceRef: string | null
  result: 'allowed' | 'denied' | 'error'
  requestId: string
  /** Metadata acotada: conteos, codigos, versiones. Nunca texto de usuario. */
  detail?: Record<string, string | number | boolean | null>
}
