/**
 * Coteja el catalogo transcrito contra el archivo OFICIAL de DIVIPOLA.
 *
 *   node scripts/geo-verify.mjs <ruta-al-csv>
 *
 * El CSV debe tener una columna con el codigo de 5 digitos y otra con el
 * nombre del municipio. Se aceptan los encabezados habituales del DANE.
 *
 * Falla si hay UNA sola diferencia. El objetivo no es parecerse: es ser igual.
 */
import { readFile } from 'node:fs/promises'
import { CUNDINAMARCA_MUNICIPALITIES } from '../packages/geography/dist/catalog.js'

const ruta = process.argv[2]
if (!ruta) {
  console.error('uso: node scripts/geo-verify.mjs <ruta-al-csv-divipola>')
  process.exit(1)
}

const normalizar = (t) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const crudo = await readFile(ruta, 'utf8')
const lineas = crudo.split(/\r?\n/).filter((l) => l.trim().length > 0)
if (lineas.length < 2) {
  console.error('el archivo no tiene filas de datos')
  process.exit(1)
}

const puntoYComa = (lineas[0].match(/;/g) ?? []).length
const comas = (lineas[0].match(/,/g) ?? []).length
const separador = puntoYComa > comas ? ';' : ','

const encabezados = lineas[0]
  .split(separador)
  .map((h) => normalizar(h.replace(/^"|"$/g, '')))

const iCodigo = encabezados.findIndex((h) => /codigo.*municipio|cod.*mpio|divipola/.test(h))
const iNombre = encabezados.findIndex((h) => /nombre.*municipio|mpio|municipio/.test(h))

if (iCodigo === -1 || iNombre === -1) {
  console.error(`no se identificaron las columnas. Encabezados leidos: ${encabezados.join(' | ')}`)
  process.exit(1)
}

const oficiales = new Map()
for (const linea of lineas.slice(1)) {
  const celdas = linea.split(separador).map((c) => c.replace(/^"|"$/g, '').trim())
  const codigo = (celdas[iCodigo] ?? '').padStart(5, '0')
  if (!/^25\d{3}$/.test(codigo)) continue
  oficiales.set(codigo, celdas[iNombre] ?? '')
}

const transcritos = new Map(CUNDINAMARCA_MUNICIPALITIES.map((m) => [m.code, m.name]))

const faltantes = [...oficiales.keys()].filter((c) => !transcritos.has(c))
const sobrantes = [...transcritos.keys()].filter((c) => !oficiales.has(c))
const distintos = [...transcritos.entries()]
  .filter(([c, n]) => oficiales.has(c) && normalizar(oficiales.get(c)) !== normalizar(n))
  .map(([c, n]) => `${c}: transcrito "${n}" vs oficial "${oficiales.get(c)}"`)

console.log(`\nmunicipios en el archivo oficial (dpto 25): ${oficiales.size}`)
console.log(`municipios en el catalogo transcrito:       ${transcritos.size}\n`)

if (faltantes.length) console.log(`FALTAN ${faltantes.length}: ${faltantes.join(', ')}`)
if (sobrantes.length) console.log(`SOBRAN ${sobrantes.length}: ${sobrantes.join(', ')}`)
if (distintos.length) {
  console.log(`NOMBRES DISTINTOS ${distintos.length}:`)
  for (const d of distintos) console.log(`  ${d}`)
}

if (faltantes.length || sobrantes.length || distintos.length) {
  console.log('\nEl catalogo NO coincide con la fuente oficial. Corregir antes de usarlo.\n')
  process.exit(1)
}

console.log('El catalogo coincide exactamente con la fuente oficial.\n')
