import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { conflict, notFound, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { requireCsrf, resolveScope, txContext } from '../plugins/session.js'
import { registrarAuditoria } from '../services/audit.js'
import { leerAmbito } from './scope.js'

/**
 * Líderes: quién suma a quién.
 *
 * Un administrador carga el email de Google de cada líder. Cuando esa cuenta
 * entra, el login la reconoce (`activarLiderazgos` en `@kaizen/authz`). Estas
 * rutas NO otorgan permisos: solo escriben el registro. Los permisos del líder
 * se derivan de su registro activo (vista `effective_grants`), así que
 * revocarlo acá los quita en la próxima consulta.
 */

const altaSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),
    nombre: z.string().trim().min(2).max(120),
  })
  .strict()

const idParam = z.object({ id: z.string().uuid() })

/** Una persona cuenta apenas se suma; lo que se rechaza o retira, no. */
const CUENTA = `r.status in ('submitted', 'approved')`

export async function liderRoutes(app: FastifyInstance): Promise<void> {
  /** Listado para quien administra, con cuánto sumó cada uno. */
  app.get('/v1/lideres', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['tenant.admin'])

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        email: string
        display_name: string
        status: 'pending' | 'active' | 'revoked'
        activated_at: Date | null
        created_at: Date
        sumadas: number
        municipios: number
      }>(
        `select lr.id, lr.email, lr.display_name, lr.status, lr.activated_at, lr.created_at,
                count(r.id)::int as sumadas,
                count(distinct r.municipality_code)::int as municipios
           from leader_registry lr
           left join person_records r
                  on r.tenant_id = lr.tenant_id
                 and r.purpose_id = lr.purpose_id
                 and r.captured_by = lr.user_id
                 and ${CUENTA}
          -- Solo lideres: a un administrador lo carga el deploy y la app no
          -- puede revocarlo, asi que listarlo con un boton seria ofrecer algo
          -- que va a fallar.
          where lr.purpose_id = $1 and lr.status <> 'revoked' and lr.rol = 'lider'
          group by lr.id
          order by count(r.id) desc, lr.display_name asc`,
        [session.purposeId],
      )

      return {
        lideres: rows.map((r) => ({
          id: r.id,
          email: r.email,
          nombre: r.display_name,
          // "Pendiente" = cargado pero todavía no entró nunca.
          estado: r.status,
          activo: r.activated_at,
          creado: r.created_at,
          sumadas: r.sumadas,
          municipios: r.municipios,
        })),
      }
    })
  })

  app.post('/v1/lideres', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['tenant.admin'])
    const parsed = altaSchema.safeParse(request.body)
    if (!parsed.success) throw validationFailed('email o nombre invalidos')
    if (!parsed.data.email.endsWith('@kaizensolutionscol.com')) {
      throw validationFailed('el lider debe usar una cuenta de Kaizen')
    }

    const id = await withAuthorizedTransaction('app', txContext(session), async (client) => {
      try {
        const { rows } = await client.query<{ id: string }>(
          `insert into leader_registry (tenant_id, purpose_id, email, display_name, created_by)
           values ($1, $2, $3, $4, $5)
           returning id`,
          [session.tenantId, session.purposeId, parsed.data.email, parsed.data.nombre, session.userId],
        )
        return rows[0]?.id ?? null
      } catch (error) {
        // El índice único parcial: ese email ya está cargado y vigente.
        if (error instanceof Error && 'code' in error && error.code === '23505') {
          throw conflict('ese email ya esta cargado como lider en este espacio')
        }
        throw error
      }
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'leader.registered',
      resourceRef: id ?? 'desconocido',
      result: 'allowed',
      requestId: request.requestId,
      // El email NO va a la auditoría: es un dato personal y el id alcanza
      // para reconstruir quién fue.
    })

    return { id }
  })

  app.post('/v1/lideres/:id/revocar', async (request) => {
    requireCsrf(request)
    const session = await resolveScope(request, leerAmbito(request), ['tenant.admin'])
    const params = idParam.safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rowCount } = await client.query(
        `update leader_registry
            set status = 'revoked', revoked_at = now()
          where id = $1 and purpose_id = $2 and status <> 'revoked'`,
        [params.data.id, session.purposeId],
      )
      // Con RLS filtrando, un id ajeno o inexistente actualiza 0 filas sin
      // error (lección 36): hay que mirar la cuenta, no el código HTTP.
      if ((rowCount ?? 0) === 0) throw notFound('lider inexistente o ya revocado')
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'leader.revoked',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
    })

    return { ok: true }
  })

  /**
   * Lo que sumó la cuenta que pregunta. Es su propio trabajo: se muestra la
   * cifra exacta, sin supresión, porque son personas que esa cuenta cargó y
   * ya conoce.
   */
  app.get('/v1/capture/mias', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['records.capture'])

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{ total: number; municipios: number; hoy: number }>(
        `select count(*)::int as total,
                count(distinct r.municipality_code)::int as municipios,
                count(*) filter (where r.created_at >= date_trunc('day', now()))::int as hoy
           from person_records r
          where r.purpose_id = $1 and r.captured_by = $2 and ${CUENTA}`,
        [session.purposeId, session.userId],
      )
      return rows[0] ?? { total: 0, municipios: 0, hoy: 0 }
    })
  })
}
