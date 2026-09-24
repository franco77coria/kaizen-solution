import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { F, seedRegistros } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Superficie HTTP. Se ejercita con `inject` de Fastify: recorre middlewares,
 * validacion, sesion, CSRF y rutas de verdad, sin abrir un puerto.
 *
 * Lo que se busca aca son las fugas por la puerta de adelante: pedir un
 * recurso ajeno por su ID, saltear el CSRF, o que un error distinga
 * "no existe" de "existe pero no es tuyo".
 */
let env: TestEnv
let app: FastifyInstance

interface Sesion {
  cookies: string
  csrf: string
}

/**
 * Las sesiones se cachean por cuenta. No es solo velocidad: el limitador de
 * login admite 10 intentos por ventana, y una suite que iniciara sesion en
 * cada prueba se auto-bloquearia. Que eso pase es correcto; por eso hay una
 * prueba dedicada al limite mas abajo.
 */
const sesiones = new Map<string, Sesion>()

async function iniciarSesion(subject: string): Promise<Sesion> {
  const cacheada = sesiones.get(subject)
  if (cacheada) return cacheada

  const sesion = await autenticar(subject)
  sesiones.set(subject, sesion)
  return sesion
}

async function autenticar(subject: string): Promise<Sesion> {
  const inicio = await app.inject({ method: 'GET', url: '/auth/start' })

  if (inicio.statusCode === 429) throw new Error('limite de login alcanzado')
  if (!inicio.headers.location) {
    throw new Error(`/auth/start no redirigio (status ${inicio.statusCode})`)
  }

  const cookieFlujo = inicio.cookies.find((c) => c.name === 'kaizen_oauth')
  const destino = new URL(inicio.headers.location as string)
  const state = destino.searchParams.get('state') ?? ''

  const callback = await app.inject({
    method: 'GET',
    url: `/auth/callback?code=${subject}&state=${encodeURIComponent(state)}`,
    cookies: { kaizen_oauth: cookieFlujo?.value ?? '' },
  })

  const sesion = callback.cookies.find((c) => c.name === 'kaizen_session')
  const csrf = callback.cookies.find((c) => c.name === 'kaizen_csrf')

  if (!sesion) throw new Error(`no se pudo iniciar sesion como ${subject}`)

  return {
    cookies: `kaizen_session=${sesion.value}; kaizen_csrf=${csrf?.value ?? ''}`,
    csrf: csrf?.value ?? '',
  }
}

function cabeceras(sesion: Sesion, tenantId: string, purposeId: string) {
  return {
    cookie: sesion.cookies,
    'x-csrf-token': sesion.csrf,
    'x-tenant-id': tenantId,
    'x-purpose-id': purposeId,
  }
}

beforeAll(async () => {
  env = await setupTestEnv()
  await seedRegistros(env.owner)

  process.env['APP_ENV'] = 'local'
  process.env['OIDC_PROVIDER'] = 'fake'
  process.env['OIDC_ALLOWED_HD'] = 'kaizensolutionscol.com'
  process.env['SESSION_SECRET'] = 'clave-de-prueba-suficientemente-larga'
  process.env['LLM_PROVIDER'] = 'fake'
  process.env['EMBEDDINGS_PROVIDER'] = 'fake'

  const { buildApp } = await import('../../apps/api/src/app.js')
  app = await buildApp()
  await app.ready()

  // Se autentican TODAS las cuentas de una vez y se cachean. El limitador de
  // login cuenta /auth/start y /auth/callback por separado, asi que una suite
  // que se autenticara dentro de cada prueba se bloquearia a si misma, que es
  // el comportamiento correcto del limitador.
  const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
  for (const cuenta of ['sub-a1', 'sub-a2', 'sub-a3', 'sub-admin', 'sub-b1']) {
    reiniciarAdmision()
    sesiones.set(cuenta, await autenticar(cuenta))
  }
  reiniciarAdmision()
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

describe('sonda publica', () => {
  it('no revela versiones ni dependencias', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/health/live' })
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json()).toEqual({ status: 'ok' })
  })
})

describe('autenticacion', () => {
  it('sin sesion, /v1/me responde 401', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/v1/me' })
    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('una cuenta del dominio SIN invitacion no entra', async () => {
    // Token valido, dominio correcto, email verificado: y aun asi queda fuera.
    // Pertenecer al dominio no concede membresia.
    await expect(autenticar('sub-sin-inv')).rejects.toThrow()
  })

  it('una cuenta invitada entra y ve solo sus espacios', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { cookie: sesion.cookies },
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json()
    expect(cuerpo.user.emailDisplay).toBe('a1@kaizensolutionscol.com')
    // Solo Alcaldia A. Nunca aparece Alcaldia B.
    expect(cuerpo.scopes.every((s: { tenantId: string }) => s.tenantId === F.tenantA)).toBe(true)
  })

  it('cerrar sesion revoca de verdad en el servidor', async () => {
    // Sesion propia: cerrarla no debe invalidar la cacheada del resto.
    const sesion = await autenticar('sub-a1')

    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: sesion.cookies, 'x-csrf-token': sesion.csrf },
    })

    // Reusando la MISMA cookie: si solo se hubiera borrado del navegador,
    // esta peticion seguiria funcionando.
    const despues = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { cookie: sesion.cookies },
    })
    expect(despues.statusCode).toBe(401)
  })
})

describe('aislamiento por la puerta de adelante', () => {
  it('A1 no puede operar sobre el espacio de B', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, F.tenantB, F.purposeB),
      payload: {},
    })

    expect(respuesta.statusCode).toBe(403)
    // Mensaje generico: no confirma si el tenant existe.
    expect(respuesta.json().error.message).not.toContain('Alcaldia')
  })

  it('A1 no puede operar sobre una finalidad para la que no tiene permisos', async () => {
    const sesion = await iniciarSesion('sub-a2')
    // A2 pertenece a Alcaldia A pero no tiene concesiones en purposeA2.
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, F.tenantA, F.purposeA2),
      payload: {},
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('un tenant inexistente da el MISMO error que uno ajeno', async () => {
    const sesion = await iniciarSesion('sub-a1')

    const ajeno = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, F.tenantB, F.purposeB),
      payload: {},
    })
    const inexistente = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, '00000000-0000-4000-8000-000000000000', F.purposeB),
      payload: {},
    })

    expect(ajeno.statusCode).toBe(inexistente.statusCode)
    expect(ajeno.json().error.code).toBe(inexistente.json().error.code)
  })

  it('un administrador SIN notes.read no puede abrir una conversacion', async () => {
    const sesion = await iniciarSesion('sub-admin')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      // Segunda finalidad del mismo tenant: ahi no tiene ninguna concesion.
      // Administrar no es leer, y pertenecer al espacio no abre sus
      // finalidades.
      headers: cabeceras(sesion, F.tenantA, F.purposeA2),
      payload: {},
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('un chat de A1 no es visible para A2, aunque compartan las notas', async () => {
    const a1 = await iniciarSesion('sub-a1')
    const creada = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(a1, F.tenantA, F.purposeA),
      payload: { title: 'Privada de A1' },
    })
    const id = creada.json().id as string

    const a2 = await iniciarSesion('sub-a2')
    const intento = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${id}`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
    })

    expect(intento.statusCode).toBe(404)
  })
})

describe('CSRF', () => {
  it('una escritura sin la cabecera se rechaza', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: {
        cookie: sesion.cookies,
        'x-tenant-id': F.tenantA,
        'x-purpose-id': F.purposeA,
      },
      payload: {},
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('una cabecera que no coincide con la cookie se rechaza', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: {
        ...cabeceras(sesion, F.tenantA, F.purposeA),
        'x-csrf-token': 'token-inventado-por-el-atacante',
      },
      payload: {},
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('las lecturas no exigen CSRF', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'GET',
      url: '/v1/documents',
      headers: {
        cookie: sesion.cookies,
        'x-tenant-id': F.tenantA,
        'x-purpose-id': F.purposeA,
      },
    })
    expect(respuesta.statusCode).toBe(200)
  })
})

describe('chat con evidencia', () => {
  async function nuevaConversacion(sesion: Sesion): Promise<string> {
    const conv = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {},
    })
    return conv.json().id as string
  }

  it('responde con citas y no filtra la evidencia no citada', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const id = await nuevaConversacion(sesion)

    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${id}/messages`,
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        content: 'cuanto se aprobo para la pavimentacion del barrio centro?',
        idempotencyKey: 'api-chat-0001',
      },
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json()
    expect(cuerpo.abstained).toBe(false)
    expect(cuerpo.sources.length).toBeGreaterThan(0)

    // El cuerpo NO puede traer los fragmentos recuperados completos: solo lo
    // que respalda una afirmacion citada.
    expect(respuesta.body).not.toContain('evidencia')
    expect(respuesta.body).not.toContain('CANARIO-BETA')

    for (const fuente of cuerpo.sources) {
      expect(typeof fuente.quote).toBe('string')
      expect(fuente.quote.length).toBeGreaterThan(0)
    }
  })

  it('se abstiene cuando no hay respaldo, sin inventar', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const id = await nuevaConversacion(sesion)

    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${id}/messages`,
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        content: 'cuantos kilometros de ciclovia se construyeron en Groenlandia?',
        idempotencyKey: 'api-chat-0002',
      },
    })

    const cuerpo = respuesta.json()
    expect(cuerpo.abstained).toBe(true)
    expect(cuerpo.answer).toBe('')
    expect(cuerpo.sources).toEqual([])
  })

  it('rechaza un mensaje que supera el limite de caracteres', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const id = await nuevaConversacion(sesion)

    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${id}/messages`,
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: { content: 'x'.repeat(8_001), idempotencyKey: 'api-chat-0003' },
    })

    expect(respuesta.statusCode).toBe(400)
  })

  it('no acepta escribir en una conversacion ajena por su ID', async () => {
    const a1 = await iniciarSesion('sub-a1')
    const id = await nuevaConversacion(a1)

    const a2 = await iniciarSesion('sub-a2')
    const intento = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${id}/messages`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: { content: 'hola', idempotencyKey: 'api-chat-ajeno-1' },
    })

    expect(intento.statusCode).toBe(404)
  })
})

describe('analitica', () => {
  it('un lector sin analytics.aggregate no puede ejecutar consultas', async () => {
    const sesion = await iniciarSesion('sub-a3')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.total', filters: [] },
        idempotencyKey: 'api-analitica-0001',
      },
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('un analista obtiene grupos suprimidos, nunca ceros', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.count_by_municipality', filters: [], limit: 50 },
        idempotencyKey: 'api-analitica-0002',
      },
    })

    expect(respuesta.statusCode).toBe(200)
    const { result } = respuesta.json()
    expect(result.rows.length).toBeGreaterThan(0)

    const suprimidos = result.rows.filter((r: { suppressed: boolean }) => r.suppressed)
    expect(suprimidos.length).toBeGreaterThan(0)
    for (const fila of suprimidos) {
      expect(fila.value).toBeNull()
      expect(fila.value).not.toBe(0)
    }
  })

  it('un payload de inyeccion viaja como VALOR y no rompe nada', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: {
          template: 'records.count_by_municipality',
          filters: [
            { field: 'municipality_code', op: 'eq', values: ['25175; drop table tenants'] },
          ],
        },
        idempotencyKey: 'api-analitica-0003',
      },
    })

    expect(respuesta.statusCode).toBe(200)
    const tablas = await env.owner.query<{ n: string }>(
      `select count(*) n from pg_tables where schemaname = 'public' and tablename = 'tenants'`,
    )
    expect(Number(tablas.rows[0]?.n)).toBe(1)
  })

  it('rechaza un plan con una propiedad extra', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.total', filters: [], rawSql: 'select 1' },
        idempotencyKey: 'api-analitica-0004',
      },
    })
    expect(respuesta.statusCode).toBe(400)
  })
})

describe('visualizaciones', () => {
  it('el PNG se sirve autenticado y NO a otro espacio', async () => {
    const a2 = await iniciarSesion('sub-a2')

    const run = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.count_by_municipality', filters: [], limit: 50 },
        idempotencyKey: 'api-viz-run-0001',
      },
    })
    const runId = run.json().runId as string

    const viz = await app.inject({
      method: 'POST',
      url: '/v1/visualizations',
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: { kind: 'bar', runId, title: 'Prueba', showValues: true },
    })
    expect(viz.statusCode).toBe(200)

    const cuerpo = viz.json()
    const vizId = cuerpo.id as string
    // La tabla accesible acompana SIEMPRE a la imagen.
    expect(cuerpo.table.rows.length).toBeGreaterThan(0)
    expect(cuerpo.table.footnote).toContain('n/d')
    // El markdown referencia una ruta autenticada, no una URL publica.
    expect(cuerpo.markdown).toContain(`/v1/visualizations/${vizId}/image.png`)
    expect(cuerpo.markdown).not.toContain('http')

    const propia = await app.inject({
      method: 'GET',
      url: `/v1/visualizations/${vizId}/image.png`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
    })
    expect(propia.statusCode).toBe(200)
    expect(propia.headers['content-type']).toBe('image/png')
    expect(propia.headers['cache-control']).toContain('no-store')

    const b1 = await iniciarSesion('sub-b1')
    const ajena = await app.inject({
      method: 'GET',
      url: `/v1/visualizations/${vizId}/image.png`,
      headers: cabeceras(b1, F.tenantB, F.purposeB),
    })
    // Inexistente y ajena son indistinguibles desde afuera.
    expect(ajena.statusCode).toBe(404)
  })

  it('el ChartSpec rechaza URLs y valores libres', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/visualizations',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        kind: 'bar',
        runId: '00000000-0000-4000-8000-000000000000',
        title: 'x',
        imageUrl: 'https://exfiltracion.example/pixel.png',
        values: [1, 2, 3],
      },
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it('un mapa sin cartografia cargada lo DECLARA en vez de dibujar algo', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const run = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.count_by_municipality', filters: [], limit: 50 },
        idempotencyKey: 'api-viz-mapa-0001',
      },
    })

    const viz = await app.inject({
      method: 'POST',
      url: '/v1/visualizations',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        kind: 'choropleth',
        runId: run.json().runId,
        title: 'Mapa',
        areaLevel: 'municipality',
        showValues: true,
      },
    })

    expect(viz.statusCode).toBe(200)
    // Los numeros siguen disponibles en la tabla accesible.
    expect(viz.json().table.rows.length).toBeGreaterThan(0)
  })
})

describe('catalogo territorial', () => {
  it('expone los 116 municipios y declara si falta la cartografia', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const respuesta = await app.inject({
      method: 'GET',
      url: '/v1/geography/areas',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json()
    expect(cuerpo.count).toBe(116)
    expect(cuerpo.areas.some((a: { code: string }) => a.code === '11001')).toBe(false)
    // Sin geometrias cargadas, se dice; no se devuelve un mapa vacio.
    expect(cuerpo.geometry.available).toBe(false)
  })
})

describe('limite de admision', () => {
  it('el limitador corta los intentos de login repetidos', async () => {
    const { reiniciarAdmision, RULES } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    let bloqueado = false
    for (let i = 0; i < RULES.login_inicio.max + 2; i++) {
      const respuesta = await app.inject({ method: 'GET', url: '/auth/start' })
      if (respuesta.statusCode === 429) {
        bloqueado = true
        break
      }
    }

    expect(bloqueado).toBe(true)
    reiniciarAdmision()
  })
})

describe('analisis guardados', () => {
  async function crearAnalisis(sesion: Sesion, clave: string): Promise<{ id: string; runId: string }> {
    const run = await app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        plan: { template: 'records.count_by_municipality', filters: [], limit: 50 },
        idempotencyKey: clave,
      },
    })
    if (run.statusCode !== 200) throw new Error(`run fallo ${run.statusCode}: ${run.body}`)
    const runId = run.json().runId as string

    const guardado = await app.inject({
      method: 'POST',
      url: '/v1/analyses',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: { runId, title: 'Registros por municipio' },
    })
    if (guardado.statusCode !== 200) {
      throw new Error(`guardar fallo ${guardado.statusCode}: ${guardado.body}`)
    }
    return { id: guardado.json().id as string, runId }
  }

  it('guardar exige una ejecucion PROPIA, no datos arbitrarios', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/analyses',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: { runId: '00000000-0000-4000-8000-000000000000', title: 'Inventado' },
    })
    expect(respuesta.statusCode).toBe(404)
  })

  it('un analisis es privado hasta compartirlo explicitamente', async () => {
    const a2 = await iniciarSesion('sub-a2')
    const { id } = await crearAnalisis(a2, 'analisis-privado-0001')

    const a3 = await iniciarSesion('sub-a3')
    const antes = await app.inject({
      method: 'GET',
      url: `/v1/analyses/${id}`,
      headers: cabeceras(a3, F.tenantA, F.purposeA),
    })
    expect(antes.statusCode).toBe(404)

    await app.inject({
      method: 'POST',
      url: `/v1/analyses/${id}/grants`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: { granteeUserId: F.userA3 },
    })

    const despues = await app.inject({
      method: 'GET',
      url: `/v1/analyses/${id}`,
      headers: cabeceras(a3, F.tenantA, F.purposeA),
    })
    expect(despues.statusCode).toBe(200)
    expect(despues.json().propio).toBe(false)
  })

  it('compartir NO cruza de tenant', async () => {
    const a2 = await iniciarSesion('sub-a2')
    const { id } = await crearAnalisis(a2, 'analisis-privado-0002')

    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/analyses/${id}/grants`,
      // Destinatario de la OTRA alcaldia.
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: { granteeUserId: F.userB1 },
    })
    expect(respuesta.statusCode).toBe(403)
  })

  it('refrescar reejecuta la plantilla guardada y renueva el resultado', async () => {
    const a2 = await iniciarSesion('sub-a2')
    const { id, runId } = await crearAnalisis(a2, 'analisis-refresh-0001')

    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/analyses/${id}/refresh`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: {},
    })

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json()
    // Es una ejecucion NUEVA, no la misma.
    expect(cuerpo.runId).not.toBe(runId)
    expect(cuerpo.result.rows.length).toBeGreaterThan(0)
  })

  it('quien recibio un analisis compartido NO puede refrescarlo', async () => {
    const a2 = await iniciarSesion('sub-a2')
    const { id } = await crearAnalisis(a2, 'analisis-refresh-0002')

    await app.inject({
      method: 'POST',
      url: `/v1/analyses/${id}/grants`,
      headers: cabeceras(a2, F.tenantA, F.purposeA),
      payload: { granteeUserId: F.userA3 },
    })

    const a3 = await iniciarSesion('sub-a3')
    const respuesta = await app.inject({
      method: 'POST',
      url: `/v1/analyses/${id}/refresh`,
      headers: cabeceras(a3, F.tenantA, F.purposeA),
      payload: {},
    })

    // A3 no tiene analytics.aggregate: refrescar ejecutaria una consulta con
    // permisos que no tiene.
    expect(respuesta.statusCode).toBe(403)
  })
})

describe('callback de OAuth: robustez', () => {
  /**
   * Regresion. El schema del callback era `.strict()`, asi que cualquier
   * parametro extra lo rechazaba con 400. Pero el callback lo construye
   * GOOGLE, que agrega `scope`, `authuser`, `hd` y `prompt`: con el schema
   * estricto, TODO login real habria fallado. Solo se habria visto al
   * conectar el proveedor de verdad.
   */
  it('tolera los parametros que agrega el proveedor', async () => {
    const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    const inicio = await app.inject({ method: 'GET', url: '/auth/start' })
    const cookieFlujo = inicio.cookies.find((c) => c.name === 'kaizen_oauth')
    const state = new URL(inicio.headers.location as string).searchParams.get('state') ?? ''

    const r = await app.inject({
      method: 'GET',
      url:
        `/auth/callback?code=sub-a1&state=${encodeURIComponent(state)}` +
        '&scope=openid+email&authuser=0&hd=kaizensolutionscol.com&prompt=consent',
      cookies: { kaizen_oauth: cookieFlujo?.value ?? '' },
    })

    // Con `.strict()` esto daba 400. Ahora completa el login.
    expect(r.statusCode).toBe(302)
    expect(r.cookies.find((c) => c.name === 'kaizen_session')).toBeTruthy()
  })

  /**
   * Regresion. Si la cookie del flujo caducaba (10 min), el usuario veia un
   * JSON crudo en una pantalla muerta. Ahora el flujo se reinicia solo.
   */
  it('sin cookie de flujo, reinicia el login en vez de mostrar un error', async () => {
    const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    const r = await app.inject({
      method: 'GET',
      url: '/auth/callback?code=sub-a1&state=un-state-viejo',
    })

    expect(r.statusCode).toBe(302)
    expect(r.headers.location).toBe('/auth/start?reintento=1')
  })

  it('si tras reiniciar sigue sin cookie, lo dice en vez de entrar en bucle', async () => {
    const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    const r = await app.inject({
      method: 'GET',
      url: '/auth/callback?code=sub-a1&state=un-state-viejo&reintento=1',
    })

    expect(r.statusCode).toBe(401)
    expect(r.headers.location).toBeUndefined()
  })

  /**
   * Lo que NO se reinicia solo: una cookie presente con otro state. Eso no es
   * una expiracion, es una respuesta que no corresponde al pedido, y
   * reiniciar lo taparia.
   */
  it('con cookie presente y state distinto, falla sin reiniciar', async () => {
    const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
    reiniciarAdmision()

    const inicio = await app.inject({ method: 'GET', url: '/auth/start' })
    const cookieFlujo = inicio.cookies.find((c) => c.name === 'kaizen_oauth')

    const r = await app.inject({
      method: 'GET',
      url: '/auth/callback?code=sub-a1&state=state-del-atacante',
      cookies: { kaizen_oauth: cookieFlujo?.value ?? '' },
    })

    expect(r.statusCode).toBe(401)
    expect(r.headers.location).toBeUndefined()
  })
})

describe('chat en vivo por SSE', () => {
  it('emite las etapas reales y despues la respuesta validada', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const conv = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {},
    })

    const r = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${conv.json().id}/messages/stream`,
      headers: cabeceras(sesion, F.tenantA, F.purposeA),
      payload: {
        content: 'cuanto se aprobo para la pavimentacion?',
        idempotencyKey: 'sse-prueba-0001',
      },
    })

    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toContain('text/event-stream')
    // Sin esto, un proxy con buffer retiene los eventos y deja de ser en vivo.
    expect(r.headers['x-accel-buffering']).toBe('no')

    const eventos = r.body
      .split('\n\n')
      .filter((b) => b.startsWith('event: '))
      .map((b) => b.slice(7, b.indexOf('\n')))

    // Progreso ANTES de la respuesta: ese es el punto del streaming.
    expect(eventos.indexOf('progreso')).toBeLessThan(eventos.indexOf('respuesta'))
    expect(eventos).toContain('fin')

    const bloqueRespuesta = r.body
      .split('\n\n')
      .find((b) => b.startsWith('event: respuesta'))!
    const respuesta = JSON.parse(bloqueRespuesta.slice(bloqueRespuesta.indexOf('data: ') + 6))

    // Lo que se transmite es la respuesta YA validada: con sus citas y sin la
    // evidencia cruda que el modelo no cito.
    expect(respuesta.sources.length).toBeGreaterThan(0)
    expect(r.body).not.toContain('evidencia')
    expect(r.body).not.toContain('CANARIO-BETA')
  })

  it('exige los mismos permisos que el endpoint normal', async () => {
    const sesion = await iniciarSesion('sub-a2')
    const r = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${'00000000-0000-4000-8000-000000000000'}/messages/stream`,
      // Segunda finalidad: sin concesiones.
      headers: { ...cabeceras(sesion, F.tenantA, F.purposeA), 'x-purpose-id': F.purposeA2 },
      payload: { content: 'hola', idempotencyKey: 'sse-prueba-0002' },
    })
    expect(r.statusCode).toBe(403)
  })

  it('sin CSRF no transmite', async () => {
    const sesion = await iniciarSesion('sub-a1')
    const r = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${'00000000-0000-4000-8000-000000000000'}/messages/stream`,
      headers: {
        cookie: sesion.cookies,
        'x-tenant-id': F.tenantA,
        'x-purpose-id': F.purposeA,
      },
      payload: { content: 'hola', idempotencyKey: 'sse-prueba-0003' },
    })
    expect(r.statusCode).toBe(403)
  })
})
