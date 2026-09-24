import type { FastifyInstance } from 'fastify'
import { withAuthTransaction } from '@kaizen/db'
import { requireSession } from '../plugins/session.js'

/**
 * Identidad y espacios propios. Devuelve SOLO lo del solicitante; no existe
 * un parametro para pedir los de otro usuario.
 */
export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/me', async (request) => {
    const session = requireSession(request)

    const espacios = await withAuthTransaction(async (client) => {
      const { rows } = await client.query<{
        tenant_id: string
        tenant_name: string
        tenant_kind: string
        municipality_code: string | null
        role: string
        purpose_id: string
        purpose_code: string
        permissions: string[]
      }>(
        `select t.id as tenant_id,
                t.name as tenant_name,
                t.tenant_kind,
                t.municipality_code,
                m.role,
                p.id as purpose_id,
                p.code as purpose_code,
                coalesce(array_agg(g.permission) filter (where g.permission is not null), '{}') as permissions
           from memberships m
           join tenants t on t.id = m.tenant_id and t.status = 'active'
           join data_purposes p on p.tenant_id = t.id and p.status = 'active'
           -- Misma vista que la resolucion de ambito: una sola definicion de
           -- permisos, incluidos los que se derivan de ser lider.
           left join effective_grants g
                  on g.tenant_id = t.id
                 and g.purpose_id = p.id
                 and g.user_id = m.user_id
          where m.user_id = $1 and m.status = 'active'
          group by t.id, t.name, t.tenant_kind, t.municipality_code, m.role, p.id, p.code
          order by t.name, p.code`,
        [session.userId],
      )
      return rows
    }, session.userId)

    return {
      user: {
        id: session.userId,
        emailDisplay: session.emailDisplay,
      },
      // Una finalidad sin ningun permiso se devuelve igual, para que la
      // interfaz pueda mostrarla deshabilitada en vez de ocultarla y dejar
      // al usuario sin entender por que no ve nada.
      scopes: espacios.map((e) => ({
        tenantId: e.tenant_id,
        tenantName: e.tenant_name,
        tenantKind: e.tenant_kind,
        municipalityCode: e.municipality_code,
        role: e.role,
        purposeId: e.purpose_id,
        purposeCode: e.purpose_code,
        permissions: e.permissions.filter(Boolean),
      })),
    }
  })
}
