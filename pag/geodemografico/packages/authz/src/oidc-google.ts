import { createRemoteJWKSet, jwtVerify } from 'jose'
import { unauthenticated } from '@kaizen/contracts'
import { assertIdentityAcceptable, createPkcePair, type AuthStart, type OidcProvider, type VerifiedIdentity } from './oidc.js'
import { generateToken } from './crypto.js'

/**
 * Google OIDC con authorization code + PKCE.
 *
 * Verifica firma contra el JWKS publicado, y ademas issuer, audiencia,
 * expiracion y nonce. Ninguna de esas comprobaciones es opcional: omitir el
 * nonce abre reproduccion de tokens, y omitir la audiencia acepta tokens
 * emitidos para otra aplicacion.
 */
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs'

interface GoogleIdClaims {
  iss: string
  sub: string
  aud: string
  email?: string
  email_verified?: boolean
  hd?: string
  nonce?: string
}

export class GoogleOidcProvider implements OidcProvider {
  readonly name = 'google'
  private readonly jwks = createRemoteJWKSet(new URL(JWKS_URI))

  private clientId(): string {
    const id = process.env['OIDC_CLIENT_ID']
    if (!id) throw new Error('OIDC_CLIENT_ID no esta configurada')
    return id
  }

  private clientSecret(): string {
    const secret = process.env['OIDC_CLIENT_SECRET']
    if (!secret) throw new Error('OIDC_CLIENT_SECRET no esta configurada')
    return secret
  }

  start(redirectUri: string): AuthStart {
    const { verifier, challenge } = createPkcePair()
    const state = generateToken(24)
    const nonce = generateToken(24)

    const url = new URL(AUTH_ENDPOINT)
    url.searchParams.set('client_id', this.clientId())
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    // Pide seleccion de cuenta explicita en vez de reusar la sesion del navegador.
    url.searchParams.set('prompt', 'select_account')
    const hd = process.env['OIDC_ALLOWED_HD']
    if (hd) url.searchParams.set('hd', hd)

    return { url: url.toString(), state, nonce, codeVerifier: verifier }
  }

  async exchange(params: {
    code: string
    codeVerifier: string
    nonce: string
    redirectUri: string
  }): Promise<VerifiedIdentity> {
    const body = new URLSearchParams({
      code: params.code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
    })

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      // El cuerpo del error puede contener el codigo; no se registra.
      throw unauthenticated(`el proveedor rechazo el intercambio (${response.status})`)
    }

    const payload = (await response.json()) as { id_token?: string }
    if (!payload.id_token) throw unauthenticated('el proveedor no devolvio id_token')

    const { payload: claims } = await jwtVerify<GoogleIdClaims>(payload.id_token, this.jwks, {
      audience: this.clientId(),
      issuer: GOOGLE_ISSUERS,
      clockTolerance: 30,
    })

    if (!claims.nonce || claims.nonce !== params.nonce) {
      throw unauthenticated('nonce no coincide')
    }

    const identity: VerifiedIdentity = {
      issuer: 'https://accounts.google.com',
      subject: claims.sub,
      emailDisplay: claims.email ?? '',
      emailVerified: claims.email_verified === true,
      hostedDomain: claims.hd ?? null,
    }

    assertIdentityAcceptable(identity)
    return identity
  }
}
