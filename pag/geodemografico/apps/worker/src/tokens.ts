import { withAuthorizedTransaction } from '@kaizen/db'
import { open, seal } from '@kaizen/authz'
import { logger } from '@kaizen/observability'
import { renovarAccessToken, type AccessTokenSource } from '@kaizen/connector-google-drive'

/**
 * Fuente de access tokens para el worker de ingesta.
 *
 * Renueva por adelantado (60 s antes de vencer) para que una peticion no falle
 * justo en el limite, y persiste el token renovado: si no se guardara, cada
 * arranque del worker gastaria una renovacion de mas.
 *
 * Si la renovacion falla con un error definitivo -el usuario revoco el acceso
 * en su cuenta de Google, o el refresh token caduco- la conexion pasa a
 * `needs_reauth`. Eso es lo que hace que la interfaz muestre "Necesitamos
 * reconectar Google" en vez de fallar en silencio cada sincronizacion.
 */
interface SecretoOAuth {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
}

const MARGEN_MS = 60_000

export class ConexionIngestor implements AccessTokenSource {
  private cache: { token: string; expira: number } | null = null

  constructor(
    private readonly tenantId: string,
    private readonly corpusId: string,
    private readonly connectionId: string,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cache && this.cache.expira - MARGEN_MS > Date.now()) {
      return this.cache.token
    }

    const contexto = { tenantId: this.tenantId, corpusId: this.corpusId }

    const guardado = await withAuthorizedTransaction('worker', contexto, async (client) => {
      const { rows } = await client.query<{
        token_ref: string | null
        ciphertext: Buffer
        iv: Buffer
        auth_tag: Buffer
        key_version: number
      }>(
        `select sc.token_ref, v.ciphertext, v.iv, v.auth_tag, v.key_version
           from source_connections sc
           join token_vault v on v.tenant_id = sc.tenant_id and v.id = sc.token_ref
          where sc.id = $1 and sc.status = 'active'`,
        [this.connectionId],
      )

      const fila = rows[0]
      if (!fila?.token_ref) return null

      return {
        tokenRef: fila.token_ref,
        secreto: JSON.parse(
          open({
            ciphertext: fila.ciphertext,
            iv: fila.iv,
            authTag: fila.auth_tag,
            keyVersion: fila.key_version,
          }),
        ) as SecretoOAuth,
      }
    })

    if (!guardado) {
      throw new Error('la conexion de ingesta no tiene credencial activa')
    }

    const vence = Date.parse(guardado.secreto.expiresAt)
    if (Number.isFinite(vence) && vence - MARGEN_MS > Date.now()) {
      this.cache = { token: guardado.secreto.accessToken, expira: vence }
      return guardado.secreto.accessToken
    }

    if (!guardado.secreto.refreshToken) {
      await this.marcarReautenticacion('sin refresh token')
      throw new Error('la conexion de ingesta requiere reautenticacion')
    }

    try {
      const renovado = await renovarAccessToken('ingestor', guardado.secreto.refreshToken)

      await withAuthorizedTransaction('worker', contexto, async (client) => {
        const sellado = seal(
          JSON.stringify({
            accessToken: renovado.accessToken,
            // El refresh token NO se reemplaza: Google no siempre devuelve uno
            // nuevo, y pisarlo con null romperia la conexion para siempre.
            refreshToken: guardado.secreto.refreshToken,
            expiresAt: renovado.expiresAt.toISOString(),
          } satisfies SecretoOAuth),
        )

        await client.query(
          `update token_vault
              set ciphertext = $2, iv = $3, auth_tag = $4, rotated_at = now()
            where id = $1`,
          [guardado.tokenRef, sellado.ciphertext, sellado.iv, sellado.authTag],
        )
      })

      this.cache = { token: renovado.accessToken, expira: renovado.expiresAt.getTime() }
      return renovado.accessToken
    } catch (error) {
      await this.marcarReautenticacion(
        error instanceof Error ? error.message : 'fallo la renovacion',
      )
      throw error
    }
  }

  private async marcarReautenticacion(motivo: string): Promise<void> {
    logger.warn('ingesta.reautenticacion_necesaria', {
      connectionId: this.connectionId,
      motivo,
    })

    await withAuthorizedTransaction(
      'worker',
      { tenantId: this.tenantId, corpusId: this.corpusId },
      async (client) => {
        await client.query(
          `update source_connections set status = 'needs_reauth' where id = $1`,
          [this.connectionId],
        )
      },
    )
  }
}
