import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { F, seedRegistros } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Rutas que alimentan la pantalla de captura y la cola de revision.
 *
 * Lo que se comprueba aca no es que la pantalla se vea bien, sino que la
 * separacion entre capturar y revisar exista DEL LADO DEL SERVIDOR. La
 * interfaz oculta los botones, pero los endpoints se llaman con `curl`: si el
 * unico control fuera visual, no habria control.
 */
let env: TestEnv
let app: FastifyInstance

interface Sesion {
  cookies: string
  csrf: string
}

const sesiones = new Map<string, Sesion>()

async function autenticar(subject: string): Promise<Sesion> {
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
  if (!sesion) throw new Error(`no se pudo autenticar ${subject}`)

  return {
    cookies: `kaizen_session=${sesion.value}; kaizen_csrf=${csrf?.value ?? ''}`,
    csrf: csrf?.value ?? '',
  }
}

const como = (s: string) => sesiones.get(s)!

function cabeceras(sesion: Sesion) {
  return {
    cookie: sesion.cookies,
    'x-csrf-token': sesion.csrf,
    'x-tenant-id': F.tenantA,
    'x-purpose-id': F.purposeA,
  }
}

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

  for (const cuenta of ['sub-a1', 'sub-a2', 'sub-a3', 'sub-admin']) {
    sesiones.set(cuenta, await autenticar(cuenta))
  }
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

describe('GET /v1/capture/form', () => {
  it('quien captura recibe el texto de consentimiento vigente y los municipios', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/capture/form',
      headers: cabeceras(como('sub-a3')),
    })

    expect(r.statusCode).toBe(200)
    const cuerpo = r.json()

    // La version importa: es la que queda guardada junto al registro. Sin
    // version no hay forma de saber que texto acepto la persona.
    expect(cuerpo.consentimiento.version).toBeTruthy()
    expect(cuerpo.consentimiento.texto.length).toBeGreaterThan(20)

    // Los 116 municipios de Cundinamarca. Si el catalogo llegara vacio, el
    // formulario seguiria abriendo y no se podria cargar a nadie.
    expect(cuerpo.municipios.length).toBe(116)
    expect(cuerpo.municipios.every((m: { code: string }) => m.code.startsWith('25'))).toBe(true)

    expect(cuerpo.evidencias.length).toBeGreaterThan(0)
  })

  it('un lector sin permiso de captura no puede abrir el formulario', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/capture/form',
      headers: cabeceras(como('sub-a1')),
    })

    expect(r.statusCode).toBe(403)
  })
})

describe('GET /v1/capture/pending', () => {
  it('exige el permiso de revision, que es distinto del de captura', async () => {
    // A3 captura. Que pueda cargar no le da derecho a aprobar.
    const r = await app.inject({
      method: 'GET',
      url: '/v1/capture/pending',
      headers: cabeceras(como('sub-a3')),
    })

    expect(r.statusCode).toBe(403)
  })

  it('el revisor ve la cola', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/capture/pending',
      headers: cabeceras(como('sub-a2')),
    })

    expect(r.statusCode).toBe(200)
    expect(Array.isArray(r.json().pendientes)).toBe(true)
  })

  it('marca como no revisables los registros que cargo el propio revisor', async () => {
    // Se fabrica un registro capturado POR el revisor. La cola se lo tiene que
    // mostrar -esconderlo haria pensar que ya fue revisado- pero marcado como
    // ajeno a su decision.
    const id = 'b9000001-0000-4000-8000-000000000001'
    await env.owner.query(`alter table person_records no force row level security`)
    await env.owner.query(
      `insert into person_records
         (id, tenant_id, purpose_id, full_name, document_number, municipality_code,
          captured_by, status)
       values ($1,$2,$3,'Cargado Por El Revisor','99000001','25175',$4,'submitted')
       on conflict (id) do nothing`,
      [id, F.tenantA, F.purposeA, F.userA2],
    )
    await env.owner.query(`alter table person_records force row level security`)

    const r = await app.inject({
      method: 'GET',
      url: '/v1/capture/pending',
      headers: cabeceras(como('sub-a2')),
    })

    expect(r.statusCode).toBe(200)
    const fila = r.json().pendientes.find((p: { id: string }) => p.id === id)
    expect(fila).toBeDefined()
    expect(fila.puedeRevisar).toBe(false)
  })
})

/**
 * El compilador de planes ya tiene pruebas de lo que RECHAZA (campo fuera de la
 * lista, operador inventado, payload de inyeccion). Lo que faltaba es que un
 * filtro aceptado efectivamente FILTRE: de eso depende el tablero, y un filtro
 * que se ignora no falla — devuelve el total y parece correcto.
 */
describe('filtros del tablero', () => {
  const correr = async (filters: unknown[]) =>
    app.inject({
      method: 'POST',
      url: '/v1/analytics/runs',
      headers: cabeceras(como('sub-a2')),
      payload: {
        plan: { template: 'records.count_by_municipality', filters, limit: 200 },
        idempotencyKey: crypto.randomUUID(),
      },
    })

  it('sin filtros devuelve todos los municipios con registros', async () => {
    const r = await correr([])
    expect(r.statusCode).toBe(200)
    expect(r.json().result.rows.length).toBeGreaterThan(1)
  })

  it('un filtro por municipio deja exactamente ese grupo', async () => {
    const todos = (await correr([])).json().result.rows as Array<{
      key: string
      value: number | null
      suppressed: boolean
    }>
    const visible = todos.find((f) => !f.suppressed)
    expect(visible).toBeDefined()

    const r = await correr([
      { field: 'municipality_code', op: 'eq', values: [visible!.key] },
    ])

    expect(r.statusCode).toBe(200)
    const filas = r.json().result.rows
    expect(filas).toHaveLength(1)
    expect(filas[0].key).toBe(visible!.key)
    // Y el valor es el MISMO que sin filtrar: filtrar por un grupo no puede
    // cambiar cuanto vale ese grupo.
    expect(filas[0].value).toBe(visible!.value)
  })

  it('la supresion se sigue aplicando con un filtro puesto', async () => {
    // Acotar la consulta a un grupo chico no puede ser la forma de revelar su
    // cifra: es exactamente el ataque que la supresion tiene que resistir.
    const todos = (await correr([])).json().result.rows as Array<{
      key: string
      suppressed: boolean
    }>
    const suprimido = todos.find((f) => f.suppressed)

    if (!suprimido) {
      // Si los fixtures cambian y ya no hay grupos chicos, la prueba no puede
      // pasar en silencio fingiendo que verifico algo.
      throw new Error('los fixtures ya no tienen ningun grupo por debajo del umbral')
    }

    const r = await correr([
      { field: 'municipality_code', op: 'eq', values: [suprimido.key] },
    ])

    expect(r.statusCode).toBe(200)
    const fila = r.json().result.rows[0]
    expect(fila.suppressed).toBe(true)
    // `null`, jamas un numero y jamas 0.
    expect(fila.value).toBeNull()
  })

  it('un filtro por franja etaria no altera el total de los demas grupos', async () => {
    const r = await correr([{ field: 'age_band', op: 'eq', values: ['30-44'] }])
    expect(r.statusCode).toBe(200)

    const filas = r.json().result.rows as Array<{ value: number | null }>
    const sinFiltro = (await correr([])).json().result.rows as Array<{ value: number | null }>

    const suma = (f: Array<{ value: number | null }>) =>
      f.reduce((acc, x) => acc + (x.value ?? 0), 0)

    // Filtrar solo puede quitar, nunca sumar.
    expect(suma(filas)).toBeLessThanOrEqual(suma(sinFiltro))
  })
})

describe('el territorio lo valida la base', () => {
  // El formulario solo ofrece los 116, pero eso no es un control: el endpoint
  // se llama con curl. Un codigo inexistente se contaba en el total sin tener
  // celda en el mapa, y el territorio dejaba de cerrar sin ningun error.
  for (const [codigo, motivo] of [
    ['25999', 'no existe'],
    ['11001', 'Bogota, excluida a proposito del proyecto'],
  ] as const) {
    it(`rechaza el municipio ${codigo} (${motivo})`, async () => {
      await env.owner.query(`alter table person_records no force row level security`)
      try {
        await expect(
          env.owner.query(
            `insert into person_records
               (tenant_id, purpose_id, full_name, document_number, municipality_code, captured_by, status)
             values ($1,$2,'Persona Fuera del Territorio','88000001',$3,$4,'draft')`,
            [F.tenantA, F.purposeA, codigo, F.userA3],
          ),
        ).rejects.toThrow(/person_records_municipio_del_catalogo/)
      } finally {
        await env.owner.query(`alter table person_records force row level security`)
      }
    })
  }
})
