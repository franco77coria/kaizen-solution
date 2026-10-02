// Derivados para pantalla. Los límites publicados originales no se modifican.
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import mapshaper from 'mapshaper'
import { geoArea } from '../apps/web/node_modules/d3-geo/src/index.js'

const root = new URL('../apps/web/public/geo/', import.meta.url)
const files = ['municipios.json', ...(await fs.readdir(new URL('veredas/', root))).filter(f => f.endsWith('.json')).map(f => `veredas/${f}`)]
let before = 0, after = 0
for (const file of files) {
  const raw = await fs.readFile(new URL(file, root), 'utf8')
  const original = JSON.parse(raw)
  const output = await new Promise((resolve, reject) => mapshaper.applyCommands('-i entrada.json -simplify 8% keep-shapes -o salida.json format=geojson precision=0.00001', { 'entrada.json': raw }, (error, data) => error ? reject(error) : resolve(data)))
  const reduced = JSON.parse(output['salida.json'].toString())
  const byCode = new Map(reduced.features.map(f => [f.properties.code, f]))
  const features = original.features.map(f => {
    const small = byCode.get(f.properties.code)
    if (!small?.geometry) throw new Error(`Se perdió el territorio ${f.properties.code}`)
    const parts = g => g.type === 'MultiPolygon' ? g.coordinates.length : 1
    const area = geoArea(f)
    // Si algún componente pequeño desaparece, conservar la geometría completa.
    return { ...f, geometry: parts(small.geometry) < parts(f.geometry) ? f.geometry : small.geometry, properties: { ...f.properties, areaHa: (area > 2 * Math.PI ? 4 * Math.PI - area : area) * 6378137 ** 2 / 10000 } }
  })
  if (features.length !== original.features.length || byCode.size !== features.length) throw new Error(`Cobertura inválida: ${file}`)
  const data = JSON.stringify({ ...original, display: { method: 'mapshaper weighted, 8% keep-shapes', original: `/app/geo/${file}`, purpose: 'Visualización simplificada; áreas calculadas sobre los límites originales.' }, features })
  const target = new URL(`vista/${file}`, root)
  await fs.mkdir(fileURLToPath(new URL('./', target)), { recursive: true })
  await fs.writeFile(target, data)
  before += Buffer.byteLength(raw); after += Buffer.byteLength(data)
}
console.log(JSON.stringify({ files: files.length, originalBytes: before, displayBytes: after, reductionPercent: Math.round(100 * (1 - after / before)) }))
