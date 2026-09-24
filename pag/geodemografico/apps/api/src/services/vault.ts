import type { PoolClient } from 'pg'
import { conflict } from '@kaizen/contracts'
import { open, seal } from '@kaizen/authz'

/**
 * Guarda y recupera secretos OAuth cifrados.
 *
 * Lo que se cifra es un objeto con el access token, el refresh token y su
 * vencimiento: un solo criptograma por conexion, en vez de tres columnas
 * sueltas que alguien podria olvidar cifrar.
 */
export interface SecretoOAuth {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
}

export async function guardarSecreto(
  client: PoolClient,
  tenantId: string,
  secreto: SecretoOAuth,
  tokenRefExistente?: string | null,
): Promise<string> {
  const sellado = seal(JSON.stringify(secreto))

  if (tokenRefExistente) {
    const { rowCount } = await client.query(
      `update token_vault
          set ciphertext = $2, iv = $3, auth_tag = $4, rotated_at = now()
        where id = $1`,
      [tokenRefExistente, sellado.ciphertext, sellado.iv, sellado.authTag],
    )
    if (rowCount === 1) return tokenRefExistente
  }

  const { rows } = await client.query<{ id: string }>(
    `insert into token_vault (tenant_id, ciphertext, iv, auth_tag, key_version)
     values ($1,$2,$3,$4,$5)
     returning id`,
    [tenantId, sellado.ciphertext, sellado.iv, sellado.authTag, sellado.keyVersion],
  )

  const id = rows[0]?.id
  if (!id) throw conflict('no se pudo guardar la credencial')
  return id
}

export async function leerSecreto(
  client: PoolClient,
  tokenRef: string,
): Promise<SecretoOAuth | null> {
  const { rows } = await client.query<{
    ciphertext: Buffer
    iv: Buffer
    auth_tag: Buffer
    key_version: number
  }>(
    `select ciphertext, iv, auth_tag, key_version from token_vault where id = $1`,
    [tokenRef],
  )

  const fila = rows[0]
  if (!fila) return null

  // GCM es autenticado: si alguien altero el criptograma en la base, esto
  // lanza en vez de devolver basura que pareceria un token.
  return JSON.parse(
    open({
      ciphertext: fila.ciphertext,
      iv: fila.iv,
      authTag: fila.auth_tag,
      keyVersion: fila.key_version,
    }),
  ) as SecretoOAuth
}
