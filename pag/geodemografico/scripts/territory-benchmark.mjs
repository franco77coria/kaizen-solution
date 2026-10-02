// Prueba reproducible de preparación SVG, sin sesión ni datos personales.
import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { geoArea, geoMercator, geoPath } from '../apps/web/node_modules/d3-geo/src/index.js'
const root = new URL('../apps/web/public/geo/', import.meta.url)
const results = []
for (const file of ['municipios.json', 'vista/municipios.json']) {
  const raw = await fs.readFile(new URL(file, root), 'utf8').catch(() => null)
  if (!raw) continue
  const runs = []
  let characters = 0
  for (let n = 0; n < 5; n++) {
    const start = performance.now()
    const collection = JSON.parse(raw)
    for (const f of collection.features) if (geoArea(f) > 2 * Math.PI) f.geometry.coordinates = f.geometry.type === 'Polygon' ? f.geometry.coordinates.map(r => r.reverse()) : f.geometry.coordinates.map(p => p.map(r => r.reverse()))
    const path = geoPath(geoMercator().fitExtent([[48, 26], [812, 414]], collection))
    characters = collection.features.reduce((sum, f) => sum + (path(f)?.length ?? 0), 0)
    runs.push(performance.now() - start)
  }
  results.push({ file, bytes: raw.length, pathCharacters: characters, medianPreparationMs: Math.round(runs.sort((a, b) => a - b)[2]) })
}
console.log(JSON.stringify(results, null, 2))
