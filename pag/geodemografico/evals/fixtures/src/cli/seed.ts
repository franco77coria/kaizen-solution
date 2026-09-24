import { randomBytes, createHash } from 'node:crypto'
import pg from 'pg'
import { seedFixtures } from '../seed.js'
import { seedRegistros } from '../records.js'
import { seedPiloto, PILOTO } from '../pilot.js'
import {
  CUNDINAMARCA_MUNICIPALITIES,
  DEPARTMENT_CODE,
  DEPARTMENT_NAME,
} from '@kaizen/geography'
import { MIGRATIONS_DIR, runMigrations } from '@kaizen/db'

/**
 * Prepara la base local: migraciones, catalogo territorial, fixtures de las
 * dos alcaldias, registros sinteticos y el tenant del piloto interno.
 *
 * Es idempotente: se puede correr varias veces sin duplicar nada.
 */
const url = process.env['DATABASE_MIGRATION_URL'] ?? process.env['DATABASE_URL']
if (!url) {
  process.stderr.write('falta DATABASE_URL\n')
  process.exit(1)
}

await runMigrations(MIGRATIONS_DIR, url, (m) => process.stdout.write(`${m}\n`))

const client = new pg.Client({ connectionString: url })
await client.connect()

try {

  // Catalogo territorial. Bogota NO se inserta: queda fuera por decision
  // explicita, y su ausencia es intencional, no un olvido.
  for (const m of CUNDINAMARCA_MUNICIPALITIES) {
    await client.query(
      `insert into municipality_catalog (code, name, department_code, department_name, in_project_scope, note)
       values ($1,$2,$3,$4,true,$5)
       on conflict (code) do update set name = excluded.name`,
      [
        m.code,
        m.name,
        DEPARTMENT_CODE,
        DEPARTMENT_NAME,
        'transcrito de DIVIPOLA; pendiente de cotejo con el archivo oficial',
      ],
    )
  }

  // Version de geografia en DRAFT y SIN geometrias. Queda asi a proposito:
  // activar una version sin cartografia verificada produciria mapas en blanco
  // que se leerian como "no hay datos".
  await client.query(
    `insert into geography_versions
       (version, source_name, source_url, crs, status, geometry_loaded, note)
     values ('divipola-pendiente',
             'DANE - Division politico-administrativa (DIVIPOLA)',
             'https://www.dane.gov.co/index.php/component/content/article/488-division-polistico-administrativa',
             'EPSG:4326', 'draft', false,
             'Catalogo de nombres y codigos cargado. Faltan las geometrias oficiales: cargarlas con pnpm geo:load antes de habilitar mapas.')
     on conflict (version) do nothing`,
  )

  await seedFixtures(client)
  await seedRegistros(client)

  // Token de invitacion del piloto. Se imprime UNA vez y no se guarda en
  // ningun archivo: en la base solo queda su hash.
  const token = randomBytes(24).toString('base64url')
  await seedPiloto(client, {
    invitationTokenHash: createHash('sha256').update(token).digest('hex'),
  })

  const conteo = await client.query<{ t: string; d: string; c: string; p: string }>(
    `select (select count(*) from tenants)::text t,
            (select count(*) from documents)::text d,
            (select count(*) from chunks)::text c,
            (select count(*) from person_records)::text p`,
  )
  const fila = conteo.rows[0]

  process.stdout.write(
    [
      '',
      'base local lista:',
      `  tenants: ${fila?.t}  documentos: ${fila?.d}  fragmentos: ${fila?.c}  registros: ${fila?.p}`,
      `  municipios en catalogo: ${CUNDINAMARCA_MUNICIPALITIES.length}`,
      '',
      'invitacion del piloto interno (se muestra UNA sola vez):',
      `  cuenta: ${PILOTO.email}`,
      `  enlace: /auth/start?invitation=${token}`,
      '',
      'usuarios de prueba para el proveedor de identidad local (APP_ENV=local):',
      '  sub-a1    lector de notas en Alcaldia A',
      '  sub-a2    analista en Alcaldia A (analitica + fichas nominales)',
      '  sub-a3    lector sin analitica sensible',
      '  sub-admin administrador SIN permiso de lectura de notas',
      '  sub-b1    lector en Alcaldia B',
      '',
    ].join('\n'),
  )
} finally {
  await client.end().catch(() => {})
}
