import { LIMITS, queryPlanSchema, validationFailed, type QueryPlan } from '@kaizen/contracts'
import { FILTER_PREDICATES, TEMPLATES } from './templates.js'

/**
 * Compila un QueryPlan validado a una sentencia SQL con valores enlazados.
 *
 * Propiedades que esta funcion garantiza:
 *   - La sentencia resultante es ESTABLE: depende solo de la plantilla y de
 *     que campos se filtran, nunca de los valores. Dos planes con los mismos
 *     campos y distintos valores producen el mismo texto SQL.
 *   - Ningun valor del usuario se interpola en el texto. Todos van como $n.
 *   - Un campo fuera de la lista blanca de la plantilla se rechaza; no se
 *     ignora en silencio, porque ignorar un filtro cambia el resultado.
 *
 * No lleva filtro de tenant: corre dentro de withAuthorizedTransaction y RLS
 * ya acota las filas. Ver el comentario equivalente en retrieval/search.ts.
 */
export interface CompiledQuery {
  text: string
  values: unknown[]
  groupLabel: string
}

export function parseQueryPlan(input: unknown): QueryPlan {
  const parsed = queryPlanSchema.safeParse(input)
  if (!parsed.success) {
    // `.strict()` en el schema hace que una propiedad extra sea un error, no
    // algo que se descarte: un payload con campos de mas es sospechoso.
    throw validationFailed(
      `plan invalido: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.code}`).join('; ')}`,
    )
  }
  return parsed.data
}

export function compileQueryPlan(plan: QueryPlan): CompiledQuery {
  const template = TEMPLATES[plan.template]
  if (!template) throw validationFailed('plantilla desconocida')

  const values: unknown[] = []
  const predicados: string[] = []

  const camposUsados = new Set<string>()
  for (const filtro of plan.filters) {
    if (!template.allowedFilters.includes(filtro.field)) {
      throw validationFailed(
        `la plantilla ${plan.template} no admite filtrar por ${filtro.field}`,
      )
    }
    if (camposUsados.has(filtro.field)) {
      throw validationFailed(`filtro duplicado para ${filtro.field}`)
    }
    camposUsados.add(filtro.field)

    const expresion = FILTER_PREDICATES[filtro.field]

    if (filtro.op === 'eq') {
      if (filtro.values.length !== 1) {
        throw validationFailed('el operador eq admite exactamente un valor')
      }
      values.push(filtro.values[0])
      predicados.push(`(${expresion}) = $${values.length}`)
    } else {
      // `= any($n)` con un array enlazado evita construir una lista de
      // marcadores variable, que es donde suele colarse la concatenacion.
      values.push(filtro.values)
      predicados.push(`(${expresion}) = any($${values.length}::text[])`)
    }
  }

  const limite = Math.min(plan.limit, LIMITS.ANALYTICS_MAX_ROWS)
  values.push(limite)
  const limiteParam = `$${values.length}`

  const where = predicados.length > 0 ? `and ${predicados.join(' and ')}` : ''

  // Una persona cuenta APENAS SE SUMA ('submitted'), no recien al aprobarla:
  // es como funciona la carga de lideres, y lo decidio el usuario. La revision
  // pasa a ser verificacion posterior: rechazar o retirar la saca de los
  // totales. Los borradores no cuentan porque todavia no se enviaron.
  const text = `
    select (${template.groupExpression})::text as grupo,
           count(*)::int as cantidad
      from person_records r
     where r.status in ('submitted', 'approved')
       ${where}
     group by 1
     order by 2 desc, 1 asc
     limit ${limiteParam}
  `.trim()

  return { text, values, groupLabel: template.groupLabel }
}
