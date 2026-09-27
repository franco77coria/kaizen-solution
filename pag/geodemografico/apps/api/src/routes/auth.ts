import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, unauthenticated, validationFailed } from '@kaizen/contracts'
import { withAuthTransaction } from '@kaizen/db'
import {
  createOidcProviderAsync,
  createSession,
  generateToken,
  hashToken,
  resolveLogin,
  revokeSession,
  secretsEqual,
  type OidcProvider,
} from '@kaizen/authz'
import { logger } from '@kaizen/observability'
import { admitir } from '../plugins/admission.js'
import { registrarAuditoria } from '../services/audit.js'
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  requireCsrf,
  requireSession,
  setCsrfCookie,
} from '../plugins/session.js'
import { rutaCookies, type AppConfig } from '../config.js'

const OAUTH_STATE_COOKIE = 'kaizen_oauth'

/**
 * El callback lo construye GOOGLE, no nosotros. Ademas de `code` y `state`
 * agrega `scope`, `authuser`, `hd` y `prompt` segun el caso, y puede sumar
 * otros sin avisar.
 *
 * Por eso este schema NO es estricto: exigir exactitud sobre una carga util
 * que define un tercero rechazaria todos los logins reales. Se extrae lo que
 * se necesita y se ignora el resto; lo que importa de verdad -que la respuesta
 * corresponda a este pedido- lo garantiza la comparacion del `state`.
 */
const callbackSchema = z.object({
  code: z.string().min(1).max(2_000),
  state: z.string().min(1).max(500),
})

/**
 * Flujo de autenticacion.
 *
 * El `state` y el `nonce` NO se guardan en memoria del proceso: viajan en una
 * cookie firmada de corta vida. Guardarlos en memoria rompe en cuanto hay mas
 * de una instancia, que es justamente el despliegue previsto.
 */
export async function authRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  let provider: OidcProvider | null = null
  const getProvider = async (): Promise<OidcProvider> => {
    provider ??= await createOidcProviderAsync()
    return provider
  }

  const redirectUri =
    process.env['OIDC_REDIRECT_URI'] ?? `http://localhost:${config.port}/auth/callback`

  app.get('/auth/start', async (request, reply) => {
    await admitir('login_inicio', request.ip)

    const inicio = (await getProvider()).start(redirectUri)
    const reintento = (request.query as Record<string, unknown>)['reintento'] === '1'

    reply.setCookie(
      OAUTH_STATE_COOKIE,
      JSON.stringify({ state: inicio.state, nonce: inicio.nonce, verifier: inicio.codeVerifier }),
      {
        httpOnly: true,
        secure: config.isProduction,
        // `lax` y no `strict`: con strict el navegador no manda la cookie al
        // volver del proveedor y el flujo se rompe siempre.
        sameSite: 'lax',
        path: rutaCookies(),
        maxAge: 600,
      },
    )

    const destino = new URL(inicio.url)
    if (reintento) destino.searchParams.set('reintento', '1')
    return reply.redirect(destino.toString())
  })

  app.get('/auth/callback', async (request, reply) => {
    await admitir('login_callback', request.ip)

    const parsed = callbackSchema.safeParse(request.query)
    if (!parsed.success) throw validationFailed('parametros de callback invalidos')

    const crudo = request.cookies[OAUTH_STATE_COOKIE]

    // Sin cookie de flujo, la causa casi siempre es benigna: el enlace quedo
    // viejo, la cookie caduco (10 min) o un intento posterior la piso. Mostrar
    // un JSON de error deja al usuario en una pantalla muerta, asi que se
    // reinicia el flujo solo.
    //
    // `reintento` corta el bucle: si tras reiniciar vuelve a faltar la cookie,
    // el problema es otro (cookies bloqueadas, por ejemplo) y hay que decirlo.
    if (!crudo) {
      const yaReintento = (request.query as Record<string, unknown>)['reintento'] === '1'
      if (yaReintento) {
        throw unauthenticated(
          'no se pudo establecer la cookie del flujo de login; revisar bloqueo de cookies',
        )
      }
      logger.info('auth.flujo_expirado_reiniciando', { requestId: request.requestId })
      return reply.redirect(`${config.basePath}/auth/start?reintento=1`)
    }

    let guardado: { state: string; nonce: string; verifier: string }
    try {
      guardado = JSON.parse(crudo)
    } catch {
      throw unauthenticated('flujo de login corrupto')
    }

    // Comparacion en tiempo constante del state: es lo que ata esta respuesta
    // al pedido que la origino.
    //
    // Aca NO se reinicia solo: que exista una cookie de flujo pero con otro
    // state no es una expiracion, es una respuesta que no corresponde al
    // pedido. Reiniciar lo taparia.
    if (!secretsEqual(guardado.state, parsed.data.state)) {
      throw unauthenticated('state no coincide')
    }

    reply.clearCookie(OAUTH_STATE_COOKIE, { path: rutaCookies() })

    const identidad = await (await getProvider()).exchange({
      code: parsed.data.code,
      codeVerifier: guardado.verifier,
      nonce: guardado.nonce,
      redirectUri,
    })

    const invitacion =
      typeof (request.query as Record<string, unknown>)['invitation'] === 'string'
        ? ((request.query as Record<string, string>)['invitation'] as string)
        : undefined

    try {
      const resultado = await withAuthTransaction((client) =>
        resolveLogin(client, identidad, invitacion),
      )

      const sesion = await withAuthTransaction(
        (client) => createSession(client, resultado.userId),
        resultado.userId,
      )

      reply.setCookie(SESSION_COOKIE, sesion.token, cookieOptions(config.isProduction, 12 * 3600))
      setCsrfCookie(reply, generateToken(24), config.isProduction)

      await registrarAuditoria({
        actorUserId: resultado.userId,
        tenantId: null,
        purposeId: null,
        action: 'auth.login',
        resourceRef: null,
        result: 'allowed',
        requestId: request.requestId,
        detail: { nuevo: resultado.isNewUser, espacios: resultado.tenantIds.length },
      })

      return reply.redirect(`${config.webBase}/`)
    } catch (error) {
      // Se audita el rechazo SIN el email: la auditoria no lleva datos
      // personales, y el hash permite correlacionar intentos igual.
      await registrarAuditoria({
        actorUserId: null,
        tenantId: null,
        purposeId: null,
        action: 'auth.login_denied',
        resourceRef: hashToken(`${identidad.issuer}:${identidad.subject}`).slice(0, 16),
        result: 'denied',
        requestId: request.requestId,
        detail: { motivo: error instanceof AppError ? error.code : 'INTERNAL' },
      })
      logger.warn('auth.login_rechazado', { requestId: request.requestId })
      throw error
    }
  })

  app.post('/auth/logout', async (request, reply) => {
    requireCsrf(request)
    const token = request.cookies[SESSION_COOKIE]

    if (token) {
      // Revocacion REAL en servidor. Borrar la cookie sin revocar dejaria la
      // sesion utilizable por quien tenga una copia del token.
      await withAuthTransaction((client) => revokeSession(client, token))
      await registrarAuditoria({
        actorUserId: request.session?.userId ?? null,
        tenantId: null,
        purposeId: null,
        action: 'auth.logout',
        resourceRef: null,
        result: 'allowed',
        requestId: request.requestId,
      })
    }

    reply.clearCookie(SESSION_COOKIE, { path: rutaCookies() })
    reply.clearCookie(CSRF_COOKIE, { path: rutaCookies() })
    return { ok: true }
  })

  /** Renueva el token CSRF de una sesion ya establecida. */
  app.get('/auth/csrf', async (request, reply) => {
    requireSession(request)
    const token = generateToken(24)
    setCsrfCookie(reply, token, config.isProduction)
    return { csrfToken: token }
  })
}
