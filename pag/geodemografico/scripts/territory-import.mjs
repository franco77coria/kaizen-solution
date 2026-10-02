/** Reconstruye cartografía y catálogo públicos. No toca bases ni secretos. */
import { mkdir, writeFile } from 'node:fs/promises'
import { CUNDINAMARCA_MUNICIPALITIES } from '../packages/geography/dist/catalog.js'

const municipal = 'https://services.arcgis.com/wLfHepIACaM0pwj9/arcgis/rest/services/MGN_MUNICIPIO_POLITICO/FeatureServer/0'
const rural = 'https://services7.arcgis.com/lsxbLWF2l19Rmhqj/arcgis/rest/services/CRVeredas_2020/FeatureServer/0'
const source = {
  municipality: { name: 'DANE · Marco Geoestadístico Nacional, publicación UPRA', url: municipal, licenseUrl: 'https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/' },
  vereda: { name: 'DANE / IDEC · Nivel de referencia de veredas 2020', url: rural, licenseUrl: 'https://www.arcgis.com/sharing/rest/content/items/ceb6771090e04c6d966d10e64a9a6720?f=pjson' },
  license: 'CC BY 4.0', attribution: 'Departamento Administrativo Nacional de Estadística - DANE: www.dane.gov.co. Publicación UPRA e IDEC Cundinamarca.',
  note: 'Cartografía de referencia estadística. No sustituye un deslinde. Coordenadas reproyectadas a EPSG:4326 y redondeadas a 5 decimales; sin simplificación de anillos.',
}
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`)
  const data = await response.json()
  if (data.error) throw new Error(JSON.stringify(data.error))
  return data
}
async function features(url, where, outFields) {
  const query = (args) => json(`${url}/query?${new URLSearchParams(args)}`)
  const count = await query({ f: 'json', where, returnCountOnly: 'true' })
  const all = []
  for (let offset = 0; offset < count.count; offset += 1000) {
    const page = await query({ f: 'geojson', where, outFields, outSR: '4326', geometryPrecision: '5', returnGeometry: 'true', resultOffset: String(offset), resultRecordCount: '1000' })
    if (page.type !== 'FeatureCollection' || !page.features?.length) throw new Error('Página geográfica incompleta')
    all.push(...page.features)
    console.log(`Descargados ${all.length}/${count.count} elementos`)
  }
  if (all.length !== count.count) throw new Error('La descarga no coincide con el conteo del servidor')
  return all
}
const [rawMunicipios, veredas] = await Promise.all([
  features(municipal, "DPTO_CCDGO = '25'", 'MPIO_CCNCT,MPIO_CNMBR,MPIO_NANO'),
  features(rural, "COD_DPTO = '25'", 'DPTOMPIO,CODIGO_VER,NOMBRE_VER,VIGENCIA'),
])
const expected = new Set(CUNDINAMARCA_MUNICIPALITIES.map(m => m.code))
// Ubalá tiene dos porciones desconectadas en la fuente. Se conserva cada
// polígono en un MultiPolygon, sin disolver ni inventar la conexión.
function combine(a, b) {
  return { type: 'MultiPolygon', coordinates: [
    ...(a.type === 'Polygon' ? [a.coordinates] : a.coordinates),
    ...(b.type === 'Polygon' ? [b.coordinates] : b.coordinates),
  ] }
}
const municipalByCode = new Map()
for (const f of rawMunicipios) {
  const code = String(f.properties.MPIO_CCNCT)
  const previous = municipalByCode.get(code)
  if (previous) previous.geometry = combine(previous.geometry, f.geometry)
  else municipalByCode.set(code, f)
}
const municipios = [...municipalByCode.values()]
const actual = new Set(municipios.map(f => String(f.properties.MPIO_CCNCT)))
if (municipios.length !== 116 || actual.size !== 116 || [...expected].some(code => !actual.has(code))) throw new Error('Los municipios no coinciden con los 116 códigos del proyecto')
function validateGeometry(geometry) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) throw new Error('Se requiere un polígono')
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const polygon of polygons) for (const ring of polygon) {
    if (ring.length < 4) throw new Error('Anillo inválido')
    for (const [lon, lat] of ring) if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -75 || lon > -72 || lat < 3 || lat > 7) throw new Error('Coordenadas fuera del recorte EPSG:4326 de Cundinamarca')
  }
}
const collection = (list, info) => ({ type: 'FeatureCollection', source: { ...info, ...source, fetchedAt: new Date().toISOString() }, features: list })
const output = new URL('../apps/web/public/geo/', import.meta.url)
await mkdir(new URL('veredas/', output), { recursive: true })
for (const feature of municipios) {
  validateGeometry(feature.geometry)
  feature.properties = { code: String(feature.properties.MPIO_CCNCT), name: feature.properties.MPIO_CNMBR, vintage: String(feature.properties.MPIO_NANO) }
  delete feature.id
}
await writeFile(new URL('municipios.json', output), JSON.stringify(collection(municipios, { level: 'municipality' })))
const catalog = new Map()
const groups = new Map()
for (const feature of veredas) {
  const p = feature.properties
  const code = String(p.CODIGO_VER).trim()
  const municipalityCode = String(p.DPTOMPIO).trim()
  if (!expected.has(municipalityCode) || !/^25\d{6}$/.test(code) || !code.startsWith(municipalityCode) || !p.NOMBRE_VER) throw new Error(`Vereda inválida: ${JSON.stringify(p)}`)
  validateGeometry(feature.geometry)
  const record = { code, municipalityCode, name: String(p.NOMBRE_VER).trim(), vintage: String(p.VIGENCIA ?? '') }
  if (catalog.has(code)) {
    const previous = groups.get(municipalityCode)?.find(f => f.properties.code === code)
    if (!previous || previous.properties.name !== record.name) throw new Error(`Código de vereda ambiguo ${code}`)
    previous.geometry = combine(previous.geometry, feature.geometry)
    continue
  }
  catalog.set(code, record)
  feature.properties = record
  delete feature.id
  if (!groups.has(municipalityCode)) groups.set(municipalityCode, [])
  groups.get(municipalityCode).push(feature)
}
for (const code of expected) {
  await writeFile(new URL(`veredas/${code}.json`, output), JSON.stringify(collection(groups.get(code) ?? [], { level: 'vereda', municipalityCode: code })))
}
const sorted = [...catalog.values()].sort((a, b) => a.code.localeCompare(b.code))
const catalogFile = new URL('../packages/geography/src/veredas.ts', import.meta.url)
await writeFile(catalogFile, `// Generado por scripts/territory-import.mjs. DANE / IDEC, referencia 2020, CC BY 4.0.\nexport interface VeredaEntry { code: string; municipalityCode: string; name: string; vintage: string }\nexport const VEREDAS: readonly VeredaEntry[] = ${JSON.stringify(sorted, null, 2)}\nconst POR_CODIGO = new Map(VEREDAS.map(v => [v.code, v]))\nexport function findVereda(code: string): VeredaEntry | undefined { return POR_CODIGO.get(code) }\nexport function veredasOf(municipalityCode: string): readonly VeredaEntry[] { return VEREDAS.filter(v => v.municipalityCode === municipalityCode) }\n`)
const sqlString = value => `'${value.replaceAll("'", "''")}'`
const rows = sorted.map(v => `(${[v.code, v.municipalityCode, v.name, v.vintage].map(sqlString).join(',')})`).join(',\n')
if (process.argv.includes('--create-migration')) await writeFile(new URL('../packages/db/migrations/0030_mapa_territorial.sql', import.meta.url), `-- Catálogo público de veredas DANE/IDEC, referencia 2020 (CC BY 4.0).\n-- Generado por scripts/territory-import.mjs. Nunca asignar ubicaciones a históricos.\ncreate table vereda_catalog (\n code text primary key check (code ~ '^25[0-9]{6}$'),\n municipality_code text not null references municipality_catalog(code),\n name text not null,\n vintage text not null,\n unique (municipality_code, code),\n check (left(code, 5) = municipality_code)\n);\ninsert into vereda_catalog (code, municipality_code, name, vintage) values\n${rows};\ngrant select on vereda_catalog to kaizen_app;\nalter table vereda_catalog enable row level security;\nalter table vereda_catalog force row level security;\ncreate policy vereda_catalog_lectura on vereda_catalog for select to kaizen_app using (true);\nalter table person_records add column vereda_code text;\nalter table person_records add constraint person_vereda_del_municipio foreign key (municipality_code, vereda_code) references vereda_catalog(municipality_code, code);\ncreate index person_territorio on person_records (tenant_id, purpose_id, municipality_code, vereda_code) where status in ('submitted', 'approved');\n-- Cierre explícito de roles REST, también con default privileges de Supabase.\ndo $$ declare rol text; begin\n foreach rol in array array['anon','authenticated'] loop\n  if exists (select 1 from pg_roles where rolname=rol) then\n   execute format('revoke all on vereda_catalog from %I', rol);\n  end if;\n end loop;\nend $$;\n`, { flag: 'wx' })
console.log(JSON.stringify({ municipalities: municipios.length, veredas: sorted.length, municipalitiesWithVeredas: groups.size, anapoima: groups.get('25035')?.length, municipalVintages: [...new Set(municipios.map(f => f.properties.vintage))] }))
