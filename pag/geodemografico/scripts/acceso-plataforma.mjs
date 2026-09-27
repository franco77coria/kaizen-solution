/**
 * Otorga a la cuenta operadora de la plataforma acceso a TODOS los espacios.
 *
 *   node --env-file=.env scripts/acceso-plataforma.mjs gerencia@kaizensolutionscol.com
 *   node --env-file=.env scripts/acceso-plataforma.mjs <email> --revocar
 *
 * DECISION DE DISENO IMPORTANTE.
 *
 * Esto NO se implementa como un permiso global ni como un rol que saltee RLS.
 * Se implementa como MEMBRESIAS Y CONCESIONES EXPLICITAS, una por espacio,
 * exactamente iguales a las de cualquier otro usuario.
 *
 * Por que importa la diferencia:
 *
 *   - Un flag de superusuario seria una rama en el codigo que decide "este no
 *     pasa por el control". Toda la garantia de aislamiento se apoya en que
 *     NO existe esa rama: sin contexto, la base devuelve cero filas, siempre.
 *     Una sola excepcion convierte el invariante en una convencion.
 *
 *   - El acceso queda ENUMERABLE: se puede consultar en `memberships` y en
 *     `purpose_grants` quien ve que, sin leer codigo.
 *
 *   - Queda REVOCABLE por espacio: se puede quitar el acceso a una alcaldia
 *     concreta sin tocar el resto.
 *
 *   - Queda AUDITABLE: cada consulta de gerencia lleva su contexto de tenant,
 *     igual que la de cualquiera, y aparece en la auditoria igual.
 *
 * El costo real, que conviene tener presente: una sola cuenta que puede leer
 * las notas de los 116 municipios es un blanco valioso. Con MFA y sesiones
 * cortas sigue siendo un riesgo concentrado, y conviene revisarlo cuando el
 * despliegue crezca.
 */
import pg from 'pg'

const email = process.argv[2]
const revocar = process.argv.includes('--revocar')

if (!email) {
  console.error('uso: node scripts/acceso-plataforma.mjs <email> [--revocar]')
  process.exit(1)
}

const PERMISOS = [
  'notes.read',
  'sources.manage',
  'analytics.aggregate',
  'analyses.save',
  'analyses.share',
]

const conexion = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
const client = new pg.Client({ connectionString: conexion })
await client.connect()

try {
  const usuario = await client.query(
    'select id, issuer, subject from users where lower(email_display) = lower($1)',
    [email],
  )

  if (usuario.rows.length === 0) {
    console.error(
      `\nNo existe un usuario con ese email.\n` +
        `La identidad se fija en el PRIMER login real de Google: la cuenta tiene que\n` +
        `haber entrado al menos una vez antes de poder otorgarle acceso.\n`,
    )
    process.exit(1)
  }

  const userId = usuario.rows[0].id

  const espacios = await client.query(
    `select t.id as tenant_id, t.name, p.id as purpose_id, p.code
       from tenants t
       join data_purposes p on p.tenant_id = t.id and p.status = 'active'
      where t.status = 'active'
      order by t.name, p.code`,
  )

  let membresias = 0
  let concesiones = 0

  for (const e of espacios.rows) {
    if (revocar) {
      await client.query(
        `update purpose_grants set status = 'revoked'
          where tenant_id = $1 and purpose_id = $2 and user_id = $3`,
        [e.tenant_id, e.purpose_id, userId],
      )
      concesiones++
      continue
    }

    // Membresia explicita, igual que la de cualquier miembro del espacio.
    const m = await client.query(
      `insert into memberships (tenant_id, user_id, role)
       values ($1,$2,'operador_plataforma')
       on conflict (tenant_id, user_id) do update set status = 'active'
       returning (xmax = 0) as nueva`,
      [e.tenant_id, userId],
    )
    if (m.rows[0]?.nueva) membresias++

    for (const permiso of PERMISOS) {
      await client.query(
        `insert into purpose_grants (tenant_id, purpose_id, user_id, permission, granted_by)
         values ($1,$2,$3,$4,$3)
         on conflict (tenant_id, purpose_id, user_id, permission)
           do update set status = 'active'`,
        [e.tenant_id, e.purpose_id, userId, permiso],
      )
      concesiones++
    }
  }

  if (revocar) {
    console.log(`\nacceso revocado en ${espacios.rows.length} espacio(s).\n`)
  } else {
    console.log(`\ncuenta: ${email}`)
    console.log(`espacios alcanzados:  ${espacios.rows.length}`)
    console.log(`membresias nuevas:    ${membresias}`)
    console.log(`concesiones activas:  ${concesiones}`)
    console.log(
      `\nNO se concedio records.read_sensitive: consultar fichas nominales de\n` +
        `personas es un permiso aparte y se otorga caso por caso.\n` +
        `\nEste acceso NO es automatico para espacios futuros: al crear una\n` +
        `alcaldia nueva hay que volver a correr este script. Es a proposito, para\n` +
        `que sumar un espacio al alcance de una cuenta sea una decision y no un\n` +
        `efecto secundario.\n`,
    )
  }
} finally {
  await client.end().catch(() => {})
}
