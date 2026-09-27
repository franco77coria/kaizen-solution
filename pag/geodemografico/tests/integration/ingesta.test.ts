import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withAuthorizedTransaction } from '@kaizen/db'
import { FixtureSourceProvider, deduplicarPorDestino, type FixtureData } from '@kaizen/connector-google-drive'
import { PILOTO } from '@kaizen/fixtures'
import { seedPiloto } from '@kaizen/fixtures'
import { ingerirArchivo, inventariar, type IngestContext } from '../../apps/worker/src/ingest.js'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

/**
 * Tickets 06 a 10 — ingesta.
 *
 * Lo que se comprueba aca son los modos de fallo SILENCIOSO: duplicar una
 * reunion, reindexar sin cambios, publicar media version, o dejar un documento
 * accesible despues de perder el permiso. Ninguno de esos tira un error por su
 * cuenta; hay que buscarlos.
 */
let env: TestEnv
let provider: FixtureSourceProvider
let datos: FixtureData
let context: IngestContext

beforeAll(async () => {
  env = await setupTestEnv()
  await seedPiloto(env.owner, { invitationTokenHash: 'hash-de-prueba' })

  datos = JSON.parse(
    await readFile('evals/fixtures/drive/gerencia.json', 'utf8'),
  ) as FixtureData
  provider = new FixtureSourceProvider(structuredClone(datos))

  context = {
    tenantId: PILOTO.tenantId,
    corpusId: PILOTO.corpusId,
    purposeId: PILOTO.purposeId,
    connectionId: PILOTO.connectionId,
    connectionGeneration: 1,
    provider,
  }
}, 120_000)

afterAll(async () => {
  await env?.close()
})

const ctx = {
  tenantId: PILOTO.tenantId,
  corpusId: PILOTO.corpusId,
  purposeId: PILOTO.purposeId,
}

describe('deduplicacion de accesos directos', () => {
  it('un acceso directo y su destino cuentan como UN archivo', () => {
    const { unicos, duplicados } = deduplicarPorDestino(datos.files)

    const notas = unicos.filter((f) => (f.shortcutTargetId ?? f.id) === 'doc-comite-notas')
    expect(notas).toHaveLength(1)
    // Gana el archivo real, no el acceso directo.
    expect(notas[0]?.shortcutTargetId).toBeNull()
    expect(duplicados.map((d) => d.fileId)).toContain('shortcut-comite')
  })

  it('dos documentos con el mismo titulo NO se fusionan', () => {
    const { unicos } = deduplicarPorDestino(datos.files)
    const conEseTitulo = unicos.filter((f) => f.name === 'Comite de obras - notas')
    // `doc-comite-notas` y `doc-comite-abril` comparten titulo exacto y son
    // reuniones distintas.
    expect(conEseTitulo).toHaveLength(2)
  })
})

describe('inventario y manifiesto virtual', () => {
  it('admite solo lo que el proveedor confirma como reunion', async () => {
    const resumen = await inventariar(context, PILOTO.collectionId)

    expect(resumen.duplicados).toBeGreaterThan(0)
    // Los que tienen clave de reunion entran solos; el resto queda pendiente
    // de seleccion humana.
    expect(resumen.admitidos).toBeGreaterThan(0)
    expect(resumen.pendientes).toBeGreaterThan(0)

    const estados = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const { rows } = await c.query<{ target_file_id: string; status: string }>(
        `select target_file_id, status from collection_members order by target_file_id`,
      )
      return new Map(rows.map((r) => [r.target_file_id, r.status]))
    })

    expect(estados.get('doc-comite-notas')).toBe('admitted')
    expect(estados.get('doc-comite-transcripcion')).toBe('admitted')
    // Sin senal del proveedor: candidato, no admitido.
    expect(estados.get('doc-plan-multipestana')).toBe('candidate')
    // Tipo no admitido: ni siquiera se registra.
    expect(estados.has('hoja-presupuesto')).toBe(false)
    // En la papelera: no entra.
    expect(estados.has('doc-en-papelera')).toBe(false)
  })
})

describe('extraccion, segmentacion y publicacion', () => {
  it('publica un documento con sus fragmentos y su version vigente', async () => {
    const salida = await ingerirArchivo(context, 'doc-comite-notas')
    expect(salida.resultado).toBe('publicado')

    const estado = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const doc = await c.query<{ id: string; current_version_id: string; title: string }>(
        `select id, current_version_id, title from documents where source_file_id = $1`,
        ['doc-comite-notas'],
      )
      const version = await c.query<{ status: string; extraction_complete: boolean }>(
        `select status, extraction_complete from document_versions where id = $1`,
        [doc.rows[0]?.current_version_id],
      )
      const chunks = await c.query<{ n: string }>(
        `select count(*) n from chunks where version_id = $1`,
        [doc.rows[0]?.current_version_id],
      )
      return {
        titulo: doc.rows[0]?.title,
        estadoVersion: version.rows[0]?.status,
        completa: version.rows[0]?.extraction_complete,
        fragmentos: Number(chunks.rows[0]?.n ?? 0),
      }
    })

    expect(estado.estadoVersion).toBe('published')
    expect(estado.completa).toBe(true)
    expect(estado.fragmentos).toBeGreaterThan(0)
  })

  it('reprocesar el MISMO contenido no crea otra version', async () => {
    const primera = await ingerirArchivo(context, 'doc-comite-transcripcion')
    expect(primera.resultado).toBe('publicado')

    const segunda = await ingerirArchivo(context, 'doc-comite-transcripcion')
    // Idempotencia por hash de contenido: sin cambios, no se reindexa.
    expect(segunda.resultado).toBe('sin_cambios')

    const versiones = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const { rows } = await c.query<{ n: string }>(
        `select count(*) n from document_versions v
           join documents d on d.id = v.document_id
          where d.source_file_id = $1`,
        ['doc-comite-transcripcion'],
      )
      return Number(rows[0]?.n ?? 0)
    })
    expect(versiones).toBe(1)
  })

  it('nota y transcripcion de la misma reunion cuentan UNA reunion', async () => {
    const conteos = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const reuniones = await c.query<{ n: string }>(
        `select count(distinct md.meeting_id) n
           from meeting_documents md
           join documents d on d.tenant_id = md.tenant_id and d.id = md.document_id
          where d.status = 'active'`,
      )
      const documentos = await c.query<{ n: string }>(
        `select count(*) n from documents where status = 'active'`,
      )
      return {
        reuniones: Number(reuniones.rows[0]?.n ?? 0),
        documentos: Number(documentos.rows[0]?.n ?? 0),
      }
    })

    // Dos documentos (nota y transcripcion), una sola reunion.
    expect(conteos.documentos).toBe(2)
    expect(conteos.reuniones).toBe(1)
  })

  it('declara la extraccion incompleta en vez de truncar en silencio', async () => {
    await withAuthorizedTransaction('worker', ctx, async (c) => {
      await c.query(
        `update collection_members set status = 'admitted' where target_file_id = $1`,
        ['doc-plan-multipestana'],
      )
    })

    const salida = await ingerirArchivo(context, 'doc-plan-multipestana')
    expect(salida.resultado).toBe('publicado')

    const version = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const { rows } = await c.query<{ extraction_complete: boolean; extraction_note: string | null }>(
        `select v.extraction_complete, v.extraction_note
           from document_versions v
           join documents d on d.id = v.document_id
          where d.source_file_id = $1 and v.status = 'published'`,
        ['doc-plan-multipestana'],
      )
      return rows[0]
    })

    expect(version?.extraction_complete).toBe(false)
    expect(version?.extraction_note).toMatch(/pestana/)
  })

  it('segmenta preservando las pestanas del documento', async () => {
    const pestanas = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const { rows } = await c.query<{ tab_id: string }>(
        `select distinct c.tab_id
           from chunks c
           join documents d on d.id = c.document_id
          where d.source_file_id = $1
          order by c.tab_id`,
        ['doc-plan-multipestana'],
      )
      return rows.map((r) => r.tab_id)
    })

    expect(pestanas).toEqual(['tab-diagnostico', 'tab-metas'])
  })
})

describe('revocacion y perdida de acceso', () => {
  it('perder el permiso de lectura retira el documento y bloquea el historial', async () => {
    // Se monta un mensaje que depende de la version publicada, para comprobar
    // que el historial tambien se invalida y no solo el documento.
    const versionId = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const { rows } = await c.query<{ current_version_id: string }>(
        `select current_version_id from documents where source_file_id = $1`,
        ['doc-comite-notas'],
      )
      return rows[0]!.current_version_id
    })

    await env.owner.query(
      `insert into users (id, issuer, subject, email_display)
       values ('c0000001-0000-4000-8000-000000000001','https://accounts.google.com','sub-piloto','gerencia@kaizensolutionscol.com')
       on conflict (id) do nothing`,
    )
    await env.owner.query(
      `insert into memberships (tenant_id, user_id, role)
       values ($1,'c0000001-0000-4000-8000-000000000001','gestor_fuentes')
       on conflict do nothing`,
      [PILOTO.tenantId],
    )
    await env.owner.query(
      `insert into conversations (id, tenant_id, corpus_id, purpose_id, owner_user_id, authz_version)
       values ('c1000001-0000-4000-8000-000000000001',$1,$2,$3,'c0000001-0000-4000-8000-000000000001',1)`,
      [PILOTO.tenantId, PILOTO.corpusId, PILOTO.purposeId],
    )
    await env.owner.query(
      `insert into messages
         (id, tenant_id, corpus_id, conversation_id, role, status, content, dependency_version_ids)
       values ('c2000001-0000-4000-8000-000000000001',$1,$2,'c1000001-0000-4000-8000-000000000001',
               'assistant','complete','Respuesta que depende de esa nota', array[$3::uuid])`,
      [PILOTO.tenantId, PILOTO.corpusId, versionId],
    )

    // El proveedor deja de conceder lectura sobre el archivo.
    const modificado = structuredClone(datos)
    const archivo = modificado.files.find((f) => f.id === 'doc-comite-notas')!
    archivo.canRead = false
    provider.setData(modificado)

    const salida = await ingerirArchivo(context, 'doc-comite-notas')
    expect(salida.resultado).toBe('retirado')

    const estado = await withAuthorizedTransaction('worker', ctx, async (c) => {
      const doc = await c.query<{ status: string }>(
        `select status from documents where source_file_id = $1`,
        ['doc-comite-notas'],
      )
      const version = await c.query<{ status: string }>(
        `select status from document_versions where id = $1`,
        [versionId],
      )
      return {
        documento: doc.rows[0]?.status,
        version: version.rows[0]?.status,
      }
    })

    expect(estado.documento).toBe('withdrawn')
    expect(estado.version).toBe('withdrawn')

    const lapida = await env.owner.query<{ reason: string; scope: string }>(
      `select reason, scope from deletion_tombstones where resource_kind = 'document'`,
    )
    expect(lapida.rows[0]?.reason).toBe('access_revoked')
    expect(lapida.rows[0]?.scope).toBe('document')

    // El historial NO se reescribe: el mensaje sigue ahi con su estado
    // original, y su invalidez se DERIVA de que la version que lo respalda
    // dejo de estar publicada. Es la misma comprobacion que hace el endpoint.
    const mensaje = await env.owner.query<{ status: string; vigente: boolean }>(
      `select m.status,
              not exists (
                select 1
                  from unnest(m.dependency_version_ids) as dep(version_id)
                  left join document_versions v on v.id = dep.version_id
                 where v.id is null or v.status <> 'published'
              ) as vigente
         from messages m
        where m.id = 'c2000001-0000-4000-8000-000000000001'`,
    )
    expect(mensaje.rows[0]?.status).toBe('complete')
    expect(mensaje.rows[0]?.vigente).toBe(false)
  })

  it('un trabajo de una generacion anterior no publica nada', async () => {
    // Simula una reconexion: la generacion sube y el trabajo en vuelo queda
    // obsoleto.
    await env.owner.query(
      `update source_connections set generation = generation + 1 where id = $1`,
      [PILOTO.connectionId],
    )

    const salida = await ingerirArchivo(
      { ...context, connectionGeneration: 1 },
      'doc-comite-transcripcion',
    )

    expect(salida.resultado).toBe('omitido')
    expect(salida.motivo).toMatch(/generacion obsoleta/)
  })

  it('una conexion revocada detiene la ingesta', async () => {
    await env.owner.query(
      `update source_connections set status = 'revoked' where id = $1`,
      [PILOTO.connectionId],
    )

    const salida = await ingerirArchivo(
      { ...context, connectionGeneration: 2 },
      'doc-comite-transcripcion',
    )

    expect(salida.resultado).toBe('omitido')
    expect(salida.motivo).toMatch(/conexion inactiva/)
  })
})

describe('la reconexion devuelve el corpus a la vida', () => {
  /**
   * Regresion del fallo mas caro de todos: reconectar Google dejaba el
   * asistente CIEGO, y no habia forma de recuperarlo reconectando de nuevo.
   *
   * El upsert de `documents` actualizaba titulo, tipo y fecha en el conflicto,
   * pero no `connection_id`. El documento quedaba clavado en la conexion que lo
   * ingirio la primera vez; esa conexion se revoca en cuanto alguien reconecta,
   * y la comprobacion de vigencia mira justamente su estado.
   *
   * Resultado: TODOS los fragmentos se descartaban por "conexion revocada". El
   * chat respondia "no encontre notas disponibles" mientras el tablero seguia
   * mostrando los documentos, y cada reconexion agregaba una generacion
   * revocada mas sin arreglar nada.
   */
  it('el documento reingerido queda bajo la conexion nueva, no la revocada', async () => {
    // Proveedor propio: un bloque anterior de este archivo borra archivos del
    // proveedor compartido para probar la perdida de acceso. Apoyarse en el
    // estado que dejo otro test hace que este falle por un motivo que no es el
    // suyo -aca llego a devolver 'retirado'- y esconde lo que se quiere medir.
    const propio = new FixtureSourceProvider(structuredClone(datos))
    const contextoPropio = { ...context, provider: propio }
    const archivo = datos.files[0]!.id

    await ingerirArchivo(contextoPropio, archivo)

    const conexionNueva = 'e9000001-0000-4000-8000-000000000001'
    await env.owner.query(
      `update source_connections set status = 'revoked' where id = $1`,
      [PILOTO.connectionId],
    )
    await env.owner.query(
      `insert into source_connections
         (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status, generation)
       values ($1,$2,$3,'fixture','pendiente-oauth','{}','active',2)`,
      [conexionNueva, PILOTO.tenantId, PILOTO.corpusId],
    )

    // Reconciliacion tras reconectar: el MISMO archivo, leido por la
    // credencial nueva. El contenido no cambio, asi que cae en el conflicto.
    const segunda = await ingerirArchivo(
      { ...contextoPropio, connectionId: conexionNueva, connectionGeneration: 2 },
      archivo,
    )

    // El contenido no cambio, asi que la ingesta corta por idempotencia. Eso
    // es correcto -no hay que reindexar- pero el documento tiene que haber
    // quedado igual bajo la credencial nueva.
    expect(['sin_cambios', 'publicado']).toContain(segunda.resultado)

    const { rows } = await env.owner.query<{ connection_id: string; estado: string }>(
      `select d.connection_id, sc.status as estado
         from documents d join source_connections sc on sc.id = d.connection_id
        where d.tenant_id = $1 and d.source_file_id = $2`,
      [PILOTO.tenantId, archivo],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.connection_id).toBe(conexionNueva)

    // Lo que de verdad importa: la conexion del documento esta ACTIVA. Si
    // quedara revocada, la vigencia descarta cada fragmento y el asistente
    // contesta que no tiene notas.
    expect(rows[0]?.estado).toBe('active')
  })
})
