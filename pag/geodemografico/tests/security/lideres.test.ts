import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { CONSENT_TEXT_VERSION, F, seedRegistros } from '@kaizen/fixtures'
import { assertIdentityAcceptable, createSession } from '@kaizen/authz'
import { withAuthTransaction } from '@kaizen/db'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Líderes: un administrador carga un email de Google; cuando esa cuenta entra,
 * el sistema la reconoce y lo que suma queda a su nombre.
 *
 * Lo que se prueba es quién ENTRA y qué puede hacer, que es lo que importa:
 *   - una cuenta sin registro no entra, aunque su email esté verificado;
 *   - el líder recibe exactamente dos permisos (sumar y ver el panorama);
 *   - revocar le quita los permisos en la siguiente consulta;
 *   - la identidad de login no puede darse acceso por su cuenta.
 */
let env: TestEnv
let app: FastifyInstance

interface Sesion {
  cookies: string
  csrf: string
}

async function autenticar(subject: string): Promise<Sesion | null> {
  const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
  reiniciarAdmision()

  const inicio = await app.inject({ method: 'GET', url: '/auth/start' })
  const cookieFlujo = inicio.cookies.find((c) => c.name === 'kaizen_oauth')
  const state = new URL(inicio.headers.location as string).searchParams.get('state') ?? ''

  const callback = await app.inject({
    method: 'GET',
    url: `/auth/callback?code=${subject}&state=${encodeURIComponent(state)}`,
    cookies: { kaizen_oauth: cookieFlujo?.value ?? '' },
  })

  const sesion = callback.cookies.find((c) => c.name === 'kaizen_session')
  const csrf = callback.cookies.find((c) => c.name === 'kaizen_csrf')
  if (!sesion) return null

  return {
    cookies: `kaizen_session=${sesion.value}; kaizen_csrf=${csrf?.value ?? ''}`,
    csrf: csrf?.value ?? '',
  }
}

function cabeceras(sesion: Sesion) {
  return {
    cookie: sesion.cookies,
    'x-csrf-token': sesion.csrf,
    'x-tenant-id': F.tenantA,
    'x-purpose-id': F.purposeA,
  }
}

async function permisosDe(sesion: Sesion): Promise<string[]> {
  const r = await app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: sesion.cookies } })
  const espacio = r
    .json()
    .scopes.find((s: { tenantId: string; purposeId: string }) => s.tenantId === F.tenantA && s.purposeId === F.purposeA)
  return espacio ? [...espacio.permissions].sort() : []
}

let admin: Sesion

beforeAll(async () => {
  env = await setupTestEnv()
  await seedRegistros(env.owner)

  process.env['APP_ENV'] = 'local'
  process.env['OIDC_PROVIDER'] = 'fake'
  process.env['OIDC_ALLOWED_HD'] = 'kaizensolutionscol.com'
  process.env['SESSION_SECRET'] = 'clave-de-prueba-suficientemente-larga'
  process.env['TOKEN_VAULT_KEY'] = Buffer.alloc(32, 7).toString('base64')
  process.env['LLM_PROVIDER'] = 'fake'
  process.env['EMBEDDINGS_PROVIDER'] = 'fake'

  const { buildApp } = await import('../../apps/api/src/app.js')
  app = await buildApp()
  await app.ready()

  admin = (await autenticar('sub-admin'))!
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

async function cargarLider(email: string, nombre: string) {
  return app.inject({
    method: 'POST',
    url: '/v1/lideres',
    headers: cabeceras(admin),
    payload: { email, nombre },
  })
}

describe('quién entra', () => {
  it('una cuenta con email verificado pero SIN registro no entra', async () => {
    expect(await autenticar('sub-nadie-la-cargo')).toBeNull()
  })

  it('solo un administrador puede cargar líderes', async () => {
    const lector = (await autenticar('sub-a1'))!
    const r = await app.inject({
      method: 'POST',
      url: '/v1/lideres',
      headers: cabeceras(lector),
      payload: { email: 'intruso@kaizensolutionscol.com', nombre: 'Intruso' },
    })
    expect(r.statusCode).toBe(403)
  })

  it('el líder cargado se reconoce en su primer login, con dos permisos exactos', async () => {
    // Mayúsculas y espacios a propósito: el email se normaliza al cargarlo.
    const alta = await cargarLider('  Lider1@KaizenSolutionsCol.com ', 'Líder Uno')
    expect(alta.statusCode).toBe(200)

    const lider = await autenticar('sub-lider1')
    expect(lider).not.toBeNull()

    // Sumar y ver el panorama. Ni leer notas, ni revisar, ni administrar.
    expect(await permisosDe(lider!)).toEqual(['analytics.aggregate', 'records.capture'])
  })

  it('no se puede cargar dos veces el mismo email vigente', async () => {
    const r = await cargarLider('lider1@kaizensolutionscol.com', 'Otra vez')
    expect(r.statusCode).toBe(409)
  })
})

describe('lo que suma el líder', () => {
  let lider: Sesion

  beforeAll(async () => {
    await cargarLider('lider2@kaizensolutionscol.com', 'Líder Dos')
    lider = (await autenticar('sub-lider2'))!
  })

  async function total(sesion: Sesion): Promise<number> {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion),
      payload: { plan: { template: 'records.total', filters: [], limit: 10 }, idempotencyKey: crypto.randomUUID() },
    })
    return r.json().result.rows[0]?.value ?? 0
  }

  it('cuenta en el panorama apenas se suma, sin esperar la aprobación', async () => {
    const antes = await total(lider)

    const alta = await app.inject({
      method: 'POST',
      url: '/v1/capture/records',
      headers: cabeceras(lider),
      payload: {
        idempotencyKey: crypto.randomUUID(),
        fullName: 'Persona Sumada Por Lider',
        documentNumber: '91000001',
        municipalityCode: '25175',
        gender: 'prefiere_no_decir',
        relationship: 'vecindad',
        usesWhatsapp: true,
        consentGiven: true,
        consentTextVersion: CONSENT_TEXT_VERSION,
        evidenceKind: 'formulario_papel',
        evidenceRef: 'planilla-1',
      },
    })
    expect(alta.statusCode).toBe(200)

    const envio = await app.inject({
      method: 'POST',
      url: `/v1/capture/records/${alta.json().id}/submit`,
      headers: cabeceras(lider),
    })
    expect(envio.statusCode).toBe(200)

    expect(await total(lider)).toBe(antes + 1)
  })

  it('queda a su nombre: su contador propio lo refleja', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/capture/mias', headers: cabeceras(lider) })
    expect(r.statusCode).toBe(200)
    expect(r.json().total).toBe(1)
  })

  it('el administrador ve cuánto sumó cada líder', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/lideres', headers: cabeceras(admin) })
    const dos = r.json().lideres.find((l: { email: string }) => l.email === 'lider2@kaizensolutionscol.com')
    expect(dos.estado).toBe('active')
    expect(dos.sumadas).toBe(1)
  })

  it('los campos nuevos son obligatorios en las altas', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/capture/records',
      headers: cabeceras(lider),
      payload: {
        idempotencyKey: crypto.randomUUID(),
        fullName: 'Sin Genero',
        documentNumber: '91000002',
        municipalityCode: '25175',
        consentGiven: true,
        consentTextVersion: CONSENT_TEXT_VERSION,
        evidenceKind: 'formulario_papel',
        evidenceRef: 'planilla-2',
      },
    })
    expect(r.statusCode).toBe(400)
  })
})

describe('revocar', () => {
  it('le quita los permisos en la siguiente consulta, sin tocar otra tabla', async () => {
    await cargarLider('lider3@kaizensolutionscol.com', 'Líder Tres')
    const lider = (await autenticar('sub-lider3'))!
    expect(await permisosDe(lider)).toContain('records.capture')

    const listado = await app.inject({ method: 'GET', url: '/v1/lideres', headers: cabeceras(admin) })
    const id = listado.json().lideres.find((l: { email: string }) => l.email === 'lider3@kaizensolutionscol.com').id

    const baja = await app.inject({
      method: 'POST',
      url: `/v1/lideres/${id}/revocar`,
      headers: cabeceras(admin),
    })
    expect(baja.statusCode).toBe(200)

    // Misma sesión, siguiente pedido: ya no puede sumar.
    expect(await permisosDe(lider)).toEqual([])
    const intento = await app.inject({ method: 'GET', url: '/v1/capture/form', headers: cabeceras(lider) })
    expect(intento.statusCode).toBe(403)
  })
})

describe('la identidad de login no puede darse acceso sola', () => {
  // Se ejercita la POLÍTICA directamente, como `kaizen_auth`: si solo el
  // código de login lo impidiera, cualquier otro camino con esa identidad
  // podría crear membresías.
  async function comoAuth<T>(fn: (c: TestEnv['owner']) => Promise<T>): Promise<T> {
    await env.owner.query('begin')
    try {
      await env.owner.query('set local role kaizen_auth')
      return await fn(env.owner)
    } finally {
      await env.owner.query('rollback')
    }
  }

  it('no puede crear una membresía sin registro de líder ni invitación', async () => {
    await expect(
      comoAuth((c) =>
        c.query(`insert into memberships (tenant_id, user_id, role) values ($1, $2, 'administrador')`, [
          F.tenantB,
          F.userA1,
        ]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('no puede escribir permisos: los de un líder se derivan, no se guardan', async () => {
    await expect(
      comoAuth((c) =>
        c.query(
          `insert into purpose_grants (tenant_id, purpose_id, user_id, permission) values ($1, $2, $3, 'tenant.admin')`,
          [F.tenantA, F.purposeA, F.userA1],
        ),
      ),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('el primer administrador de producción', () => {
  // No hay otra forma de que alguien administre una base recién creada: las
  // invitaciones por token nunca viajan en el callback de Google. El deploy
  // carga el email del administrador con las credenciales de migración.
  it('entra y recibe todos los permisos si lo cargó el deploy', async () => {
    await env.owner.query(
      `insert into leader_registry (tenant_id, purpose_id, email, display_name, rol)
       values ($1, $2, 'gerencia-prueba@kaizensolutionscol.com', 'Gerencia', 'administrador')`,
      [F.tenantA, F.purposeA],
    )

    const gerencia = await autenticar('sub-gerencia-prueba')
    expect(gerencia).not.toBeNull()
    expect(await permisosDe(gerencia!)).toEqual(
      [
        'analyses.save',
        'analyses.share',
        'analytics.aggregate',
        'notes.read',
        'records.capture',
        'records.read_sensitive',
        'records.review',
        'sources.manage',
        'tenant.admin',
      ].sort(),
    )
  })

  it('la aplicación NO puede crear un administrador, aunque quien pida sea administrador', async () => {
    // La API inserta con `kaizen_app`: la política solo le deja crear líderes.
    await env.owner.query('begin')
    try {
      await env.owner.query('set local role kaizen_app')
      await env.owner.query(`select set_config('app.tenant_id', $1, true)`, [F.tenantA])
      await expect(
        env.owner.query(
          `insert into leader_registry (tenant_id, purpose_id, email, display_name, rol)
           values ($1, $2, 'escalada@kaizensolutionscol.com', 'Escalada', 'administrador')`,
          [F.tenantA, F.purposeA],
        ),
      ).rejects.toThrow(/row-level security/)
    } finally {
      await env.owner.query('rollback')
    }
  })
})

describe('solo cuentas Kaizen', () => {
  it('no deja registrar un Gmail como líder', async () => {
    const r = await cargarLider('lider@gmail.com', 'Líder Gmail')
    expect(r.statusCode).toBe(400)
  })

  it('rechaza un token Gmail verificado aunque el email ya figure en el registro', async () => {
    await env.owner.query(
      `insert into leader_registry (tenant_id, purpose_id, email, display_name)
       values ($1, $2, 'lider-antiguo@gmail.com', 'Líder anterior')`,
      [F.tenantA, F.purposeA],
    )

    try {
      assertIdentityAcceptable({
        issuer: 'https://accounts.google.com',
        subject: 'google-sub-lider-gmail',
        emailDisplay: 'lider-antiguo@gmail.com',
        emailVerified: true,
        hostedDomain: null,
      })
      throw new Error('el Gmail debio rechazarse')
    } catch (error) {
      expect(error).toMatchObject({ code: 'UNAUTHENTICATED', internalDetail: 'dominio no permitido' })
    }

    expect(() =>
      assertIdentityAcceptable({
        issuer: 'https://accounts.google.com',
        subject: 'google-sub-alias-externo',
        emailDisplay: 'alias@gmail.com',
        emailVerified: true,
        hostedDomain: 'kaizensolutionscol.com',
      }),
    ).toThrow()
  })

  it('rechaza una sesión Gmail creada antes de activar la restricción', async () => {
    const { rows } = await env.owner.query<{ id: string }>(
      `insert into users (issuer, subject, email_display)
       values ('https://accounts.google.com', 'google-sub-gmail-previo', 'previo@gmail.com')
       returning id`,
    )
    const userId = rows[0]!.id
    const sesion = await withAuthTransaction((client) => createSession(client, userId), userId)

    const r = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { cookie: `kaizen_session=${sesion.token}` },
    })
    expect(r.statusCode).toBe(401)
  })
})
