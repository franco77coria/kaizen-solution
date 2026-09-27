import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { F } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Tickets 05 y P1 — vinculacion de cuentas de Google.
 *
 * Estas pruebas NO llaman a Google. Lo que verifican es el control de acceso
 * y la maquinaria del flujo: quien puede iniciar cada vinculacion, que pasa si
 * falta configuracion, y que un callback no se pueda forzar. El canje real de
 * codigo solo se puede probar con un proyecto OAuth (ver runbook).
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

  process.env['APP_ENV'] = 'local'
  process.env['OIDC_PROVIDER'] = 'fake'
  process.env['OIDC_ALLOWED_HD'] = 'kaizensolutionscol.com'
  process.env['SESSION_SECRET'] = 'clave-de-prueba-suficientemente-larga'
  process.env['TOKEN_VAULT_KEY'] = Buffer.alloc(32, 7).toString('base64')
  process.env['LLM_PROVIDER'] = 'fake'
  process.env['EMBEDDINGS_PROVIDER'] = 'fake'

  // Credenciales OAuth de mentira: alcanzan para llegar hasta la URL de
  // autorizacion, que es lo que se comprueba. El canje con Google no se toca.
  process.env['GOOGLE_READER_CLIENT_ID'] = 'lector.apps.googleusercontent.com'
  process.env['GOOGLE_READER_CLIENT_SECRET'] = 'secreto-lector'
  process.env['GOOGLE_READER_REDIRECT_URI'] = 'http://localhost:3001/v1/google/callback'
  process.env['GOOGLE_INGESTOR_CLIENT_ID'] = 'ingestor.apps.googleusercontent.com'
  process.env['GOOGLE_INGESTOR_CLIENT_SECRET'] = 'secreto-ingestor'
  process.env['GOOGLE_INGESTOR_REDIRECT_URI'] =
    'http://localhost:3001/v1/source-connections/callback'

  const { buildApp } = await import('../../apps/api/src/app.js')
  app = await buildApp()
  await app.ready()

  for (const cuenta of ['sub-a1', 'sub-a2', 'sub-a3', 'sub-admin', 'sub-b1']) {
    sesiones.set(cuenta, await autenticar(cuenta))
  }
}, 120_000)

afterAll(async () => {
  await app?.close()
  await env?.close()
})

describe('quien puede iniciar cada vinculacion', () => {
  it('un lector conecta SU propia cuenta', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/google/connect',
      headers: cabeceras(como('sub-a1')),
      payload: {},
    })

    expect(r.statusCode).toBe(200)
    const url = new URL(r.json().authorizationUrl)
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    // `offline` + `consent` es lo unico que garantiza un refresh token.
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    // PKCE.
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()
    // El scope mas acotado, no `drive` completo.
    expect(url.searchParams.get('scope')).toContain('drive.meet.readonly')
    expect(url.searchParams.get('scope')).not.toContain('auth/drive ')
    // Cliente del LECTOR, no del ingestor.
    expect(url.searchParams.get('client_id')).toContain('lector')
  })

  it('un lector NO puede conectar la fuente compartida', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/source-connections/connect',
      headers: cabeceras(como('sub-a1')),
      payload: {},
    })
    // Conectar la ingesta habilita lectura para todo el espacio: exige
    // permiso administrativo, no solo notes.read.
    expect(r.statusCode).toBe(403)
  })

  it('un administrador de fuentes SI puede, y usa el cliente del ingestor', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/v1/source-connections/connect',
      headers: cabeceras(como('sub-admin')),
      payload: {},
    })

    expect(r.statusCode).toBe(200)
    const url = new URL(r.json().authorizationUrl)
    expect(url.searchParams.get('client_id')).toContain('ingestor')
  })

  it('sin sesion no se puede iniciar ninguna vinculacion', async () => {
    for (const ruta of ['/v1/google/connect', '/v1/source-connections/connect']) {
      const r = await app.inject({ method: 'POST', url: ruta, payload: {} })
      expect(r.statusCode).toBe(401)
    }
  })

  it('sin CSRF tampoco', async () => {
    const sesion = como('sub-a1')
    const r = await app.inject({
      method: 'POST',
      url: '/v1/google/connect',
      headers: {
        cookie: sesion.cookies,
        'x-tenant-id': F.tenantA,
        'x-purpose-id': F.purposeA,
      },
      payload: {},
    })
    expect(r.statusCode).toBe(403)
  })
})

describe('el callback no se puede forzar', () => {
  async function iniciar(ruta: string, sesion: Sesion) {
    const r = await app.inject({
      method: 'POST',
      url: ruta,
      headers: cabeceras(sesion),
      payload: {},
    })
    const cookie = r.cookies.find((c) => c.name === 'kaizen_drive_oauth')
    const state = new URL(r.json().authorizationUrl).searchParams.get('state') ?? ''
    return { cookieFlujo: cookie?.value ?? '', state }
  }

  it('sin un flujo en curso, el callback se rechaza', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/google/callback?code=cualquiera&state=inventado',
      headers: { cookie: como('sub-a1').cookies },
    })
    expect(r.statusCode).toBe(401)
  })

  it('un state que no coincide se rechaza', async () => {
    const { cookieFlujo } = await iniciar('/v1/google/connect', como('sub-a1'))

    const r = await app.inject({
      method: 'GET',
      url: '/v1/google/callback?code=cualquiera&state=state-del-atacante',
      headers: { cookie: `${como('sub-a1').cookies}; kaizen_drive_oauth=${cookieFlujo}` },
    })
    expect(r.statusCode).toBe(401)
  })

  it('un flujo de LECTOR no puede completar una vinculacion de INGESTOR', async () => {
    // Es la prueba central de la separacion: si un callback de lector pudiera
    // cerrar un flujo de ingesta, la identidad que lee para todo el espacio
    // quedaria establecida con un permiso que solo habilita lectura propia.
    const { cookieFlujo, state } = await iniciar('/v1/google/connect', como('sub-a1'))

    const r = await app.inject({
      method: 'GET',
      url: `/v1/source-connections/callback?code=cualquiera&state=${encodeURIComponent(state)}`,
      headers: { cookie: `${como('sub-a1').cookies}; kaizen_drive_oauth=${cookieFlujo}` },
    })

    expect(r.statusCode).toBe(401)
  })

  it('un flujo corrupto se rechaza sin romper el servidor', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/google/callback?code=x&state=y',
      headers: { cookie: `${como('sub-a1').cookies}; kaizen_drive_oauth=no-es-json` },
    })
    expect(r.statusCode).toBe(401)
  })
})

describe('desconexion', () => {
  it('sin conexion activa devuelve 404, no un error interno', async () => {
    const r = await app.inject({
      method: 'DELETE',
      url: '/v1/google/connection',
      headers: cabeceras(como('sub-a1')),
    })
    expect(r.statusCode).toBe(404)
  })

  it('un lector no puede desconectar la fuente compartida', async () => {
    const r = await app.inject({
      method: 'DELETE',
      url: `/v1/source-connections/${F.connA}`,
      headers: cabeceras(como('sub-a1')),
    })
    expect(r.statusCode).toBe(403)
  })

  it('desconectar la fuente retira los documentos de TODO el espacio', async () => {
    const antes = await env.owner.query<{ n: string }>(
      `select count(*) n from documents where corpus_id = $1 and status = 'active'`,
      [F.corpusA],
    )
    expect(Number(antes.rows[0]?.n)).toBeGreaterThan(0)

    const r = await app.inject({
      method: 'DELETE',
      url: `/v1/source-connections/${F.connA}`,
      headers: cabeceras(como('sub-admin')),
    })
    expect(r.statusCode).toBe(200)
    // No habia refresh token guardado en el fixture: la revocacion remota no
    // se intenta, pero la desconexion local ocurre igual.
    expect(r.json().revocadoEnProveedor).toBe(false)

    const despues = await env.owner.query<{ n: string }>(
      `select count(*) n from documents where corpus_id = $1 and status = 'active'`,
      [F.corpusA],
    )
    expect(Number(despues.rows[0]?.n)).toBe(0)

    const lapida = await env.owner.query<{ reason: string }>(
      `select reason from deletion_tombstones where resource_kind = 'source_connection'`,
    )
    expect(lapida.rows[0]?.reason).toBe('access_revoked')
  })
})

describe('sin configuracion de OAuth', () => {
  it('responde 503 con el motivo, no un 500', async () => {
    const guardado = process.env['GOOGLE_READER_CLIENT_ID']
    delete process.env['GOOGLE_READER_CLIENT_ID']

    try {
      const r = await app.inject({
        method: 'POST',
        url: '/v1/google/connect',
        headers: cabeceras(como('sub-a2')),
        payload: {},
      })
      // Falta de configuracion es un estado esperado mientras no exista el
      // proyecto de Google, no un error inesperado.
      expect(r.statusCode).toBe(503)
      expect(r.json().error.code).toBe('PROVIDER_UNAVAILABLE')
    } finally {
      process.env['GOOGLE_READER_CLIENT_ID'] = guardado
    }
  })
})

describe('reconexion', () => {
  it('una conexion revocada NO se puede reactivar', async () => {
    const { withAuthorizedTransaction } = await import('@kaizen/db')

    await env.owner.query(
      `update source_connections set status = 'revoked' where id = $1`,
      [F.connB],
    )

    // Reactivar dejaria correr un trabajo en vuelo de la conexion anterior con
    // una autorizacion que ya no rige. Reconectar crea una fila NUEVA con una
    // generacion mayor, que es lo que invalida esos trabajos.
    await expect(
      withAuthorizedTransaction(
        'app',
        { tenantId: F.tenantB, userId: F.userB1, purposeId: F.purposeB },
        async (c) => {
          await c.query(`update source_connections set status = 'active' where id = $1`, [
            F.connB,
          ])
        },
      ),
    ).rejects.toThrow(/no se reactiva/)
  })

  it('la aplicacion no puede borrar una conexion, solo revocarla', async () => {
    const { withAuthorizedTransaction } = await import('@kaizen/db')

    await expect(
      withAuthorizedTransaction(
        'app',
        { tenantId: F.tenantB, userId: F.userB1, purposeId: F.purposeB },
        async (c) => {
          await c.query(`delete from source_connections where id = $1`, [F.connB])
        },
      ),
    ).rejects.toThrow(/permission denied|permiso/i)
  })
})

describe('el administrador de fuentes ve el estado de lo que administra', () => {
  /**
   * Regresion. `/v1/sources/status` exigia `notes.read`, que un administrador
   * de fuentes normalmente NO tiene. Resultado: conectaba la fuente y la
   * tarjeta le seguia diciendo "sin conexion activa", indistinguible de que
   * la conexion hubiera fallado.
   */
  it('un administrador SIN notes.read puede ver el estado', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/sources/status',
      headers: cabeceras(como('sub-admin')),
    })

    expect(r.statusCode).toBe(200)
    // Y ve ademas los detalles operativos, que el lector no ve.
    expect(r.json().operativo).toBeDefined()
  })

  it('un lector SIN sources.manage tambien puede, pero sin detalles operativos', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/v1/sources/status',
      headers: cabeceras(como('sub-a1')),
    })

    expect(r.statusCode).toBe(200)
    // Cursores, scopes y generacion siguen siendo solo para quien administra.
    expect(r.json().operativo).toBeUndefined()
  })

  it('sin ninguno de los dos permisos, 403', async () => {
    // A2 pertenece al tenant pero NO tiene concesiones en la segunda
    // finalidad. Pertenecer al espacio no abre sus finalidades.
    const r = await app.inject({
      method: 'GET',
      url: '/v1/sources/status',
      headers: { ...cabeceras(como('sub-a2')), 'x-purpose-id': F.purposeA2 },
    })
    expect(r.statusCode).toBe(403)
  })
})

describe('estado con historial de conexiones', () => {
  /**
   * Regresion. Reconectar no borra la conexion anterior: la revoca y crea una
   * nueva con generacion mayor. La consulta de estado no ordenaba, asi que con
   * historial devolvia una fila ARBITRARIA y podia informar "sin conexion
   * activa" teniendo una activa. Es la misma trampa que ordenar por una fecha
   * que empata: el resultado es plausible y equivocado.
   */
  it('informa la conexion MAS NUEVA, no una cualquiera del historial', async () => {
    // Se monta el historial: la vieja revocada y la nueva activa.
    await env.owner.query(
      `update source_connections set status = 'revoked', generation = 1 where id = $1`,
      [F.connA],
    )
    await env.owner.query(
      `insert into source_connections
         (tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, generation)
       values ($1,$2,'google_drive','sub-google','{https://www.googleapis.com/auth/drive.meet.readonly}','active',2)`,
      [F.tenantA, F.corpusA],
    )

    const r = await app.inject({
      method: 'GET',
      url: '/v1/sources/status',
      headers: cabeceras(como('sub-admin')),
    })

    expect(r.statusCode).toBe(200)
    const cuerpo = r.json()
    expect(cuerpo.connected).toBe(true)
    expect(cuerpo.operativo.generation).toBe(2)
    expect(cuerpo.operativo.proveedor).toBe('google_drive')
  })
})

describe('la curaduria sobrevive a la reconexion', () => {
  /**
   * Regresion del fallo mas caro de esta integracion.
   *
   * Cada reconexion creaba una `source_collections` nueva, y con ella un
   * manifiesto vacio: las decisiones de admision quedaban colgadas de la
   * coleccion vieja. En la practica, reconectar Drive obligaba a volver a
   * elegir los archivos uno por uno, y no fallaba: el inventario los mostraba
   * como candidatos nuevos, igual que la primera vez.
   *
   * La coleccion es la CURADURIA del espacio -que archivos puede leer el
   * asistente- y pertenece al corpus. La conexion es solo la credencial.
   */
  it('la generacion NO se reinicia al reconectar desde needs_reauth', async () => {
    const { withAuthorizedTransaction } = await import('@kaizen/db')

    await env.owner.query(
      `insert into source_connections
         (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, generation)
       values ('e1000001-0000-4000-8000-000000000001',$1,$2,'google_drive','g1','{}','needs_reauth',7)`,
      [F.tenantA, F.corpusA],
    )

    const maxima = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, corpusId: F.corpusA, userId: F.userA1, purposeId: F.purposeA },
      async (c) => {
        // Es la consulta que usa el endpoint de conexion: sobre TODO el
        // historial, no solo sobre las activas.
        const r = await c.query<{ maxima: number | null }>(
          `select max(generation) as maxima from source_connections where corpus_id = $1`,
          [F.corpusA],
        )
        return r.rows[0]?.maxima ?? 0
      },
    )

    // Mirando solo las activas daria 1 y el guardia de obsolescencia se
    // rompe: un trabajo viejo de generacion 1 volveria a considerarse vigente.
    expect(maxima).toBeGreaterThanOrEqual(7)
  })

  it('una conexion solo puede tener una coleccion', async () => {
    const { rows } = await env.owner.query<{ indexdef: string }>(
      `select indexdef from pg_indexes
        where tablename = 'source_collections'
          and indexname = 'source_collections_una_por_conexion'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.indexdef).toContain('UNIQUE')
  })

  it('las decisiones de admision se conservan por archivo, no por conexion', async () => {
    const { rows } = await env.owner.query<{ conname: string }>(
      `select conname from pg_constraint
        where conrelid = 'collection_members'::regclass
          and conname = 'collmember_destino_unico'`,
    )
    // La pertenencia es por archivo DESTINO dentro de la coleccion: un acceso
    // directo y su archivo real no pueden entrar dos veces.
    expect(rows).toHaveLength(1)
  })

  /**
   * Las tres pruebas de arriba comprueban que los indices EXISTEN, y pasaban
   * con el fallo vivo. Lo que sigue ejercita el comportamiento.
   *
   * El fallo: el corpus llego a tener DOS colecciones -el indice unico era por
   * conexion, no por corpus, asi que nada lo impedia- y el reapuntado de la
   * reconexion ponia el mismo `connection_id` en las dos. Reconectar Drive
   * devolvia 500 con una violacion de unicidad.
   */
  it('un corpus no puede tener dos colecciones', async () => {
    // Una conexion DISTINTA del mismo corpus. Si se reusara la conexion que ya
    // tiene coleccion, saltaria antes el indice por conexion y la prueba no
    // diria nada sobre el invariante nuevo. Va revocada porque un `EXCLUDE`
    // permite una sola conexion activa por corpus.
    await env.owner.query(
      `insert into source_connections
         (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, generation)
       values ('e3000001-0000-4000-8000-000000000001',$1,$2,'google_drive','g3','{}','revoked',3)`,
      [F.tenantA, F.corpusA],
    )

    const segunda = env.owner.query(
      `insert into source_collections (tenant_id, corpus_id, connection_id, allowed_mime_types)
       values ($1,$2,'e3000001-0000-4000-8000-000000000001','{application/vnd.google-apps.document}')`,
      [F.tenantA, F.corpusA],
    )

    // Que lo rechace la BASE y no una comprobacion del codigo es el punto:
    // el invariante se escapo justamente por vivir solo en el codigo.
    await expect(segunda).rejects.toThrow(/source_collections_una_por_corpus/)
  })

  it('el corpus de la coleccion no puede alejarse del de su conexion', async () => {
    // `corpus_id` es una copia del corpus de la conexion. Una copia que se
    // puede desincronizar en silencio es el mismo error, una capa mas abajo.
    const desviada = env.owner.query(
      `update source_collections set corpus_id = $1 where tenant_id = $2 and corpus_id = $3`,
      [F.corpusA2, F.tenantA, F.corpusA],
    )

    await expect(desviada).rejects.toThrow(/sourcecoll_corpus_coincide_con_conexion/)
  })

  it('reconectar reapunta la coleccion existente y conserva sus admitidos', async () => {
    const antes = await env.owner.query<{ n: string }>(
      `select count(*) as n from collection_members
        where tenant_id = $1 and collection_id = $2 and status = 'admitted'`,
      [F.tenantA, F.collectionA],
    )
    const admitidosAntes = Number(antes.rows[0]?.n ?? 0)
    expect(admitidosAntes).toBeGreaterThan(0)

    // La conexion vigente se revoca antes: un `EXCLUDE` impide dos activas en
    // el mismo corpus, que es exactamente lo que hace la reconexion real.
    await env.owner.query(
      `update source_connections set status = 'revoked'
        where tenant_id = $1 and corpus_id = $2 and status = 'active'`,
      [F.tenantA, F.corpusA],
    )

    await env.owner.query(
      `insert into source_connections
         (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, generation)
       values ('e2000001-0000-4000-8000-000000000001',$1,$2,'google_drive','g2','{}','active',9)`,
      [F.tenantA, F.corpusA],
    )

    // Exactamente la sentencia que corre la ruta de conexion.
    const reapuntada = await env.owner.query(
      `update source_collections
          set connection_id = $2
        where tenant_id = $1 and corpus_id = $3`,
      [F.tenantA, 'e2000001-0000-4000-8000-000000000001', F.corpusA],
    )

    // UNA fila. Con dos colecciones en el corpus esto alcanzaba a las dos y
    // reventaba contra el indice unico por conexion.
    expect(reapuntada.rowCount).toBe(1)

    const despues = await env.owner.query<{ n: string }>(
      `select count(*) as n from collection_members
        where tenant_id = $1 and collection_id = $2 and status = 'admitted'`,
      [F.tenantA, F.collectionA],
    )
    // La curaduria viaja con la coleccion, no con la credencial.
    expect(Number(despues.rows[0]?.n ?? 0)).toBe(admitidosAntes)
  })
})
