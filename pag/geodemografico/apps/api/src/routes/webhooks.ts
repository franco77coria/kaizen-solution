import type { FastifyInstance } from 'fastify'
import { withAuthorizedTransaction } from '@kaizen/db'
import { hashToken, secretsEqual } from '@kaizen/authz'
import { logger } from '@kaizen/observability'
import { admitir } from '../plugins/admission.js'

/**
 * Ticket 07 — webhook del proveedor de documentos.
 *
 * Tres reglas que este endpoint hace cumplir:
 *
 *   1. NO hay sesion de usuario. La autoriza el secreto del canal, comparado
 *      en tiempo constante contra el hash guardado.
 *   2. El CUERPO de la notificacion no se cree para nada. Drive avisa "algo
 *      cambio"; que cambio se averigua RECONSULTANDO con nuestro cursor. Un
 *      webhook que dictara que documento reindexar seria una via para que
 *      quien lo envie elija que se procesa.
 *   3. Responde 200 aunque no encuentre el canal. Distinguir "canal
 *      desconocido" de "canal valido" permitiria sondear que canales existen.
 *      El detalle real va al log.
 *
 * Perder o duplicar una notificacion no rompe nada: el trabajo encolado es
 * idempotente y ademas hay una reconciliacion periodica del manifiesto
 * completo, porque consumir solo eventos deja huecos que nadie nota.
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/drive', async (request, reply) => {
    const canal = request.headers['x-goog-channel-id']
    const token = request.headers['x-goog-channel-token']
    const estado = request.headers['x-goog-resource-state']

    // Limite por canal: una tormenta de notificaciones no puede convertirse
    // en una tormenta de trabajos de ingesta.
    await admitir('sync', typeof canal === 'string' ? canal : request.ip)

    if (typeof canal !== 'string' || typeof token !== 'string') {
      logger.warn('webhook.encabezados_incompletos', { requestId: request.requestId })
      return reply.status(200).send({ ok: true })
    }

    // `sync` es el mensaje inicial que Drive manda al crear el canal: confirma
    // el registro y no significa que haya cambios.
    if (estado === 'sync') return reply.status(200).send({ ok: true })

    // Se usa la identidad `webhook`, que NO tiene contexto de tenant porque
    // el canal es justamente lo que todavia no lo revela. Esa identidad solo
    // puede leer la tabla de canales (identificadores opacos y un hash) y
    // encolar una reconciliacion. No ve documentos, personas ni conversaciones.
    const encolado = await withAuthorizedTransaction('webhook', {}, async (client) => {
      const { rows } = await client.query<{
        tenant_id: string
        connection_id: string
        corpus_id: string
        connection_generation: number
        token_hash: string
        expires_at: Date
      }>(
        `select tenant_id, connection_id, corpus_id, connection_generation,
                token_hash, expires_at
           from notification_channels
          where channel_id = $1`,
        [canal],
      )

      const registro = rows[0]
      if (!registro) return { resultado: 'canal_desconocido' as const }

      // Comparacion en tiempo constante: `===` filtraria el prefijo del hash.
      if (!secretsEqual(registro.token_hash, hashToken(token))) {
        return { resultado: 'token_invalido' as const }
      }

      if (registro.expires_at.getTime() < Date.now()) {
        return { resultado: 'canal_vencido' as const }
      }

      // Se encola una RECONCILIACION, no la ingesta de un archivo concreto:
      // el cuerpo de la notificacion no elige el trabajo. La clave de
      // deduplicacion agrupa por minuto, para que una rafaga de avisos no
      // genere una rafaga de trabajos.
      const dedupeKey = `webhook:${registro.connection_id}:${Math.floor(Date.now() / 60_000)}`

      await client.query(
        `insert into ingestion_jobs
           (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
            job_kind, pipeline_version, dedupe_key)
         values ($1,$2,$3,$4,'','reconcile','webhook-1',$5)
         on conflict (tenant_id, dedupe_key) do nothing`,
        [
          registro.tenant_id,
          registro.corpus_id,
          registro.connection_id,
          registro.connection_generation,
          dedupeKey,
        ],
      )

      return { resultado: 'encolado' as const }
    })

    if (encolado.resultado !== 'encolado') {
      logger.warn('webhook.descartado', {
        requestId: request.requestId,
        motivo: encolado.resultado,
      })
    }

    // Siempre 200: el proveedor reintenta ante un error, y no hay nada que
    // reintentar. Ademas, un codigo distinto revelaria si el canal existe.
    return reply.status(200).send({ ok: true })
  })
}
