import type { PoolClient } from 'pg'
import { forbidden, isPermission, type Permission } from '@kaizen/contracts'

/**
 * Resuelve los permisos efectivos de un usuario en (tenant, proposito).
 *
 * Reglas que esta funcion hace cumplir:
 *   - La membresia debe estar ACTIVA. Una suspension corta el acceso aunque
 *     la sesion siga viva.
 *   - El tenant debe estar activo.
 *   - Cada permiso es una concesion EXPLICITA y vigente. Pertenecer al tenant
 *     no abre sus propositos.
 */
export interface EffectiveScope {
  permissions: Set<Permission>
  authzVersion: number
}

export async function resolveEffectiveScope(
  client: PoolClient,
  tenantId: string,
  purposeId: string,
  userId: string,
): Promise<EffectiveScope | null> {
  const membership = await client.query<{ authz_version: number }>(
    `select m.authz_version
       from memberships m
       join tenants t on t.id = m.tenant_id
      where m.tenant_id = $1
        and m.user_id = $2
        and m.status = 'active'
        and t.status = 'active'`,
    [tenantId, userId],
  )

  const row = membership.rows[0]
  if (!row) return null

  // El proposito debe pertenecer a ESTE tenant y estar activo. Un purpose_id
  // de otro tenant no se resuelve aunque el usuario lo escriba.
  const purpose = await client.query<{ id: string }>(
    `select id from data_purposes
      where tenant_id = $1 and id = $2 and status = 'active'`,
    [tenantId, purposeId],
  )
  if (!purpose.rows[0]) return null

  // `effective_grants` une las concesiones explícitas con las que se derivan
  // de un registro de líder activo. Es la ÚNICA definición de "qué permisos
  // tiene": /v1/me lee la misma vista, así las dos respuestas no pueden
  // divergir. La vigencia (estado, vencimiento) ya viene aplicada.
  const grants = await client.query<{ permission: string }>(
    `select permission from effective_grants
      where tenant_id = $1
        and purpose_id = $2
        and user_id = $3`,
    [tenantId, purposeId, userId],
  )

  const permissions = new Set<Permission>()
  for (const g of grants.rows) {
    if (isPermission(g.permission)) permissions.add(g.permission)
  }

  return { permissions, authzVersion: row.authz_version }
}

/** Lanza FORBIDDEN si falta el permiso. No revela que permisos si tiene. */
export function requirePermission(
  permissions: ReadonlySet<Permission>,
  needed: Permission,
): void {
  if (!permissions.has(needed)) {
    throw forbidden(`falta el permiso ${needed}`)
  }
}

export function requireAny(
  permissions: ReadonlySet<Permission>,
  needed: readonly Permission[],
): void {
  if (!needed.some((p) => permissions.has(p))) {
    throw forbidden(`falta alguno de: ${needed.join(', ')}`)
  }
}
