import type { PoolClient } from 'pg'
import type { AuthenticatedSession, UserId } from '@kaizen/contracts'
import { unauthenticated } from '@kaizen/contracts'
import { generateToken, hashToken } from './crypto.js'

/**
 * Sesiones de SERVIDOR. La cookie contiene un token opaco; todo el estado
 * vive en la base. Cerrar sesion revoca de verdad, no solo borra la cookie.
 *
 * Duracion acotada por decision de seguridad: una sesion larga agranda el
 * radio de impacto de una cookie robada.
 */
const DEFAULT_TTL_HOURS = 12

export interface CreatedSession {
  token: string
  expiresAt: Date
}

export async function createSession(
  client: PoolClient,
  userId: string,
  meta: { userAgentHash?: string; ipHash?: string } = {},
): Promise<CreatedSession> {
  const token = generateToken(32)
  const ttlHours = Number(process.env['SESSION_TTL_HOURS'] ?? DEFAULT_TTL_HOURS)
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000)

  await client.query(
    `insert into sessions (user_id, token_hash, expires_at, user_agent_hash, ip_hash)
     values ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), expiresAt, meta.userAgentHash ?? null, meta.ipHash ?? null],
  )

  return { token, expiresAt }
}

/**
 * Valida la sesion en CADA operacion. No alcanza con que la cookie exista:
 * el usuario tiene que seguir activo. Una suspension corta el acceso de
 * inmediato, sin esperar a que la sesion expire.
 */
export async function loadSession(
  client: PoolClient,
  token: string,
): Promise<AuthenticatedSession> {
  const { rows } = await client.query<{
    id: string
    user_id: string
    created_at: Date
    expires_at: Date
    issuer: string
    subject: string
    email_display: string
    user_status: string
  }>(
    `select s.id, s.user_id, s.created_at, s.expires_at,
            u.issuer, u.subject, u.email_display, u.status as user_status
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()`,
    [hashToken(token)],
  )

  const row = rows[0]
  if (!row) throw unauthenticated('sesion inexistente, revocada o expirada')
  if (row.user_status !== 'active') throw unauthenticated('usuario suspendido o deshabilitado')
  const dominio = process.env['OIDC_ALLOWED_HD']
  if (dominio && !row.email_display.trim().toLowerCase().endsWith(`@${dominio}`)) {
    throw unauthenticated('dominio no permitido para la sesion')
  }

  return {
    sessionId: row.id,
    userId: row.user_id as UserId,
    issuer: row.issuer,
    subject: row.subject,
    emailDisplay: row.email_display,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export async function revokeSession(client: PoolClient, token: string): Promise<void> {
  await client.query(
    `update sessions set revoked_at = now()
      where token_hash = $1 and revoked_at is null`,
    [hashToken(token)],
  )
}

/** Revoca TODAS las sesiones de un usuario. Se usa al suspender una membresia. */
export async function revokeAllSessions(client: PoolClient, userId: string): Promise<number> {
  const { rowCount } = await client.query(
    `update sessions set revoked_at = now()
      where user_id = $1 and revoked_at is null`,
    [userId],
  )
  return rowCount ?? 0
}
