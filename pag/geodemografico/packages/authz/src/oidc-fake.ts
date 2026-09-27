import { assertIdentityAcceptable, type AuthStart, type OidcProvider, type VerifiedIdentity } from './oidc.js'
import { generateToken } from './crypto.js'

/**
 * Proveedor de identidad LOCAL, para desarrollo y pruebas sin proyecto Google.
 *
 * Se habilita SOLO cuando APP_ENV=local. En cualquier otro entorno el
 * constructor falla: un proveedor que acepta cualquier identidad no puede
 * quedar activo por accidente en produccion.
 *
 * No reemplaza ningun control: el usuario que devuelve sigue teniendo que
 * estar invitado y tener membresia y permisos explicitos.
 */
export class FakeOidcProvider implements OidcProvider {
  readonly name = 'fake'

  constructor() {
    if (process.env['APP_ENV'] !== 'local') {
      throw new Error(
        'FakeOidcProvider solo puede usarse con APP_ENV=local. ' +
          'Configura OIDC_* y usa el proveedor real.',
      )
    }
  }

  start(redirectUri: string): AuthStart {
    const state = generateToken(24)
    const nonce = generateToken(24)
    // Pantalla local de seleccion de cuenta. No pide contrasena porque no
    // autentica nada real: solo simula el regreso del proveedor.
    // La pantalla vive bajo la ruta base del front. `new URL('/auth/local',
    // origen)` descartaria esa ruta: una barra inicial reemplaza el camino
    // entero. Por eso se arma concatenando sobre el origen.
    const origen = new URL(process.env['PUBLIC_WEB_ORIGIN'] ?? 'http://localhost:5273').origin
    const base = (process.env['BASE_PATH'] ?? '').replace(/\/+$/, '')
    const url = new URL(`${origen}${base}/auth/local`)
    url.searchParams.set('state', state)
    url.searchParams.set('redirect_uri', redirectUri)
    return { url: url.toString(), state, nonce, codeVerifier: 'local-no-pkce' }
  }

  async exchange(params: { code: string; nonce: string }): Promise<VerifiedIdentity> {
    // En local, el "code" es el subject elegido en la pantalla de seleccion.
    const subject = params.code.trim()
    if (!subject) throw new Error('falta el subject local')

    const dominio = process.env['OIDC_ALLOWED_HD'] ?? 'kaizensolutionscol.com'
    const identity: VerifiedIdentity = {
      issuer: 'https://accounts.google.com',
      subject,
      emailDisplay: `${subject.replace(/^sub-/, '')}@${dominio}`,
      emailVerified: true,
      hostedDomain: dominio,
    }

    assertIdentityAcceptable(identity)
    return identity
  }
}

export function createOidcProvider(): OidcProvider {
  const provider = process.env['OIDC_PROVIDER'] ?? (process.env['OIDC_CLIENT_ID'] ? 'google' : 'fake')
  if (provider === 'fake') return new FakeOidcProvider()
  // Import diferido para no cargar `jose` ni resolver JWKS en local.
  throw new Error('usar createOidcProviderAsync para el proveedor real')
}

export async function createOidcProviderAsync(): Promise<OidcProvider> {
  const provider =
    process.env['OIDC_PROVIDER'] ?? (process.env['OIDC_CLIENT_ID'] ? 'google' : 'fake')

  if (provider === 'fake') return new FakeOidcProvider()

  const { GoogleOidcProvider } = await import('./oidc-google.js')
  return new GoogleOidcProvider()
}
