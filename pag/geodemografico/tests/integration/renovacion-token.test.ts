import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { seal } from '@kaizen/authz'
import { F } from '@kaizen/fixtures'
import { ConexionIngestor } from '../../apps/worker/src/tokens.js'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * El access token de Google dura una hora. En produccion, exactamente una
 * hora despues de conectar Drive, la conexion quedo "para reconectar": el
 * worker renovaba el token bien, pero no tenia permiso para GUARDARLO
 * (token_vault era de solo lectura para kaizen_worker), y el catch marcaba la
 * conexion como si Google hubiera rechazado la autorizacion.
 *
 * Estas pruebas corren con la identidad real del worker: con el permiso de
 * antes, la primera falla con "permission denied".
 */
let env: TestEnv

beforeAll(async () => {
  env = await setupTestEnv()
  process.env['TOKEN_VAULT_KEY'] = Buffer.alloc(32, 9).toString('base64')
  process.env['GOOGLE_INGESTOR_CLIENT_ID'] = 'ingestor.apps.googleusercontent.com'
  process.env['GOOGLE_INGESTOR_CLIENT_SECRET'] = 'secreto-ingestor'
  process.env['GOOGLE_INGESTOR_REDIRECT_URI'] = 'http://localhost/v1/source-connections/callback'
}, 120_000)

afterAll(async () => {
  await env?.close()
})

afterEach(() => vi.unstubAllGlobals())

/** Deja la conexion con un token VENCIDO y un refresh token valido. */
beforeEach(async () => {
  const sellado = seal(
    JSON.stringify({
      accessToken: 'token-vencido',
      refreshToken: 'refresh-token-valido',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }),
  )
  const { rows } = await env.owner.query<{ id: string }>(
    `insert into token_vault (tenant_id, ciphertext, iv, auth_tag, key_version)
     values ($1, $2, $3, $4, $5) returning id`,
    [F.tenantA, sellado.ciphertext, sellado.iv, sellado.authTag, sellado.keyVersion],
  )
  await env.owner.query(
    `update source_connections set token_ref = $2, status = 'active' where id = $1`,
    [F.connA, rows[0]?.id],
  )
})

const estadoConexion = async () =>
  (await env.owner.query<{ status: string }>(`select status from source_connections where id = $1`, [F.connA]))
    .rows[0]?.status

const conexion = () => new ConexionIngestor(F.tenantA, F.corpusA, F.connA)

function googleResponde(status: number, cuerpo: object): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(cuerpo), { status })))
}

describe('renovacion del token de Drive por el worker', () => {
  it('renueva, GUARDA el token nuevo y la conexion sigue activa', async () => {
    googleResponde(200, { access_token: 'token-nuevo', expires_in: 3600 })

    expect(await conexion().getAccessToken()).toBe('token-nuevo')
    expect(await estadoConexion()).toBe('active')

    // Una instancia nueva (otra invocacion) lee el token guardado, sin volver
    // a pedirlo a Google.
    googleResponde(500, {})
    expect(await conexion().getAccessToken()).toBe('token-nuevo')
  })

  it('si Google RECHAZA la autorizacion (invalid_grant), pide reconectar', async () => {
    googleResponde(400, { error: 'invalid_grant' })

    await expect(conexion().getAccessToken()).rejects.toThrow()
    expect(await estadoConexion()).toBe('needs_reauth')
  })

  it('un fallo pasajero de Google NO deja la conexion para reconectar', async () => {
    googleResponde(503, { error: 'backendError' })

    await expect(conexion().getAccessToken()).rejects.toThrow()
    expect(await estadoConexion()).toBe('active')
  })
})
