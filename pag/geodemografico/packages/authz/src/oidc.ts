import { createHash, randomBytes } from 'node:crypto'
import { unauthenticated } from '@kaizen/contracts'

/**
 * Identidad verificada por el proveedor. La clave real es (issuer, subject).
 * `emailDisplay` es texto para mostrar y NO se usa para decidir permisos.
 */
export interface VerifiedIdentity {
  issuer: string
  subject: string
  emailDisplay: string
  emailVerified: boolean
  /** Claim `hd` de Google Workspace. Ausente en cuentas personales. */
  hostedDomain: string | null
}

export interface AuthStart {
  url: string
  state: string
  nonce: string
  codeVerifier: string
}

export interface OidcProvider {
  readonly name: string
  start(redirectUri: string): AuthStart
  exchange(params: {
    code: string
    codeVerifier: string
    nonce: string
    redirectUri: string
  }): Promise<VerifiedIdentity>
}

/** PKCE S256. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

/**
 * Comprobaciones que se aplican SIEMPRE, sea cual sea el proveedor.
 * Pertenecer al dominio no concede membresia: eso se resuelve despues,
 * contra memberships. Aqui solo se valida que la identidad sea aceptable.
 */
export function assertIdentityAcceptable(identity: VerifiedIdentity): void {
  if (!identity.emailVerified) {
    throw unauthenticated('el proveedor no confirma el email como verificado')
  }

  const expected = process.env['OIDC_ALLOWED_HD']
  if (
    expected &&
    (identity.hostedDomain !== expected ||
      !identity.emailDisplay.trim().toLowerCase().endsWith(`@${expected}`))
  ) {
    throw unauthenticated('dominio no permitido')
  }

  if (!identity.issuer || !identity.subject) {
    throw unauthenticated('el token no trae identidad estable')
  }
}
