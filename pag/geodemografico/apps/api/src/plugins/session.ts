import { rutaCookies } from '../config.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  forbidden,
  unauthenticated,
  type AuthenticatedSession,
  type CorpusScopedSession,
  type Permission,
  type ScopedSession,
  type TenantId,
  type PurposeId,
  type CorpusId,
} from '@kaizen/contracts'
import { withAuthTransaction, withAuthorizedTransaction } from '@kaizen/db'
import {
  loadSession,
  resolveCorpusId,
  resolveEffectiveScope,
  secretsEqual,
} from '@kaizen/authz'

export const SESSION_COOKIE = 'kaizen_session'
export const CSRF_COOKIE = 'kaizen_csrf'
const CSRF_HEADER = 'x-csrf-token'

declare module 'fastify' {
  interface FastifyRequest {
    session?: AuthenticatedSession | undefined
  }
}

/** Opciones de cookie. `sameSite: lax` y no `strict`: strict rompe el callback OAuth. */
export function cookieOptions(isProduction: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: rutaCookies(),
    maxAge: maxAgeSeconds,
  }
}

/** Carga la sesion si hay cookie. No falla si no la hay: hay rutas publicas. */
export async function registerSessionLoader(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request) => {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) return
    try {
      request.session = await withAuthTransaction((client) => loadSession(client, token))
    } catch {
      // Una cookie invalida se trata como ausencia de sesion, no como error.
      request.session = undefined
    }
  })
}

export function requireSession(request: FastifyRequest): AuthenticatedSession {
  if (!request.session) throw unauthenticated('sin sesion valida')
  return request.session
}

/**
 * CSRF con doble envio: cookie legible por el cliente + cabecera.
 * Un sitio de terceros puede provocar la peticion con la cookie de sesion,
 * pero no puede LEER la cookie de CSRF para reproducir la cabecera.
 */
export function requireCsrf(request: FastifyRequest): void {
  const metodo = request.method.toUpperCase()
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return

  // Sin sesion, el CSRF no protege nada: no hay credencial ambiente que un
  // sitio de terceros pueda aprovechar. Se responde UNAUTHENTICATED para que
  // la interfaz sepa mandar a iniciar sesion, en vez de un 403 que parece
  // falta de permisos y lleva a mirar donde no es.
  if (!request.session) throw unauthenticated('sin sesion valida')

  const cookie = request.cookies[CSRF_COOKIE]
  const header = request.headers[CSRF_HEADER]

  if (!cookie || typeof header !== 'string' || !secretsEqual(cookie, header)) {
    throw forbidden('token CSRF ausente o no coincide')
  }
}

export interface ScopeRequest {
  tenantId: string
  purposeId: string
}

/**
 * Resuelve el ambito (tenant, proposito, permisos, corpus) EN EL SERVIDOR.
 *
 * El cliente indica sobre que espacio quiere operar, pero no se le cree: se
 * comprueba membresia activa, proposito del mismo tenant y concesiones
 * explicitas y vigentes. Sin eso, el ambito no existe.
 */
export async function resolveScope(
  request: FastifyRequest,
  scope: ScopeRequest,
  required: readonly Permission[],
): Promise<ScopedSession> {
  const session = requireSession(request)

  const efectivo = await withAuthTransaction(
    (client) => resolveEffectiveScope(client, scope.tenantId, scope.purposeId, session.userId),
    session.userId,
  )

  // Un tenant ajeno y un tenant inexistente dan el mismo resultado: 403
  // generico. No se distingue, para no confirmar que el tenant existe.
  if (!efectivo) throw forbidden('sin membresia activa en ese espacio o finalidad')

  for (const permiso of required) {
    if (!efectivo.permissions.has(permiso)) throw forbidden(`falta el permiso ${permiso}`)
  }

  return {
    ...session,
    tenantId: scope.tenantId as TenantId,
    purposeId: scope.purposeId as PurposeId,
    authzVersion: efectivo.authzVersion,
    permissions: efectivo.permissions,
  }
}

/** Igual que resolveScope, pero ademas resuelve el corpus documental. */
export async function resolveCorpusScope(
  request: FastifyRequest,
  scope: ScopeRequest,
  required: readonly Permission[],
): Promise<CorpusScopedSession> {
  const scoped = await resolveScope(request, scope, required)

  const corpusId = await withAuthorizedTransaction(
    'app',
    { tenantId: scoped.tenantId, userId: scoped.userId, purposeId: scoped.purposeId },
    (client) => resolveCorpusId(client, scoped.tenantId, scoped.purposeId),
  )

  return { ...scoped, corpusId: corpusId as CorpusId }
}

/** Contexto de transaccion derivado de una sesion con ambito. */
export function txContext(session: ScopedSession | CorpusScopedSession) {
  return {
    tenantId: session.tenantId,
    userId: session.userId,
    purposeId: session.purposeId,
    ...('corpusId' in session ? { corpusId: session.corpusId } : {}),
  }
}

export function setCsrfCookie(reply: FastifyReply, token: string, isProduction: boolean): void {
  // httpOnly FALSE a proposito: el cliente tiene que leerla para enviarla en
  // la cabecera. Su valor no da acceso por si solo.
  reply.setCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: rutaCookies(),
    maxAge: 12 * 3600,
  })
}
