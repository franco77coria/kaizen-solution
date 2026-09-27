/**
 * Deja una base de produccion lista para usar, despues de `pnpm prod:migrar`.
 *
 *   pnpm prod:inicializar --admin <email> --consentimiento <archivo.txt> --responsable "<nombre>"
 *   pnpm prod:inicializar ... --rotar-clave     (genera una clave nueva para kaizen_login)
 *
 * Lee `.env.produccion`, que tiene que traer DATABASE_MIGRATION_URL: la
 * conexion del DUENO de la base (el usuario `postgres` de Supabase). Hace:
 *
 *   1. El espacio, la finalidad y el corpus de Cundinamarca.
 *   2. El texto de consentimiento, version v1, desde el archivo indicado. El
 *      texto legal lo escribe una persona, no este script: no hay default.
 *   3. El primer administrador, cargado en el registro con rol `administrador`
 *      (migracion 0023). Queda reconocido en su primer login con Google.
 *   4. La clave de `kaizen_login` (migracion 0024), y escribe en
 *      `.env.produccion` la DATABASE_URL con la que corre la app.
 *
 * La clave NO se imprime: va directo al archivo, que esta en .gitignore.
 * Es idempotente: correrlo dos veces no duplica nada. Lo que no hace es
 * pisar un texto de consentimiento ya publicado: las versiones de un aviso
 * legal no se editan, se reemplazan por otra version.
 */
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const DOMINIO = '@kaizensolutionscol.com'
const ULTIMA_MIGRACION = '0026_cerrar_api_de_supabase.sql'

const ESPACIO = { nombre: 'Kaizen · Cundinamarca' }
const FINALIDAD = {
  codigo: 'geodemografico_cundinamarca',
  descripcion:
    'Registro de personas que se suman en los municipios de Cundinamarca y notas de reunion de gestion.',
}
const CORPUS = 'notas_de_reunion'

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function salir(mensaje) {
  console.error(`\n${mensaje}\n`)
  process.exit(1)
}

const admin = argumento('admin')?.trim().toLowerCase()
const rutaConsentimiento = argumento('consentimiento')
const responsable = argumento('responsable')?.trim()
const rotarClave = process.argv.includes('--rotar-clave')
// Solo para probar el script contra una base local sin tocar el archivo real.
const ARCHIVO_ENV =
  argumento('archivo-env') ?? fileURLToPath(new URL('../.env.produccion', import.meta.url))

if (!admin || !rutaConsentimiento || !responsable) {
  salir(
    'uso: pnpm prod:inicializar --admin <email> --consentimiento <archivo.txt> --responsable "<nombre>"',
  )
}
if (!admin.endsWith(DOMINIO)) salir(`el administrador tiene que usar una cuenta ${DOMINIO}`)
if (/pendiente/i.test(responsable)) {
  salir('el responsable del tratamiento tiene que estar definido: es lo que firma el aviso legal')
}

const cuerpo = (await readFile(rutaConsentimiento, 'utf8')).trim()
if (cuerpo.length < 200) {
  salir('el texto de consentimiento parece incompleto (menos de 200 caracteres)')
}

const urlDueno = process.env.DATABASE_MIGRATION_URL
if (!urlDueno) salir('falta DATABASE_MIGRATION_URL en .env.produccion')

const client = new pg.Client({ connectionString: urlDueno })
await client.connect()

try {
  const migracion = await client.query(
    `select 1 from schema_migrations where filename = $1`,
    [ULTIMA_MIGRACION],
  )
  if (!migracion.rowCount) salir('faltan migraciones: correr primero `pnpm prod:migrar`')

  await client.query('begin')

  const espacio = await buscarOCrear(
    `select id from tenants where name = $1`,
    `insert into tenants (tenant_kind, name, time_zone)
     values ('internal_pilot', $1, 'America/Bogota') returning id`,
    [ESPACIO.nombre],
  )

  const finalidad = await buscarOCrear(
    `select id from data_purposes where tenant_id = $1 and code = $2`,
    `insert into data_purposes (tenant_id, code, description) values ($1, $2, $3) returning id`,
    [espacio, FINALIDAD.codigo],
    [espacio, FINALIDAD.codigo, FINALIDAD.descripcion],
  )

  await buscarOCrear(
    `select id from corpora where tenant_id = $1 and purpose_id = $2 and name = $3`,
    `insert into corpora (tenant_id, purpose_id, name) values ($1, $2, $3) returning id`,
    [espacio, finalidad, CORPUS],
  )

  const aviso = await client.query(
    `select body, controller_name from consent_texts
      where tenant_id = $1 and purpose_id = $2 and version = 'v1'`,
    [espacio, finalidad],
  )
  if (aviso.rows[0]) {
    const igual = aviso.rows[0].body === cuerpo && aviso.rows[0].controller_name === responsable
    if (!igual) {
      salir(
        'ya hay un consentimiento v1 publicado con otro texto o responsable.\n' +
          'Un aviso legal no se edita: hay que publicar una version nueva.',
      )
    }
  } else {
    await client.query(
      `insert into consent_texts (tenant_id, purpose_id, version, body, controller_name, status)
       values ($1, $2, 'v1', $3, $4, 'active')`,
      [espacio, finalidad, cuerpo, responsable],
    )
  }

  // Primer administrador. Si ya esta (vigente), no se toca.
  await client.query(
    `insert into leader_registry (tenant_id, purpose_id, email, display_name, rol)
     values ($1, $2, $3, $4, 'administrador')
     on conflict (tenant_id, purpose_id, email) where status <> 'revoked' do nothing`,
    [espacio, finalidad, admin, admin.split('@')[0]],
  )

  await client.query('commit')
  console.log(`\nespacio listo: ${ESPACIO.nombre}`)
  console.log(`administrador registrado: ${admin} (queda reconocido en su primer login)`)

  await prepararRolDeLogin()
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally {
  await client.end().catch(() => {})
}

async function buscarOCrear(select, insert, params, paramsInsert = params) {
  const existente = await client.query(select, params)
  if (existente.rows[0]) return existente.rows[0].id
  const nuevo = await client.query(insert, paramsInsert)
  return nuevo.rows[0].id
}

/**
 * La app corre como `kaizen_login`, nunca como el dueno. Su URL se arma a
 * partir de la del dueno: mismo host, usuario y clave propios, y el pooler en
 * modo transaccion (6543) en vez del de sesion. `SET LOCAL ROLE` vive dentro
 * de la transaccion, asi que el modo transaccion lo respeta.
 */
async function prepararRolDeLogin() {
  const env = await readFile(ARCHIVO_ENV, 'utf8')
  const actual = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim()
  const yaConfigurada = actual && decodeURIComponent(new URL(actual).username).startsWith('kaizen_login')
  if (yaConfigurada && !rotarClave) {
    console.log('kaizen_login ya tenia DATABASE_URL; no se cambio la clave (usar --rotar-clave)')
    await probarConexion(actual)
    return
  }

  const clave = randomBytes(32).toString('base64url')
  await client.query(`alter role kaizen_login password ${client.escapeLiteral(clave)}`)

  const url = new URL(urlDueno)
  // Supavisor identifica el proyecto por el sufijo del usuario: postgres.<ref>.
  const [, ref] = decodeURIComponent(url.username).split('.')
  url.username = ref ? `kaizen_login.${ref}` : 'kaizen_login'
  url.password = clave
  if (url.hostname.endsWith('pooler.supabase.com')) url.port = '6543'

  const linea = `DATABASE_URL=${url.toString()}`
  const nuevo = /^DATABASE_URL=.*$/m.test(env)
    ? env.replace(/^DATABASE_URL=.*$/m, linea)
    : `${env.trimEnd()}\n${linea}\n`
  await writeFile(ARCHIVO_ENV, nuevo, 'utf8')
  console.log(`DATABASE_URL escrita en .env.produccion (usuario ${url.username}, puerto ${url.port || '5432'})`)

  await probarConexion(url.toString())
}

/** Prueba lo que la app hace en cada pedido: entrar y asumir una identidad. */
async function probarConexion(url) {
  const app = new pg.Client({ connectionString: url })
  await app.connect()
  try {
    await app.query('begin')
    await app.query('set local role kaizen_app')
    const { rows } = await app.query('select current_user as u')
    await app.query('rollback')
    console.log(`conexion de la app verificada: entra como kaizen_login y asume ${rows[0].u}`)

    // El worker descubre los espacios sin contexto (0025). Si esto da cero,
    // la ingesta en produccion no procesaria nunca nada, y sin fallar.
    await app.query('begin')
    await app.query('set local role kaizen_worker')
    const corpus = await app.query(`select count(*)::int as n from corpora where status = 'active'`)
    await app.query('rollback')
    if (corpus.rows[0].n === 0) salir('el worker no ve ningun corpus: la ingesta no funcionaria')
    console.log(`descubrimiento del worker verificado: ve ${corpus.rows[0].n} corpus activo(s)\n`)
  } finally {
    await app.end().catch(() => {})
  }
}
