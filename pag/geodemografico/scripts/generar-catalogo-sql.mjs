/**
 * Genera el bloque de datos de la migracion 0020 desde el paquete de geografia.
 *
 * La fuente es UNA: `packages/geography`. La migracion lleva los 116 municipios
 * como filas literales porque una migracion no puede importar codigo, pero no
 * se escriben a mano: se generan con este script, y la prueba
 * `catalogo-sql.test.ts` falla si el archivo y el paquete dejan de coincidir.
 * Dos copias de una misma regla que se mantienen a mano terminan divergiendo.
 *
 *   node scripts/generar-catalogo-sql.mjs > /tmp/filas.sql
 */
import {
  CUNDINAMARCA_MUNICIPALITIES,
  displayName,
  provinceOf,
} from '../packages/geography/dist/index.js'

const q = (s) => `'${s.replaceAll("'", "''")}'`

const filas = CUNDINAMARCA_MUNICIPALITIES.map((m) => {
  const p = provinceOf(m.code)
  return `  (${q(m.code)}, ${q(m.name)}, ${q(displayName(m.code))}, ${q(p.id)}, ${q(p.name)})`
})

process.stdout.write(filas.join(',\n') + '\n')
