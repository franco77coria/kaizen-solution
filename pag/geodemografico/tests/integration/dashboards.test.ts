import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { withAuthorizedTransaction } from '@kaizen/db'
import { F, seedRegistros } from '@kaizen/fixtures'
import { unaPasada } from '../../apps/worker/src/ciclo.js'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Etapa 4 — dashboards publicados desde SUMA (/app/suma/<id>).
 *
 * Lo que tiene que valer: privado por defecto; "espacio" lo ven solo los del
 * mismo espacio; solo el autor lo cambia o lo borra; vencido no se muestra; y
 * ningun numero lo escribe el modelo (los datos son fotos de consultas
 * cerradas, con los grupos chicos como n/d).
 */
let env: TestEnv
let app: FastifyInstance

interface Sesion {
  cookies: string
  csrf: string
}
const sesiones = new Map<string, Sesion>()

async function autenticar(subject: string): Promise<Sesion> {
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
  if (!sesion) throw new Error(`no se pudo iniciar sesion como ${subject}`)
  return { cookies: `kaizen_session=${sesion.value}; kaizen_csrf=${csrf?.value ?? ''}`, csrf: csrf?.value ?? '' }
}

const como = (s: string) => sesiones.get(s)!
const deA = (s: string) => ({
  cookie: como(s).cookies,
  'x-csrf-token': como(s).csrf,
  'x-tenant-id': F.tenantA,
  'x-purpose-id': F.purposeA,
})

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

  const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
  for (const cuenta of ['sub-a1', 'sub-a2', 'sub-b1']) {
    reiniciarAdmision()
    sesiones.set(cuenta, await autenticar(cuenta))
  }
  reiniciarAdmision()
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

/** Pregunta en una conversacion nueva y devuelve el id del mensaje de respuesta. */
async function responder(cuenta: string, contenido: string, clave: string): Promise<string> {
  const conv = await app.inject({ method: 'POST', url: '/v1/conversations', headers: deA(cuenta), payload: {} })
  const id = conv.json().id as string
  const r = await app.inject({
    method: 'POST',
    url: `/v1/conversations/${id}/messages`,
    headers: deA(cuenta),
    payload: { content: contenido, idempotencyKey: clave },
  })
  expect(r.statusCode, r.body).toBe(200)
  const detalle = await app.inject({ method: 'GET', url: `/v1/conversations/${id}`, headers: deA(cuenta) })
  const asistente = detalle.json().messages.find((m: { role: string }) => m.role === 'assistant')
  return asistente.id as string
}

async function crear(cuenta: string, messageId: string) {
  return app.inject({ method: 'POST', url: '/v1/dashboards', headers: deA(cuenta), payload: { messageId } })
}

describe('crear un dashboard desde una respuesta', () => {
  let idDatos = ''

  it('desde una respuesta de datos: suma los indicadores del espacio, sin resumen del modelo', async () => {
    const mensaje = await responder('sub-a2', '¿Cuántas personas hay por municipio?', 'dash-0001')
    const r = await crear('sub-a2', mensaje)
    expect(r.statusCode, r.body).toBe(200)
    idDatos = r.json().id

    const ver = await app.inject({ method: 'GET', url: `/v1/dashboards/${idDatos}`, headers: deA('sub-a2') })
    expect(ver.statusCode).toBe(200)
    const d = ver.json()
    expect(d.visibilidad).toBe('privado')
    expect(d.esMio).toBe(true)
    expect(d.documento.resumen).toBeNull()
    const plantillas = d.documento.datos.map((x: { template: string }) => x.template)
    expect(plantillas[0]).toBe('records.count_by_municipality')
    expect(plantillas).toContain('records.total')
    // Un grupo chico es n/d, nunca cero.
    for (const datos of d.documento.datos) {
      for (const fila of datos.resultado.rows.filter((f: { suppressed: boolean }) => f.suppressed)) {
        expect(fila.value).toBeNull()
      }
    }
    // Vence a los 5 dias.
    const dias = (Date.parse(d.venceEn) - Date.parse(d.creadoEn)) / 86_400_000
    expect(dias).toBeCloseTo(5, 1)
  })

  it('desde una respuesta de notas: resumen validado contra las citas', async () => {
    const mensaje = await responder(
      'sub-a1',
      '¿Qué presupuesto se aprobó para la pavimentación del barrio centro?',
      'dash-0002',
    )
    const r = await crear('sub-a1', mensaje)
    expect(r.statusCode, r.body).toBe(200)
    const d = (
      await app.inject({ method: 'GET', url: `/v1/dashboards/${r.json().id}`, headers: deA('sub-a1') })
    ).json()
    expect(d.documento.resumen.texto).toContain('420 millones')
    expect(d.documento.resumen.fuentes.length).toBeGreaterThan(0)
    expect(d.documento.datos).toEqual([])
  })

  it('no se puede crear desde un mensaje ajeno', async () => {
    const ajeno = await responder('sub-a2', '¿Cuántas personas hay en total?', 'dash-0003')
    const r = await crear('sub-a1', ajeno)
    expect(r.statusCode).toBe(404)
  })

  describe('visibilidad y permisos', () => {
    it('privado: otro miembro del espacio no lo ve ni lo lista', async () => {
      const ver = await app.inject({ method: 'GET', url: `/v1/dashboards/${idDatos}`, headers: deA('sub-a1') })
      expect(ver.statusCode).toBe(404)
      const lista = await app.inject({ method: 'GET', url: '/v1/dashboards', headers: deA('sub-a1') })
      expect(lista.json().dashboards.map((x: { id: string }) => x.id)).not.toContain(idDatos)
    })

    it('solo el autor cambia la visibilidad', async () => {
      const ajeno = await app.inject({
        method: 'PATCH',
        url: `/v1/dashboards/${idDatos}`,
        headers: deA('sub-a1'),
        payload: { visibilidad: 'espacio' },
      })
      expect(ajeno.statusCode).toBe(404)

      const propio = await app.inject({
        method: 'PATCH',
        url: `/v1/dashboards/${idDatos}`,
        headers: deA('sub-a2'),
        payload: { visibilidad: 'espacio' },
      })
      expect(propio.statusCode).toBe(200)
    })

    it('"espacio": lo ve otro miembro del mismo espacio, sin poder borrarlo', async () => {
      const ver = await app.inject({ method: 'GET', url: `/v1/dashboards/${idDatos}`, headers: deA('sub-a1') })
      expect(ver.statusCode).toBe(200)
      expect(ver.json().esMio).toBe(false)

      const borrar = await app.inject({ method: 'DELETE', url: `/v1/dashboards/${idDatos}`, headers: deA('sub-a1') })
      expect(borrar.statusCode).toBe(404)
    })

    it('nunca entre espacios, aunque sea visible', async () => {
      const r = await app.inject({
        method: 'GET',
        url: `/v1/dashboards/${idDatos}`,
        headers: {
          cookie: como('sub-b1').cookies,
          'x-csrf-token': como('sub-b1').csrf,
          'x-tenant-id': F.tenantB,
          'x-purpose-id': F.purposeB,
        },
      })
      expect(r.statusCode).toBe(404)
    })
  })

  it('vencido no se muestra, y la pasada diaria lo borra', async () => {
    await env.owner.query(
      `update dashboards set created_at = now() - interval '6 days', expires_at = now() - interval '1 day'
        where id = $1`,
      [idDatos],
    )
    const ver = await app.inject({ method: 'GET', url: `/v1/dashboards/${idDatos}`, headers: deA('sub-a2') })
    expect(ver.statusCode).toBe(404)

    await unaPasada()
    const quedan = await env.owner.query(`select 1 from dashboards where id = $1`, [idDatos])
    expect(quedan.rowCount).toBe(0)
  })

  it('la app no puede estirar la vigencia ni cambiar el contenido', async () => {
    const mensaje = await responder('sub-a2', '¿Cuántas personas hay en total?', 'dash-0004')
    const id = (await crear('sub-a2', mensaje)).json().id
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA, userId: F.userA2, purposeId: F.purposeA }, (c) =>
        c.query(`update dashboards set expires_at = now() + interval '30 days' where id = $1`, [id]),
      ),
    ).rejects.toThrow(/permission denied/)
  })
})
