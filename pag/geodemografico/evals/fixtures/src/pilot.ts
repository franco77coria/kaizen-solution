import type { Client, PoolClient } from 'pg'

type Db = Client | PoolClient

/**
 * Tenant del PILOTO INTERNO de Kaizen (seccion 21 del plan).
 *
 * Decisiones que este seed materializa:
 *   - `tenant_kind = internal_pilot` con `municipality_code` NULO. El piloto
 *     empresarial NO se asigna artificialmente a un municipio ficticio ni a
 *     una campana.
 *   - Proposito propio `prueba_documental_empresa`, separado de cualquier
 *     finalidad de campana.
 *   - La cuenta de gerencia se prealimenta como INVITACION, no como usuario
 *     con sesion: la identidad estable (issuer, sub) se fija recien en el
 *     primer login real de Google.
 *   - Permisos iniciales exactos del plan: notes.read, sources.manage y
 *     analyses.save. Nada de acceso a datos de campanas.
 */
export const PILOTO = {
  tenantId: '90000001-0000-4000-8000-000000000001',
  purposeId: '90000002-0000-4000-8000-000000000001',
  corpusId: '90000003-0000-4000-8000-000000000001',
  connectionId: '90000004-0000-4000-8000-000000000001',
  collectionId: '90000005-0000-4000-8000-000000000001',
  email: 'gerencia@kaizensolutionscol.com',
} as const

export async function seedPiloto(db: Db, opciones: { invitationTokenHash: string }): Promise<void> {
  await db.query(
    `insert into tenants (id, tenant_kind, municipality_code, name, time_zone)
     values ($1,'internal_pilot',null,'Kaizen - piloto interno','America/Bogota')
     on conflict (id) do nothing`,
    [PILOTO.tenantId],
  )

  await db.query(
    `insert into data_purposes (id, tenant_id, code, description)
     values ($1,$2,'prueba_documental_empresa',
             'Prueba documental interna de Kaizen. No incluye datos de campanas ni de terceros.')
     on conflict (id) do nothing`,
    [PILOTO.purposeId, PILOTO.tenantId],
  )

  await db.query(
    `insert into corpora (id, tenant_id, purpose_id, name)
     values ($1,$2,$3,'notas_gerencia_piloto')
     on conflict (id) do nothing`,
    [PILOTO.corpusId, PILOTO.tenantId, PILOTO.purposeId],
  )

  // Conexion con proveedor `fixture`: el piloto se puede recorrer entero en
  // local. Al conectar Drive de verdad se crea una conexion nueva con
  // generacion propia, y esta queda revocada.
  await db.query(
    `insert into source_connections
       (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, cursor)
     values ($1,$2,$3,'fixture','pendiente-oauth','{}','active','cursor-0')
     on conflict (id) do nothing`,
    [PILOTO.connectionId, PILOTO.tenantId, PILOTO.corpusId],
  )

  await db.query(
    `insert into source_collections
       (id, tenant_id, corpus_id, connection_id, mode, allowed_mime_types, admission_rule)
     values ($1,$2,$4,$3,'virtual_manifest','{application/vnd.google-apps.document}',null)
     on conflict (id) do nothing`,
    [PILOTO.collectionId, PILOTO.tenantId, PILOTO.connectionId, PILOTO.corpusId],
  )

  // Invitacion de un solo uso. El alta NO es automatica por pertenecer al
  // dominio: hace falta esta invitacion, y se consume al primer login valido.
  await db.query(
    `insert into invitations (tenant_id, invited_email, role, token_hash, status, expires_at)
     values ($1,$2,'gestor_fuentes',$3,'pending', now() + interval '30 days')
     on conflict (token_hash) do nothing`,
    [PILOTO.tenantId, PILOTO.email, opciones.invitationTokenHash],
  )
}

/**
 * Otorga los permisos del piloto a un usuario YA existente. Se llama despues
 * del primer login, cuando la identidad estable quedo fijada.
 */
export async function otorgarPermisosPiloto(db: Db, userId: string): Promise<void> {
  for (const permiso of ['notes.read', 'sources.manage', 'analyses.save']) {
    await db.query(
      `insert into purpose_grants (tenant_id, purpose_id, user_id, permission)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [PILOTO.tenantId, PILOTO.purposeId, userId, permiso],
    )
  }
}
