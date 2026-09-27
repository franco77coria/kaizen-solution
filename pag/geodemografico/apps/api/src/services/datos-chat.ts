import type { PoolClient } from 'pg'
import type {
  AnalyticsCell,
  AnalyticsResult,
  QueryPlan,
  QueryTemplate,
  RespuestaDatos,
} from '@kaizen/contracts'
import { displayName } from '@kaizen/geography'

/**
 * Como SUMA cuenta un resultado analitico en palabras.
 *
 * Todo es determinista: el texto se arma con el resultado ya suprimido, sin
 * pasar por el modelo. Un modelo que "redacta" un numero puede redondearlo,
 * sumarle un grupo suprimido o inventar uno; aca no hay forma.
 */

const TITULOS: Record<QueryTemplate, string> = {
  'records.total': 'Personas sumadas',
  'records.count_by_municipality': 'Personas sumadas por municipio',
  'records.count_by_status': 'Personas sumadas por estado de revisión',
  'records.count_by_age_band': 'Personas sumadas por franja de edad',
  'records.count_by_capture_month': 'Personas sumadas por mes',
  'records.consent_breakdown': 'Personas sumadas por estado del consentimiento',
  'records.count_by_gender': 'Personas sumadas por género',
}

const GENEROS: Record<string, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  no_binario: 'No binario',
  otro: 'Otro',
  prefiere_no_decir: 'Prefiere no decirlo',
  sin_dato: 'Sin dato',
}

const ESTADOS: Record<string, string> = {
  submitted: 'Enviadas',
  approved: 'Aprobadas',
  rejected: 'Rechazadas',
  withdrawn: 'Retiradas',
}

const CONSENTIMIENTO: Record<string, string> = {
  vigente: 'Con consentimiento vigente',
  sin_consentimiento_vigente: 'Sin consentimiento vigente',
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Etiqueta legible de un grupo, a partir de su CLAVE (no de su label crudo). */
export function etiquetaGrupo(template: QueryTemplate, clave: string): string {
  switch (template) {
    case 'records.count_by_municipality':
      return displayName(clave)
    case 'records.count_by_gender':
      return GENEROS[clave] ?? clave
    case 'records.count_by_status':
      return ESTADOS[clave] ?? clave
    case 'records.consent_breakdown':
      return CONSENTIMIENTO[clave] ?? clave
    case 'records.count_by_capture_month': {
      const [anio, mes] = clave.split('-')
      const nombre = MESES[Number(mes) - 1]
      return nombre && anio ? `${nombre} ${anio}` : clave
    }
    case 'records.count_by_age_band':
      return clave === 'desconocida' ? 'Edad desconocida' : clave === 'menor' ? 'Menores' : `${clave} años`
    default:
      return clave
  }
}

/** Titulo y filtros en palabras. Los filtros se muestran SIEMPRE junto al numero. */
export function describirPlan(plan: QueryPlan): { titulo: string; filtros: string[] } {
  const filtros = plan.filters.map((f) => {
    if (f.field === 'municipality_code') return `Municipio: ${f.values.map(displayName).join(', ')}`
    return `${f.field}: ${f.values.join(', ')}`
  })
  return { titulo: TITULOS[plan.template], filtros }
}

const numero = new Intl.NumberFormat('es-CO')

function lista(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** La respuesta en una o dos oraciones. Los datos completos van en `datos`. */
export function redactarDatos(datos: RespuestaDatos): string {
  const { resultado, filtros } = datos
  const donde = filtros.length > 0 ? ` (${filtros.join('; ')})` : ''

  if (resultado.template === 'records.total') {
    const celda = resultado.rows[0]
    if (!celda || celda.value === 0) return `Todavía no hay personas sumadas${donde}.`
    if (celda.suppressed || celda.value === null) {
      return `Hay menos de ${resultado.suppressionThreshold} personas sumadas${donde}: la cifra exacta no se muestra para que nadie pueda ser identificado.`
    }
    return `Hay ${numero.format(celda.value)} ${celda.value === 1 ? 'persona sumada' : 'personas sumadas'}${donde}.`
  }

  const visibles = resultado.rows.filter(
    (c): c is AnalyticsCell & { value: number } => !c.suppressed && c.value !== null,
  )
  if (resultado.rows.length === 0) return `Todavía no hay personas sumadas${donde}.`

  const partes: string[] = []
  const mayores = [...visibles].sort((a, b) => b.value - a.value).slice(0, 3)
  if (mayores.length > 0) {
    partes.push(
      `${datos.titulo}${donde}: ${lista(
        mayores.map((c) => `${etiquetaGrupo(resultado.template, c.key)} (${numero.format(c.value)})`),
      )}${visibles.length > mayores.length ? ', entre otros' : ''}.`,
    )
  } else {
    partes.push(`${datos.titulo}${donde}: todos los grupos tienen menos de ${resultado.suppressionThreshold} personas.`)
  }
  if (resultado.suppressedGroups > 0) {
    partes.push(
      `${resultado.suppressedGroups} ${resultado.suppressedGroups === 1 ? 'grupo figura' : 'grupos figuran'} como n/d porque ${resultado.suppressedGroups === 1 ? 'tiene' : 'tienen'} menos de ${resultado.suppressionThreshold} personas o ${resultado.suppressedGroups === 1 ? 'permitiría' : 'permitirían'} deducir a alguien.`,
    )
  }
  return partes.join(' ')
}

/**
 * Los datos de un mensaje ya guardado, a partir de su ejecucion. Se usa al
 * releer una respuesta y al cargar una conversacion: la tabla vuelve a
 * mostrarse tal como se respondio (el resultado es el guardado, no uno nuevo).
 */
export async function leerDatosDeEjecucion(
  client: PoolClient,
  runId: string | null,
): Promise<RespuestaDatos | undefined> {
  if (!runId) return undefined
  const { rows } = await client.query<{ id: string; plan: QueryPlan; result: AnalyticsResult }>(
    `select id, plan, result from analytics_runs where id = $1`,
    [runId],
  )
  const fila = rows[0]
  if (!fila) return undefined
  const { titulo, filtros } = describirPlan(fila.plan)
  return { runId: fila.id, template: fila.plan.template, titulo, filtros, resultado: fila.result }
}
