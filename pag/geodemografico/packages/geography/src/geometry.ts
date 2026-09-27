import type { PoolClient } from 'pg'

/**
 * Geometrias territoriales versionadas.
 *
 * Reglas del plan que este modulo hace cumplir:
 *   - Las geometrias vienen de una fuente oficial declarada. Una version sin
 *     `source_name` y `source_url` no puede activarse.
 *   - No se generan poligonos con IA ni se dibujan a mano. Si falta la
 *     geometria de un municipio, se DECLARA la ausencia; no se rellena con
 *     una forma aproximada ni con el centroide de otro.
 *   - El CRS se registra. Mezclar EPSG:4326 con EPSG:3116 desplaza el mapa
 *     entero sin que se note a simple vista.
 */
export interface GeographyVersion {
  id: string
  version: string
  sourceName: string
  sourceUrl: string
  crs: string
  status: 'draft' | 'active' | 'retired'
  geometryLoaded: boolean
  note: string | null
}

export interface AreaGeometry {
  code: string
  name: string
  /** GeoJSON. null declara ausencia explicita, no "todavia no lo busque". */
  geometry: unknown | null
  centroid: { lon: number; lat: number } | null
}

export async function getActiveVersion(client: PoolClient): Promise<GeographyVersion | null> {
  const { rows } = await client.query<{
    id: string
    version: string
    source_name: string
    source_url: string
    crs: string
    status: 'draft' | 'active' | 'retired'
    geometry_loaded: boolean
    note: string | null
  }>(
    `select id, version, source_name, source_url, crs, status, geometry_loaded, note
       from geography_versions
      where status = 'active'
      order by created_at desc
      limit 1`,
  )

  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    version: row.version,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    crs: row.crs,
    status: row.status,
    geometryLoaded: row.geometry_loaded,
    note: row.note,
  }
}

export async function listAreas(
  client: PoolClient,
  versionId: string,
  level: 'department' | 'municipality',
): Promise<AreaGeometry[]> {
  const { rows } = await client.query<{
    code: string
    name: string
    geometry: unknown | null
    centroid_lon: number | null
    centroid_lat: number | null
  }>(
    `select code, name, geometry, centroid_lon, centroid_lat
       from areas
      where geography_version_id = $1 and level = $2
      order by code`,
    [versionId, level],
  )

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    geometry: r.geometry,
    centroid:
      r.centroid_lon !== null && r.centroid_lat !== null
        ? { lon: r.centroid_lon, lat: r.centroid_lat }
        : null,
  }))
}

/**
 * Activa una version. Falla si falta procedencia o si no se cargo ninguna
 * geometria: activar una version vacia produciria mapas en blanco que se
 * leerian como "no hay datos" en vez de como "falta la cartografia".
 */
export async function activarVersion(client: PoolClient, versionId: string): Promise<void> {
  const { rows } = await client.query<{
    source_name: string
    source_url: string
    con_geometria: string
    total: string
  }>(
    `select v.source_name,
            v.source_url,
            count(a.id) filter (where a.geometry is not null)::text as con_geometria,
            count(a.id)::text as total
       from geography_versions v
       left join areas a on a.geography_version_id = v.id
      where v.id = $1
      group by v.id, v.source_name, v.source_url`,
    [versionId],
  )

  const row = rows[0]
  if (!row) throw new Error('version de geografia inexistente')
  if (!row.source_name.trim() || !row.source_url.trim()) {
    throw new Error('no se puede activar una version sin procedencia declarada')
  }
  if (Number(row.con_geometria) === 0) {
    throw new Error('no se puede activar una version sin ninguna geometria cargada')
  }

  await client.query(`update geography_versions set status = 'retired' where status = 'active'`)
  await client.query(
    `update geography_versions set status = 'active', geometry_loaded = true where id = $1`,
    [versionId],
  )
}
