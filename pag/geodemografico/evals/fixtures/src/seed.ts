import type { Client, PoolClient } from 'pg'
import { F, CANARIOS } from './ids.js'

type Db = Client | PoolClient

/**
 * Siembra dos alcaldias completas con los casos que exige la seccion 18.1 del
 * plan. Corre con la identidad de migracion (dueno del esquema), porque el
 * objetivo es preparar el escenario, no ejercitar los permisos.
 *
 * Casos cubiertos:
 *   - A y B como alcaldias distintas, cada una con su canario.
 *   - A1 y A2 comparten las notas de A; sus chats siguen siendo privados.
 *   - A3 pertenece a A pero sin permiso de analitica sensible.
 *   - Un administrador sin permiso de lectura de notas.
 *   - Una cuenta autenticada del mismo dominio sin invitacion ni membresia.
 *   - Dos finalidades dentro del MISMO tenant A.
 *   - Documentos con titulo identico entre A y B.
 *   - Nota y transcripcion de la misma reunion (no deben contar como dos).
 *   - Una version antigua superseded y una fuente revocada.
 */
export async function seedFixtures(db: Db): Promise<void> {
  await db.query(
    `insert into tenants (id, tenant_kind, municipality_code, name)
     values ($1,'municipality','25175','Alcaldia A'),
            ($2,'municipality','25286','Alcaldia B')
     on conflict (id) do nothing`,
    [F.tenantA, F.tenantB],
  )

  await db.query(
    `insert into data_purposes (id, tenant_id, code, description)
     values ($1,$4,'gestion_documental','Notas de reunion de gestion'),
            ($2,$4,'segunda_finalidad','Finalidad distinta dentro del mismo tenant'),
            ($3,$5,'gestion_documental','Notas de reunion de gestion')
     on conflict (id) do nothing`,
    [F.purposeA, F.purposeA2, F.purposeB, F.tenantA, F.tenantB],
  )

  await db.query(
    `insert into corpora (id, tenant_id, purpose_id, name)
     values ($1,$4,$6,'Notas A'),
            ($2,$4,$7,'Notas A segunda finalidad'),
            ($3,$5,$8,'Notas B')
     on conflict (id) do nothing`,
    [
      F.corpusA, F.corpusA2, F.corpusB,
      F.tenantA, F.tenantB,
      F.purposeA, F.purposeA2, F.purposeB,
    ],
  )

  await db.query(
    `insert into users (id, issuer, subject, email_display)
     values ($1,'https://accounts.google.com','sub-a1','a1@kaizensolutionscol.com'),
            ($2,'https://accounts.google.com','sub-a2','a2@kaizensolutionscol.com'),
            ($3,'https://accounts.google.com','sub-a3','a3@kaizensolutionscol.com'),
            ($4,'https://accounts.google.com','sub-admin','admin@kaizensolutionscol.com'),
            ($5,'https://accounts.google.com','sub-b1','b1@kaizensolutionscol.com'),
            ($6,'https://accounts.google.com','sub-sin-inv','externo@kaizensolutionscol.com')
     on conflict (id) do nothing`,
    [F.userA1, F.userA2, F.userA3, F.userAdminSinLectura, F.userB1, F.userSinInvitacion],
  )

  // userSinInvitacion queda DELIBERADAMENTE fuera de memberships: existe como
  // usuario autenticado del dominio, pero no pertenece a ningun espacio.
  await db.query(
    `insert into memberships (tenant_id, user_id, role)
     values ($5,$1,'lector_notas'),
            ($5,$2,'analista'),
            ($5,$3,'lector_notas'),
            ($5,$4,'administrador'),
            ($6,$7,'lector_notas')
     on conflict do nothing`,
    [F.userA1, F.userA2, F.userA3, F.userAdminSinLectura, F.tenantA, F.tenantB, F.userB1],
  )

  // Permisos explicitos. Notar que el administrador NO recibe notes.read:
  // administrar no es leer.
  const grants: Array<[string, string, string, string]> = [
    [F.tenantA, F.purposeA, F.userA1, 'notes.read'],
    [F.tenantA, F.purposeA, F.userA2, 'notes.read'],
    [F.tenantA, F.purposeA, F.userA2, 'analytics.aggregate'],
    [F.tenantA, F.purposeA, F.userA2, 'records.read_sensitive'],
    [F.tenantA, F.purposeA, F.userA2, 'analyses.save'],
    [F.tenantA, F.purposeA, F.userA2, 'analyses.share'],
    // A3 lee notas pero NO tiene analitica sensible. Es quien CAPTURA.
    [F.tenantA, F.purposeA, F.userA3, 'notes.read'],
    [F.tenantA, F.purposeA, F.userA3, 'analyses.save'],
    [F.tenantA, F.purposeA, F.userA3, 'records.capture'],
    // A2 REVISA. Capturador y revisor separados a proposito: es el invariante
    // que sostiene el trigger de autoaprobacion.
    [F.tenantA, F.purposeA, F.userA2, 'records.review'],
    // El administrador tambien captura, para poder probar el circuito completo
    // desde una sola cuenta en desarrollo.
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'records.capture'],
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'analytics.aggregate'],
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'analyses.save'],
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'sources.manage'],
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'tenant.admin'],
    // El caso "administra pero no lee" se sigue probando en la SEGUNDA
    // finalidad, donde este usuario no tiene ninguna concesion. En la primera
    // se le da lectura porque es la cuenta con la que se conecta Drive y se
    // prueba el chat: sin esto, quien conecta la fuente no puede comprobar
    // que lo que conecto sirve.
    [F.tenantA, F.purposeA, F.userAdminSinLectura, 'notes.read'],
    // La segunda finalidad de A: solo A1, y solo ahi.
    [F.tenantA, F.purposeA2, F.userA1, 'notes.read'],
    [F.tenantB, F.purposeB, F.userB1, 'notes.read'],
    [F.tenantB, F.purposeB, F.userB1, 'analytics.aggregate'],
  ]
  for (const [tenantId, purposeId, userId, permission] of grants) {
    await db.query(
      `insert into purpose_grants (tenant_id, purpose_id, user_id, permission)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [tenantId, purposeId, userId, permission],
    )
  }

  // Un líder cargado por email que todavía no entró. En desarrollo se entra
  // con la cuenta "Líder" (sub-lider → lider@kaizensolutionscol.com) y el login
  // lo reconoce, igual que en producción.
  await db.query(
    `insert into leader_registry (tenant_id, purpose_id, email, display_name)
     values ($1, $2, 'lider@kaizensolutionscol.com', 'Líder de prueba')
     on conflict do nothing`,
    [F.tenantA, F.purposeA],
  )

  await seedFuentes(db)
  await seedDocumentos(db)
}

async function seedFuentes(db: Db): Promise<void> {
  await db.query(
    `insert into source_connections (id, tenant_id, corpus_id, provider, provider_subject, granted_scopes, status)
     values ($1,$7,$4,'fixture','google-sub-a','{drive.meet.readonly}','active'),
            ($2,$7,$5,'fixture','google-sub-a','{drive.meet.readonly}','active'),
            ($3,$8,$6,'fixture','google-sub-b','{drive.meet.readonly}','active')
     on conflict (id) do nothing`,
    [F.connA, F.connA2, F.connB, F.corpusA, F.corpusA2, F.corpusB, F.tenantA, F.tenantB],
  )

  await db.query(
    `insert into source_collections (id, tenant_id, corpus_id, connection_id, allowed_mime_types)
     values ($1,$3,$7,$4,'{application/vnd.google-apps.document}'),
            ($2,$5,$8,$6,'{application/vnd.google-apps.document}')
     on conflict (id) do nothing`,
    [
      F.collectionA,
      F.collectionB,
      F.tenantA,
      F.connA,
      F.tenantB,
      F.connB,
      F.corpusA,
      F.corpusB,
    ],
  )

  // Un acceso directo y su destino real apuntan al MISMO archivo: la
  // deduplicacion por target_file_id debe dejar una sola fila.
  await db.query(
    `insert into collection_members (tenant_id, collection_id, provider_file_id, target_file_id, admitted_by)
     values ($1,$2,'file-a-notas','file-a-notas','manual_selection'),
            ($1,$2,'shortcut-a-notas','file-a-notas','manual_selection'),
            ($1,$2,'file-a-transcripcion','file-a-transcripcion','manual_selection'),
            ($3,$4,'file-b-notas','file-b-notas','manual_selection')
     on conflict do nothing`,
    [F.tenantA, F.collectionA, F.tenantB, F.collectionB],
  )
}

async function seedDocumentos(db: Db): Promise<void> {
  // Una sola reunion en A, con nota Y transcripcion. El conteo de reuniones
  // debe dar 1, no 2.
  await db.query(
    `insert into meetings (id, tenant_id, corpus_id, purpose_id, provider_meeting_key, started_at, identity_confidence)
     values ($1,$3,$5,$7,'meet-a-0001','2026-03-04T14:00:00Z','provider_key'),
            ($2,$4,$6,$8,'meet-b-0001','2026-03-05T14:00:00Z','provider_key')
     on conflict (id) do nothing`,
    [F.meetingA, F.meetingB, F.tenantA, F.tenantB, F.corpusA, F.corpusB, F.purposeA, F.purposeB],
  )

  // TITULO IDENTICO en A y B a proposito: el aislamiento no puede depender
  // de que los titulos sean distintos.
  const TITULO_COMPARTIDO = 'Comite de obras - marzo'

  const documentos: Array<{
    id: string
    tenant: string
    corpus: string
    purpose: string
    conn: string
    fileId: string
    artifact: string
    titulo: string
    fecha: string | null
    estado: string
  }> = [
    { id: F.docAnotas, tenant: F.tenantA, corpus: F.corpusA, purpose: F.purposeA, conn: F.connA, fileId: 'file-a-notas', artifact: 'meeting_notes', titulo: TITULO_COMPARTIDO, fecha: '2026-03-04T14:00:00Z', estado: 'active' },
    { id: F.docAtranscripcion, tenant: F.tenantA, corpus: F.corpusA, purpose: F.purposeA, conn: F.connA, fileId: 'file-a-transcripcion', artifact: 'transcript', titulo: TITULO_COMPARTIDO, fecha: '2026-03-04T14:00:00Z', estado: 'active' },
    { id: F.docAvieja, tenant: F.tenantA, corpus: F.corpusA, purpose: F.purposeA, conn: F.connA, fileId: 'file-a-vieja', artifact: 'manual_document', titulo: 'Acta anterior', fecha: null, estado: 'active' },
    { id: F.docArevocada, tenant: F.tenantA, corpus: F.corpusA, purpose: F.purposeA, conn: F.connA, fileId: 'file-a-revocada', artifact: 'manual_document', titulo: 'Documento sin acceso', fecha: null, estado: 'withdrawn' },
    { id: F.docBnotas, tenant: F.tenantB, corpus: F.corpusB, purpose: F.purposeB, conn: F.connB, fileId: 'file-b-notas', artifact: 'meeting_notes', titulo: TITULO_COMPARTIDO, fecha: '2026-03-05T14:00:00Z', estado: 'active' },
  ]

  for (const d of documentos) {
    await db.query(
      `insert into documents (id, tenant_id, corpus_id, purpose_id, connection_id, source_file_id, artifact_type, title, meeting_at, date_origin, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (id) do nothing`,
      [
        d.id, d.tenant, d.corpus, d.purpose, d.conn, d.fileId, d.artifact, d.titulo,
        d.fecha,
        d.fecha ? 'provider_meeting' : 'unknown',
        d.estado,
      ],
    )
  }

  await db.query(
    `insert into meeting_documents (tenant_id, corpus_id, meeting_id, document_id, artifact_type)
     values ($1,$3,$5,$6,'meeting_notes'),
            ($1,$3,$5,$7,'transcript'),
            ($2,$4,$8,$9,'meeting_notes')
     on conflict do nothing`,
    [
      F.tenantA, F.tenantB, F.corpusA, F.corpusB,
      F.meetingA, F.docAnotas, F.docAtranscripcion,
      F.meetingB, F.docBnotas,
    ],
  )

  await seedVersionesYChunks(db)
}

/** Embedding determinista a partir de un texto. No llama a ningun proveedor. */
export function embeddingDeterminista(texto: string, dimension = 768): number[] {
  const vector = new Array<number>(dimension).fill(0)
  for (let i = 0; i < texto.length; i++) {
    const code = texto.charCodeAt(i)
    const idx = (code * 31 + i) % dimension
    vector[idx] = (vector[idx] ?? 0) + ((code % 17) - 8) / 8
  }
  const norma = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0)) || 1
  return vector.map((v) => v / norma)
}

async function seedVersionesYChunks(db: Db): Promise<void> {
  const versiones: Array<{
    id: string
    tenant: string
    corpus: string
    doc: string
    source: string
    estado: string
    texto: string
    heading: string
  }> = [
    {
      id: '0d000001-0000-4000-8000-000000000001',
      tenant: F.tenantA, corpus: F.corpusA, doc: F.docAnotas,
      source: 'v2', estado: 'published',
      heading: 'Acuerdos',
      texto: `Se aprobo el presupuesto de pavimentacion del barrio centro por 420 millones. ${CANARIOS.tenantA}. Responsable: secretaria de infraestructura. Plazo: 30 de junio.`,
    },
    {
      id: '0d000001-0000-4000-8000-000000000002',
      tenant: F.tenantA, corpus: F.corpusA, doc: F.docAnotas,
      // Version ANTIGUA de la misma nota: no debe recuperarse.
      source: 'v1', estado: 'superseded',
      heading: 'Acuerdos',
      texto: 'Borrador anterior con cifra equivocada de 380 millones. NO-DEBE-RECUPERARSE.',
    },
    {
      id: '0d000001-0000-4000-8000-000000000003',
      tenant: F.tenantA, corpus: F.corpusA, doc: F.docAtranscripcion,
      source: 'v1', estado: 'published',
      heading: 'Intervenciones',
      texto: `El alcalde pregunta por el cronograma. La secretaria responde que inicia en abril. ${CANARIOS.tenantA}.`,
    },
    {
      id: '0d000001-0000-4000-8000-000000000004',
      tenant: F.tenantB, corpus: F.corpusB, doc: F.docBnotas,
      source: 'v1', estado: 'published',
      heading: 'Acuerdos',
      texto: `Se aprobo la compra de luminarias por 95 millones. ${CANARIOS.tenantB}. Responsable: secretaria de planeacion.`,
    },
  ]

  for (const v of versiones) {
    await db.query(
      `insert into document_versions (id, tenant_id, corpus_id, document_id, source_version, content_hash, parser_version, status, char_count)
       values ($1,$2,$3,$4,$5,$6,'fixture-1',$7,$8) on conflict (id) do nothing`,
      [v.id, v.tenant, v.corpus, v.doc, v.source, `hash-${v.source}-${v.doc}`, v.estado, v.texto.length],
    )

    if (v.estado === 'published') {
      await db.query(
        `update documents set current_version_id = $1 where tenant_id = $2 and id = $3`,
        [v.id, v.tenant, v.doc],
      )
    }

    const chunkId = `0e${v.id.slice(2)}`
    await db.query(
      `insert into chunks (id, tenant_id, corpus_id, document_id, version_id, ordinal, content, heading, char_start, char_end, token_estimate)
       values ($1,$2,$3,$4,$5,0,$6,$7,0,$8,$9) on conflict (id) do nothing`,
      [chunkId, v.tenant, v.corpus, v.doc, v.id, v.texto, v.heading, v.texto.length, Math.ceil(v.texto.length / 4)],
    )

    await db.query(
      `insert into chunk_embeddings (chunk_id, tenant_id, corpus_id, embedding_model, dimension, pipeline_version, embedding)
       values ($1,$2,$3,'fixture-deterministic',768,'fixture-1',$4) on conflict (chunk_id) do nothing`,
      [chunkId, v.tenant, v.corpus, JSON.stringify(embeddingDeterminista(v.texto))],
    )
  }

  // Segunda finalidad del MISMO tenant A: su canario no puede aparecer en
  // consultas hechas con la primera finalidad.
  await db.query(
    `insert into documents (id, tenant_id, corpus_id, purpose_id, connection_id, source_file_id, artifact_type, title, status)
     values ($1,$2,$3,$4,$5,'file-a2-notas','manual_document','Documento de otra finalidad','active')
     on conflict (id) do nothing`,
    ['0a000002-0000-4000-8000-000000000001', F.tenantA, F.corpusA2, F.purposeA2, F.connA2],
  )
  await db.query(
    `insert into document_versions (id, tenant_id, corpus_id, document_id, source_version, content_hash, parser_version, status, char_count)
     values ($1,$2,$3,$4,'v1','hash-a2','fixture-1','published',80) on conflict (id) do nothing`,
    ['0d000002-0000-4000-8000-000000000001', F.tenantA, F.corpusA2, '0a000002-0000-4000-8000-000000000001'],
  )
  await db.query(
    `insert into chunks (id, tenant_id, corpus_id, document_id, version_id, ordinal, content, heading, char_start, char_end)
     values ($1,$2,$3,$4,$5,0,$6,'Otra finalidad',0,80) on conflict (id) do nothing`,
    [
      '0e000002-0000-4000-8000-000000000001', F.tenantA, F.corpusA2,
      '0a000002-0000-4000-8000-000000000001', '0d000002-0000-4000-8000-000000000001',
      `Contenido de la segunda finalidad. ${CANARIOS.purposeA2}.`,
    ],
  )
}
