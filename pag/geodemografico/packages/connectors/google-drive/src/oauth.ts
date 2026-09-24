import { createHash, randomBytes } from 'node:crypto'

/**
 * OAuth de Drive. Dos identidades SEPARADAS con el mismo mecanismo:
 *
 *   - lector: sirve para comprobar que quien pregunta sigue teniendo acceso a
 *     la fuente en el proveedor.
 *   - ingestor: la identidad cuya autorizacion usa el worker para leer los
 *     archivos de la coleccion compartida.
 *
 * Son clientes OAuth distintos a proposito. Si fueran el mismo, un token de
 * ingesta serviria para responderle a cualquiera, y la comprobacion de
 * "este usuario todavia puede ver esta nota" dejaria de existir.
 */
export type RolConexion = 'reader' | 'ingestor'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

/**
 * Scopes solicitados. Son DOS y cubren cosas distintas:
 *
 *   - DESCUBRIMIENTO: `drive.meet.readonly` lista los artefactos creados por
 *     Meet. Es el filtro mas acotado que existe para esto: Google solo
 *     devuelve archivos de reunion, asi que el resto del Drive ni se ve.
 *
 *   - CONTENIDO: `documents.readonly` permite LEER esos documentos.
 *
 * Por que hacen falta los dos, comprobado contra el proveedor el 2026-09-21:
 * con solo `drive.meet.readonly`, el listado devuelve 200 y la metadata se lee
 * bien, pero `documents.get` responde 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT y
 * `files.export` responde 403 "el usuario no ha concedido acceso de lectura al
 * archivo". Es decir: ese scope es de METADATA, no de contenido.
 *
 * Se eligio `documents.readonly` y no `drive.readonly` porque el corpus son
 * documentos de Google: el primero da acceso a los Docs, el segundo a TODOS
 * los archivos del Drive, incluidos planillas, PDF y cualquier cosa ajena al
 * proyecto. La diferencia de alcance es enorme y no aporta nada aca.
 */
export const SCOPE_DESCUBRIMIENTO = 'https://www.googleapis.com/auth/drive.meet.readonly'
export const SCOPE_CONTENIDO = 'https://www.googleapis.com/auth/documents.readonly'

export const SCOPES_REQUERIDOS = [SCOPE_DESCUBRIMIENTO, SCOPE_CONTENIDO] as const

/** Compatibilidad: varios modulos siguen refiriendose al scope principal. */
export const SCOPE_POR_DEFECTO = SCOPE_DESCUBRIMIENTO

export interface ConfigOAuth {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function cargarConfig(rol: RolConexion): ConfigOAuth {
  const prefijo = rol === 'reader' ? 'GOOGLE_READER' : 'GOOGLE_INGESTOR'

  const clientId = process.env[`${prefijo}_CLIENT_ID`]
  const clientSecret = process.env[`${prefijo}_CLIENT_SECRET`]
  const redirectUri = process.env[`${prefijo}_REDIRECT_URI`]

  if (!clientId || !clientSecret || !redirectUri) {
    // Falla cerrada y con el nombre exacto de lo que falta, para que el error
    // sea accionable sin tener que leer el codigo.
    throw new Error(
      `faltan variables de OAuth para el rol ${rol}: ` +
        `${prefijo}_CLIENT_ID, ${prefijo}_CLIENT_SECRET, ${prefijo}_REDIRECT_URI`,
    )
  }

  return { clientId, clientSecret, redirectUri }
}

export function estaConfigurado(rol: RolConexion): boolean {
  try {
    cargarConfig(rol)
    return true
  } catch {
    return false
  }
}

export interface InicioVinculacion {
  url: string
  state: string
  codeVerifier: string
}

export function iniciarVinculacion(
  rol: RolConexion,
  scopes: readonly string[] = SCOPES_REQUERIDOS,
): InicioVinculacion {
  const config = cargarConfig(rol)
  const codeVerifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const state = randomBytes(24).toString('base64url')

  const url = new URL(AUTH_ENDPOINT)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', ['openid', 'email', ...scopes].join(' '))
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  // `offline` mas `consent` es lo unico que garantiza un refresh_token. Sin el,
  // la conexion se rompe en una hora y hay que volver a pedir consentimiento.
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')

  const hd = process.env['OIDC_ALLOWED_HD']
  if (hd) url.searchParams.set('hd', hd)

  return { url: url.toString(), state, codeVerifier }
}

export interface TokensVinculacion {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  /** Scopes REALMENTE concedidos, que pueden ser menos de los pedidos. */
  grantedScopes: string[]
  /** Identidad estable de Google. El email es solo texto para mostrar. */
  providerSubject: string
  emailDisplay: string
}

export async function canjearCodigo(
  rol: RolConexion,
  code: string,
  codeVerifier: string,
): Promise<TokensVinculacion> {
  const config = cargarConfig(rol)

  const respuesta = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!respuesta.ok) {
    // El cuerpo puede repetir el codigo de autorizacion: no se registra.
    throw new Error(`el proveedor rechazo el canje (${respuesta.status})`)
  }

  const payload = (await respuesta.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  if (!payload.access_token) throw new Error('el proveedor no devolvio access_token')

  const identidad = await leerIdentidad(payload.access_token)

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
    grantedScopes: (payload.scope ?? '').split(' ').filter(Boolean),
    providerSubject: identidad.sub,
    emailDisplay: identidad.email,
  }
}

async function leerIdentidad(accessToken: string): Promise<{ sub: string; email: string }> {
  const respuesta = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  })

  if (!respuesta.ok) throw new Error(`no se pudo leer la identidad (${respuesta.status})`)

  const payload = (await respuesta.json()) as { sub?: string; email?: string }
  if (!payload.sub) throw new Error('el proveedor no devolvio una identidad estable')

  return { sub: payload.sub, email: payload.email ?? '' }
}

export async function renovarAccessToken(
  rol: RolConexion,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const config = cargarConfig(rol)

  const respuesta = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!respuesta.ok) {
    // Un 400 con invalid_grant significa que el usuario revoco el acceso o que
    // el refresh token caduco. Quien llama lo traduce a "hay que reconectar".
    throw new Error(`no se pudo renovar el token (${respuesta.status})`)
  }

  const payload = (await respuesta.json()) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) throw new Error('la renovacion no devolvio access_token')

  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000),
  }
}

/**
 * Revoca el token en GOOGLE, no solo en nuestra base. Borrar la fila sin
 * revocar dejaria una autorizacion viva en la cuenta del usuario.
 */
export async function revocarEnProveedor(token: string): Promise<boolean> {
  try {
    const respuesta = await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(10_000),
    })
    return respuesta.ok
  } catch {
    // Que la revocacion remota falle no puede impedir la desconexion local.
    return false
  }
}

/**
 * Comprueba DESCUBRIMIENTO y CONTENIDO por separado.
 *
 * Distinguirlos importa: con solo el de descubrimiento la conexion parece
 * sana -lista archivos, guarda metadata- y falla recien al leer, archivo por
 * archivo, con un 403 que no explica que falto un permiso.
 */
export interface EstadoScopes {
  puedeDescubrir: boolean
  puedeLeerContenido: boolean
  suficientes: boolean
  faltantes: string[]
}

export function evaluarScopes(concedidos: readonly string[]): EstadoScopes {
  const tiene = (s: string) => concedidos.includes(s)

  // Los scopes amplios de Drive incluyen ambas capacidades.
  const drivePleno =
    tiene('https://www.googleapis.com/auth/drive.readonly') ||
    tiene('https://www.googleapis.com/auth/drive')

  const puedeDescubrir = drivePleno || tiene(SCOPE_DESCUBRIMIENTO)
  const puedeLeerContenido = drivePleno || tiene(SCOPE_CONTENIDO)

  const faltantes: string[] = []
  if (!puedeDescubrir) faltantes.push(SCOPE_DESCUBRIMIENTO)
  if (!puedeLeerContenido) faltantes.push(SCOPE_CONTENIDO)

  return {
    puedeDescubrir,
    puedeLeerContenido,
    suficientes: puedeDescubrir && puedeLeerContenido,
    faltantes,
  }
}

export function scopesSuficientes(concedidos: readonly string[]): boolean {
  return evaluarScopes(concedidos).suficientes
}
