import type { PoolClient } from 'pg'
import { unauthenticated, type UserId } from '@kaizen/contracts'
import type { VerifiedIdentity } from './oidc.js'
import { hashToken, secretsEqual } from './crypto.js'

/**
 * Resuelve o crea el usuario a partir de la identidad verificada, y comprueba
 * que tenga derecho a entrar.
 *
 * Regla central: un dominio valido NO concede membresia. Una cuenta del
 * dominio sin invitacion ni membresia queda fuera, aunque su token sea
 * perfectamente valido.
 */
export interface LoginOutcome {
  userId: UserId
  isNewUser: boolean
  tenantIds: string[]
}

export async function resolveLogin(
  client: PoolClient,
  identity: VerifiedIdentity,
  invitationToken?: string,
): Promise<LoginOutcome> {
  // 1. Identidad estable. Si el email cambio en Google, se actualiza el texto
  //    para mostrar, pero la identidad sigue siendo la misma fila.
  const existing = await client.query<{ id: string; status: string }>(
    `select id, status from users where issuer = $1 and subject = $2`,
    [identity.issuer, identity.subject],
  )

  let userId = existing.rows[0]?.id
  const isNewUser = !userId

  if (userId) {
    if (existing.rows[0]?.status !== 'active') {
      throw unauthenticated('usuario suspendido o deshabilitado')
    }
    await client.query(
      `update users set email_display = $2, last_seen_at = now() where id = $1`,
      [userId, identity.emailDisplay],
    )
  } else {
    const created = await client.query<{ id: string }>(
      `insert into users (issuer, subject, email_display) values ($1,$2,$3) returning id`,
      [identity.issuer, identity.subject, identity.emailDisplay],
    )
    userId = created.rows[0]?.id
    if (!userId) throw new Error('no se pudo crear el usuario')
  }

  // 2. Si trae invitacion, se consume (un solo uso, con expiracion).
  if (invitationToken) {
    await consumeInvitation(client, invitationToken, userId, identity)
  }

  // 2b. Lideres cargados por email: se reconocen en el primer login.
  await activarLiderazgos(client, userId, identity)

  // 3. Debe existir al menos una membresia activa. Sin eso no entra.
  const memberships = await client.query<{ tenant_id: string }>(
    `select m.tenant_id
       from memberships m
       join tenants t on t.id = m.tenant_id
      where m.user_id = $1 and m.status = 'active' and t.status = 'active'`,
    [userId],
  )

  if (memberships.rows.length === 0) {
    throw unauthenticated('la cuenta no pertenece a ningun espacio autorizado')
  }

  return {
    userId: userId as UserId,
    isNewUser,
    tenantIds: memberships.rows.map((r) => r.tenant_id),
  }
}

async function consumeInvitation(
  client: PoolClient,
  token: string,
  userId: string,
  identity: VerifiedIdentity,
): Promise<void> {
  // El bloqueo de fila hace que dos usos simultaneos del mismo token se
  // serialicen: el segundo encuentra la invitacion ya aceptada.
  const { rows } = await client.query<{
    id: string
    tenant_id: string
    role: string
    invited_email: string
    token_hash: string
    status: string
    expires_at: Date
  }>(
    `select id, tenant_id, role, invited_email, token_hash, status, expires_at
       from invitations
      where token_hash = $1
      for update`,
    [hashToken(token)],
  )

  const invitation = rows[0]
  if (!invitation) throw unauthenticated('invitacion invalida')

  // Comparacion en tiempo constante aunque ya se busco por hash: mantiene la
  // propiedad si algun dia se busca por otro campo.
  if (!secretsEqual(invitation.token_hash, hashToken(token))) {
    throw unauthenticated('invitacion invalida')
  }
  if (invitation.status !== 'pending') throw unauthenticated('invitacion ya utilizada o revocada')
  if (invitation.expires_at.getTime() <= Date.now()) {
    await client.query(`update invitations set status = 'expired' where id = $1`, [invitation.id])
    throw unauthenticated('invitacion expirada')
  }

  // El email invitado es una comprobacion adicional, no la identidad.
  if (
    invitation.invited_email.toLowerCase() !== identity.emailDisplay.toLowerCase()
  ) {
    throw unauthenticated('la invitacion no corresponde a esta cuenta')
  }

  // Primero se marca aceptada y DESPUES se crea la membresia: la politica de
  // `memberships` solo deja a esta identidad crear una membresia que tenga
  // detras una invitacion ya aceptada por la misma cuenta y con el mismo rol.
  // En el orden inverso, la primera invitacion real fallaba en el login.
  await client.query(
    `update invitations set status = 'accepted', accepted_by = $2, accepted_at = now()
      where id = $1`,
    [invitation.id, userId],
  )

  await client.query(
    `insert into memberships (tenant_id, user_id, role)
     values ($1,$2,$3)
     on conflict (tenant_id, user_id) do update set status = 'active'`,
    [invitation.tenant_id, userId, invitation.role],
  )
}

/**
 * Reconoce a una cuenta cargada por email (lider o administrador) y la ata a
 * esta identidad.
 *
 * Por que se puede confiar en el email: `assertIdentityAcceptable` ya exigio
 * `email_verified`, es decir, Google certifica que la cuenta es duena de ese
 * email. Y el email se usa UNA sola vez: desde la activacion el lider queda
 * identificado por `user_id` (issuer + subject), asi que un cambio posterior
 * del email en Google no le saca ni le da acceso a nadie.
 *
 * No se otorga ningun permiso aca: los de un lider se derivan de su registro
 * activo (vista `effective_grants`). Esta funcion solo crea la membresia, y la
 * base solo la deja crearla si el registro existe y quedo activo.
 */
async function activarLiderazgos(
  client: PoolClient,
  userId: string,
  identity: VerifiedIdentity,
): Promise<void> {
  const email = identity.emailDisplay.trim().toLowerCase()
  if (!email) return

  const { rows } = await client.query<{ tenant_id: string; rol: string }>(
    `update leader_registry
        set status = 'active', user_id = $1, activated_at = now()
      where email = $2 and status = 'pending'
      returning tenant_id, rol`,
    [userId, email],
  )

  for (const { tenant_id, rol } of rows) {
    // Si ya tiene una membresia ACTIVA (un administrador que ademas se cargo
    // como lider), no se toca: reactivarla con su rol actual la rechazaria la
    // politica y esa persona no podria entrar. Solo se reactiva una suspendida
    // o revocada, y con el rol que dice el registro.
    await client.query(
      `insert into memberships (tenant_id, user_id, role)
       values ($1, $2, $3)
       on conflict (tenant_id, user_id) do update
         set status = 'active', role = excluded.role
         where memberships.status <> 'active'`,
      [tenant_id, userId, rol],
    )
  }
}
