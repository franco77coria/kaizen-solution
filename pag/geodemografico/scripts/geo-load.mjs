/**
 * Carga geometrias oficiales y ACTIVA una version de cartografia.
 *
 *   node --env-file=.env scripts/geo-load.mjs <geojson> <version> <fuente> <url>
 *
 * El GeoJSON debe ser un FeatureCollection con una propiedad de codigo
 * DIVIPOLA por feature. No se generan poligonos, no se simplifican fronteras
 * y no se inventa la geometria de un municipio ausente: si falta, se declara.
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { CUNDINAMARCA_MUNICIPALITIES } from '../packages/geography/dist/catalog.js'

const [archivo, version, fuente, url] = process.argv.slice(2)
if (!archivo || !version || !fuente || !url) {
  console.error('uso: node scripts/geo-load.mjs <geojson> <version> <nombre-fuente> <url-fuente>')
  console.error('La procedencia es obligatoria: una version sin fuente no se activa.')
  process.exit(1)
}

const conexion = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
if (!conexion) {
  console.error('falta DATABASE_URL')
  process.exit(1)
}

const geo = JSON.parse(await readFile(archivo, 'utf8'))
if (geo.type !== 'FeatureCollection') {
  console.error('el archivo debe ser un FeatureCollection de GeoJSON')
  process.exit(1)
}

const CAMPOS_CODIGO = ['MPIO_CDPMP', 'DPTOMPIO', 'codigo', 'COD_MPIO', 'mpio_cdpmp', 'divipola']

function codigoDe(props) {
  for (const campo of CAMPOS_CODIGO) {
    const valor = props?.[campo]
    if (valor !== undefined && valor !== null) {
      const codigo = String(valor).padStart(5, '0')
      if (/^\d{5}$/.test(codigo)) return codigo
    }
  }
  return null
}

function centroide(geometry) {
  const anillos =
    geometry.type === 'Polygon'
      ? geometry.coordinates.slice(0, 1)
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates.map((p) => p[0])
        : []

  let sx = 0
  let sy = 0
  let n = 0
  for (const anillo of anillos) {
    for (const par of anillo) {
      sx += par[0]
      sy += par[1]
      n++
    }
  }
  return n > 0 ? [sx / n, sy / n] : [null, null]
}

const client = new pg.Client({ connectionString: conexion })
await client.connect()

try {
  await client.query('begin')

  const { rows } = await client.query(
    `insert into geography_versions (version, source_name, source_url, crs, status, geometry_loaded)
     values ($1,$2,$3,'EPSG:4326','draft',false)
     on conflict (version) do update set source_name = excluded.source_name
     returning id`,
    [version, fuente, url],
  )
  const versionId = rows[0].id

  const esperados = new Set(CUNDINAMARCA_MUNICIPALITIES.map((m) => m.code))
  const cargados = new Set()
  let ignorados = 0

  for (const feature of geo.features) {
    const codigo = codigoDe(feature.properties)
    if (!codigo || !esperados.has(codigo)) {
      ignorados++
      continue
    }

    const nombre = CUNDINAMARCA_MUNICIPALITIES.find((m) => m.code === codigo)?.name ?? codigo
    const centro = centroide(feature.geometry)

    await client.query(
      `insert into areas
         (geography_version_id, level, code, name, parent_code, geometry, centroid_lon, centroid_lat)
       values ($1,'municipality',$2,$3,'25',$4,$5,$6)
       on conflict (geography_version_id, code) do update
         set geometry = excluded.geometry,
             centroid_lon = excluded.centroid_lon,
             centroid_lat = excluded.centroid_lat`,
      [versionId, codigo, nombre, JSON.stringify(feature.geometry), centro[0], centro[1]],
    )
    cargados.add(codigo)
  }

  // Los municipios sin geometria se registran con geometry NULL: la ausencia
  // se DECLARA, no se rellena ni se omite.
  const faltantes = [...esperados].filter((c) => !cargados.has(c))
  for (const codigo of faltantes) {
    const nombre = CUNDINAMARCA_MUNICIPALITIES.find((m) => m.code === codigo)?.name ?? codigo
    await client.query(
      `insert into areas (geography_version_id, level, code, name, parent_code, geometry)
       values ($1,'municipality',$2,$3,'25',null)
       on conflict (geography_version_id, code) do nothing`,
      [versionId, codigo, nombre],
    )
  }

  await client.query('commit')

  console.log(`\nversion: ${version}`)
  console.log(`geometrias cargadas:  ${cargados.size} de ${esperados.size}`)
  console.log(`sin geometria:        ${faltantes.length}`)
  if (faltantes.length) console.log(`  ${faltantes.join(', ')}`)
  console.log(`features ignorados:   ${ignorados} (fuera del departamento 25)`)

  if (faltantes.length > 0) {
    console.log('\nLa version queda en DRAFT: faltan geometrias.')
    console.log('Los mapas seguiran declarando la ausencia en vez de dibujar formas aproximadas.')
  } else {
    const { activarVersion } = await import('../packages/geography/dist/geometry.js')
    await activarVersion(client, versionId)
    console.log('\nVersion ACTIVADA: los mapas coropleticos ya pueden usarse.')
  }
  console.log('')
} catch (error) {
  await client.query('rollback').catch(() => {})
  console.error(`fallo la carga: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
