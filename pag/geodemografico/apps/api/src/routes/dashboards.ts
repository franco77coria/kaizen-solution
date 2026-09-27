import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  cambiarVisibilidadSchema,
  crearDashboardSchema,
  notFound,
  validationFailed,
  type DashboardCompleto,
  type DashboardDocumento,
  type DashboardEnLista,
  type Visibilidad,
} from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveCorpusScope, resolveScope, txContext } from '../plugins/session.js'
import { registrarAuditoria } from '../services/audit.js'
import { crearDashboard } from '../services/dashboards.js'
import { leerAmbito } from './scope.js'

/**
 * Dashboards de SUMA. Todo exige sesion y lectura de notas: un dashboard sale
 * de las actas internas del espacio. La RLS limita a los propios y a los
 * visibles del mismo espacio; la vigencia se deriva al leer (expires_at).
 */
const idParam = z.object({ id: z.string().uuid() })

interface Fila {
  id: string
  titulo: string
  visibilidad: Visibilidad
  owner_user_id: string
  autor: string
  created_at: Date
  expires_at: Date
}

function enLista(f: Fila, userId: string): DashboardEnLista {
  return {
    id: f.id,
    titulo: f.titulo,
    visibilidad: f.visibilidad,
    esMio: f.owner_user_id === userId,
    // Solo la parte local del email: alcanza para reconocer al autor dentro
    // del espacio sin exponer la direccion completa en la pagina.
    autor: f.autor.split('@')[0] ?? f.autor,
    creadoEn: f.created_at.toISOString(),
    venceEn: f.expires_at.toISOString(),
  }
}

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/dashboards', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])
    const parsed = crearDashboardSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('cuerpo invalido')
    return crearDashboard({ session, messageId: parsed.data.messageId, requestId: request.requestId })
  })

  app.get('/v1/dashboards', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['notes.read'])
    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<Fila>(
        `select id, titulo, visibilidad, owner_user_id, autor, created_at, expires_at
           from dashboards
          where expires_at > now()
          order by created_at desc
          limit 50`,
      )
      return { dashboards: rows.map((f) => enLista(f, session.userId)) }
    })
  })

  app.get('/v1/dashboards/:id', async (request): Promise<DashboardCompleto> => {
    const session = await resolveScope(request, leerAmbito(request), ['notes.read'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<Fila & { documento: DashboardDocumento; privacy_epoch: number }>(
        `select id, titulo, visibilidad, owner_user_id, autor, created_at, expires_at,
                documento, privacy_epoch
           from dashboards
          where id = $1 and expires_at > now()`,
        [params.data.id],
      )
      const fila = rows[0]
      // Vencido, ajeno y privado, o de otro espacio: para quien pregunta, no existe.
      if (!fila) throw notFound('dashboard inexistente o vencido')

      const epoch = await client.query<{ privacy_epoch: number }>(
        `select privacy_epoch from tenants where id = $1`,
        [session.tenantId],
      )
      return {
        ...enLista(fila, session.userId),
        documento: fila.documento,
        desactualizado: (epoch.rows[0]?.privacy_epoch ?? fila.privacy_epoch) !== fila.privacy_epoch,
      }
    })
  })

  app.patch('/v1/dashboards/:id', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['notes.read'])
    const params = idParam.safeParse(request.params)
    const parsed = cambiarVisibilidadSchema.safeParse(request.body)
    if (!params.success || !parsed.success) throw validationFailed('cuerpo invalido')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `update dashboards set visibilidad = $2
          where id = $1 and owner_user_id = $3 and expires_at > now()`,
        [params.data.id, parsed.data.visibilidad, session.userId],
      )
      // Con RLS, uno ajeno actualiza 0 filas sin error: hay que mirar la cuenta.
      if (rowCount !== 1) throw notFound('dashboard inexistente, vencido o ajeno')
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'dashboard.visibility',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
      detail: { visibilidad: parsed.data.visibilidad },
    })
    return { ok: true }
  })

  app.delete('/v1/dashboards/:id', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['notes.read'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `delete from dashboards where id = $1 and owner_user_id = $2`,
        [params.data.id, session.userId],
      )
      if (rowCount !== 1) throw notFound('dashboard inexistente o ajeno')
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'dashboard.delete',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })
    return { ok: true }
  })
}
