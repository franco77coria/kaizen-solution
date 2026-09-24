import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { F } from '@kaizen/fixtures'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * El plan exige verificar el ROL EFECTIVO, no confiar en que la migracion
 * lo dejo bien: el dueno de una tabla y ciertos roles se saltan RLS.
 */
let env: TestEnv

beforeAll(async () => {
  env = await setupTestEnv()
}, 120_000)

afterAll(async () => {
  await env?.close()
})

describe('atributos de los roles de runtime', () => {
  it('ningun rol de runtime es superusuario ni tiene BYPASSRLS', async () => {
    const { rows } = await env.owner.query<{
      rolname: string
      rolsuper: boolean
      rolbypassrls: boolean
      rolcreatedb: boolean
      rolcreaterole: boolean
    }>(
      `select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
         from pg_roles
        where rolname in ('kaizen_app','kaizen_worker','kaizen_auth','kaizen_readonly')`,
    )

    expect(rows).toHaveLength(4)
    for (const rol of rows) {
      expect(rol.rolsuper, `${rol.rolname} es superusuario`).toBe(false)
      expect(rol.rolbypassrls, `${rol.rolname} tiene BYPASSRLS`).toBe(false)
      expect(rol.rolcreatedb).toBe(false)
      expect(rol.rolcreaterole).toBe(false)
    }
  })

  it('el rol efectivo dentro de la transaccion es kaizen_app, no el dueno', async () => {
    const usuario = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, corpusId: F.corpusA, userId: F.userA1 },
      async (c) => {
        const r = await c.query<{ u: string }>('select current_user as u')
        return r.rows[0]?.u
      },
    )

    expect(usuario).toBe('kaizen_app')
  })

  it('toda tabla privada tiene RLS activada y forzada', async () => {
    const { rows } = await env.owner.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and c.relname not in ('schema_migrations','geography_versions','areas','municipality_catalog')`,
    )

    expect(rows.length).toBeGreaterThan(30)
    const sinRls = rows.filter((r) => !r.relrowsecurity || !r.relforcerowsecurity)
    expect(sinRls.map((r) => r.relname)).toEqual([])
  })
})

describe('privilegios minimos por identidad de servicio', () => {
  it('la identidad de autenticacion NO puede leer fragmentos de reuniones', async () => {
    await expect(
      withAuthorizedTransaction('auth', { tenantId: F.tenantA, corpusId: F.corpusA }, async (c) => {
        await c.query('select content from chunks')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('la identidad de autenticacion NO puede leer registros de personas', async () => {
    await expect(
      withAuthorizedTransaction('auth', { tenantId: F.tenantA }, async (c) => {
        await c.query('select full_name from person_records')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('el worker de ingesta NO puede leer conversaciones', async () => {
    await expect(
      withAuthorizedTransaction('worker', { tenantId: F.tenantA, corpusId: F.corpusA }, async (c) => {
        await c.query('select id from conversations')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('el worker de ingesta NO puede leer registros de personas', async () => {
    await expect(
      withAuthorizedTransaction('worker', { tenantId: F.tenantA }, async (c) => {
        await c.query('select full_name from person_records')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('la API no puede borrar eventos de auditoria', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA }, async (c) => {
        await c.query('delete from audit_events')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('la API no puede hacer DDL', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA }, async (c) => {
        await c.query('create table intruso (id int)')
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('la API no puede modificar politicas RLS', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA }, async (c) => {
        await c.query('alter table chunks disable row level security')
      }),
    ).rejects.toThrow(/must be owner|permission denied|permiso/i)
  })
})

describe('privilegio acotado a una columna de tenants', () => {
  it('la aplicacion solo tiene UPDATE sobre privacy_epoch', async () => {
    // Se verifica contra el CATALOGO, no contra la intencion de la migracion:
    // un grant por columna puede no surtir efecto si existe un grant amplio
    // a nivel de tabla que lo cubra.
    const { rows } = await env.owner.query<{ column_name: string; privilege_type: string }>(
      `select column_name, privilege_type
         from information_schema.column_privileges
        where grantee = 'kaizen_app'
          and table_name = 'tenants'
          and privilege_type = 'UPDATE'`,
    )

    expect(rows.map((r) => r.column_name)).toEqual(['privacy_epoch'])
  })

  it('la aplicacion NO puede cambiar el nombre del tenant', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA, userId: F.userA1 }, async (c) => {
        await c.query(`update tenants set name = 'Secuestrado' where id = $1`, [F.tenantA])
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('la aplicacion NO puede reactivar un tenant suspendido', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA, userId: F.userA1 }, async (c) => {
        await c.query(`update tenants set status = 'active' where id = $1`, [F.tenantA])
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('subir el epoch de OTRO tenant no afecta ninguna fila', async () => {
    const antes = await env.owner.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [F.tenantB],
    )

    await withAuthorizedTransaction('app', { tenantId: F.tenantA, userId: F.userA1 }, async (c) => {
      // Contexto de A intentando tocar B: la politica lo acota a cero filas.
      await c.query(`update tenants set privacy_epoch = privacy_epoch + 100 where id = $1`, [
        F.tenantB,
      ])
    })

    const despues = await env.owner.query<{ privacy_epoch: number }>(
      `select privacy_epoch from tenants where id = $1`,
      [F.tenantB],
    )
    expect(despues.rows[0]!.privacy_epoch).toBe(antes.rows[0]!.privacy_epoch)
  })
})

describe('las politicas de analisis no se llaman entre si', () => {
  /**
   * Regresion. La politica de `analyses` consultaba `analysis_grants` y la de
   * `analysis_grants` consultaba `analyses`: Postgres abortaba con
   * "infinite recursion detected in policy". No fallaba al crear las
   * politicas, sino al usarlas, y solo en el flujo de compartir.
   */
  it('insertar un analisis no dispara recursion en las politicas', async () => {
    const runId = 'd1000001-0000-4000-8000-000000000001'
    const analysisId = 'd2000001-0000-4000-8000-000000000001'

    await env.owner.query(
      `insert into analytics_runs
         (id, tenant_id, purpose_id, owner_user_id, template, plan, result,
          suppression_threshold, privacy_epoch, idempotency_key)
       values ($1,$2,$3,$4,'records.total','{}','{}',5,1,'regresion-1')`,
      [runId, F.tenantA, F.purposeA, F.userA2],
    )

    await expect(
      withAuthorizedTransaction(
        'app',
        { tenantId: F.tenantA, userId: F.userA2, purposeId: F.purposeA },
        async (c) => {
          await c.query(
            `insert into analyses
               (id, tenant_id, purpose_id, owner_user_id, title, run_id, privacy_epoch)
             values ($1,$2,$3,$4,'Regresion',$5,1)`,
            [analysisId, F.tenantA, F.purposeA, F.userA2, runId],
          )
        },
      ),
    ).resolves.not.toThrow()
  })

  it('leer un analisis compartido no dispara recursion', async () => {
    const analysisId = 'd2000001-0000-4000-8000-000000000001'

    await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, userId: F.userA2, purposeId: F.purposeA },
      async (c) => {
        await c.query(
          `insert into analysis_grants (tenant_id, analysis_id, grantee_user_id, granted_by)
           values ($1,$2,$3,$4)`,
          [F.tenantA, analysisId, F.userA3, F.userA2],
        )
      },
    )

    const visto = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, userId: F.userA3, purposeId: F.purposeA },
      async (c) => {
        const r = await c.query('select id from analyses')
        return r.rows.length
      },
    )

    expect(visto).toBe(1)
  })
})

describe('visibilidad de companeros de espacio', () => {
  it('la aplicacion ve las membresias de SU tenant', async () => {
    const vistas = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, userId: F.userA1 },
      async (c) => {
        const r = await c.query('select user_id from memberships')
        return r.rows.length
      },
    )
    // Alcaldia A tiene cuatro miembros en los fixtures.
    expect(vistas).toBe(4)
  })

  it('NO ve las membresias de otro tenant', async () => {
    const vistas = await withAuthorizedTransaction(
      'app',
      { tenantId: F.tenantA, userId: F.userA1 },
      async (c) => {
        const r = await c.query('select user_id from memberships where tenant_id = $1', [
          F.tenantB,
        ])
        return r.rows.length
      },
    )
    expect(vistas).toBe(0)
  })

  it('NO puede otorgarse a si misma una membresia ni un permiso', async () => {
    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantB, userId: F.userA1 }, async (c) => {
        await c.query(
          `insert into memberships (tenant_id, user_id, role) values ($1,$2,'administrador')`,
          [F.tenantB, F.userA1],
        )
      }),
    ).rejects.toThrow(/permission denied|permiso/i)

    await expect(
      withAuthorizedTransaction('app', { tenantId: F.tenantA, userId: F.userA3 }, async (c) => {
        await c.query(
          `insert into purpose_grants (tenant_id, purpose_id, user_id, permission)
           values ($1,$2,$3,'records.read_sensitive')`,
          [F.tenantA, F.purposeA, F.userA3],
        )
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })
})

describe('la identidad del webhook esta acotada al minimo', () => {
  /**
   * El webhook es el unico camino sin sesion, asi que su identidad es la que
   * mas importa mantener chica. Solo debe poder traducir un canal y encolar
   * una reconciliacion.
   */
  const CASOS: Array<[string, string]> = [
    ['documentos', 'select id from documents'],
    ['fragmentos', 'select content from chunks'],
    ['conversaciones', 'select id from conversations'],
    ['mensajes', 'select content from messages'],
    ['personas', 'select full_name from person_records'],
    ['tokens', 'select ciphertext from token_vault'],
    ['conexiones', 'select id from source_connections'],
    ['usuarios', 'select email_display from users'],
    ['analisis', 'select id from analyses'],
  ]

  for (const [nombre, sql] of CASOS) {
    it(`no puede leer ${nombre}`, async () => {
      await expect(
        withAuthorizedTransaction('webhook', {}, async (c) => {
          await c.query(sql)
        }),
      ).rejects.toThrow(/permission denied|permiso/i)
    })
  }

  it('no puede marcar un trabajo como hecho', async () => {
    await expect(
      withAuthorizedTransaction('webhook', {}, async (c) => {
        await c.query(`update ingestion_jobs set status = 'succeeded'`)
      }),
    ).rejects.toThrow(/permission denied|permiso/i)
  })

  it('no puede encolar un trabajo que NO sea de reconciliacion', async () => {
    await expect(
      withAuthorizedTransaction('webhook', {}, async (c) => {
        await c.query(
          `insert into ingestion_jobs
             (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
              job_kind, pipeline_version, dedupe_key)
           values ($1,$2,$3,1,'archivo-elegido','extract','x','intento-1')`,
          [F.tenantA, F.corpusA, F.connA],
        )
      }),
    ).rejects.toThrow(/row-level security|violates/i)
  })

  it('tampoco es superusuario ni tiene BYPASSRLS', async () => {
    const { rows } = await env.owner.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      `select rolsuper, rolbypassrls from pg_roles where rolname = 'kaizen_webhook'`,
    )
    expect(rows[0]?.rolsuper).toBe(false)
    expect(rows[0]?.rolbypassrls).toBe(false)
  })
})
