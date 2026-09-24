import { z } from 'zod'

/**
 * QueryPlan cerrado. Es la UNICA forma de pedir una consulta analitica.
 * El modelo (o la UI guiada) produce este JSON; el compilador lo convierte
 * en una sentencia SQL de una plantilla registrada, con valores enlazados.
 * El modelo nunca escribe SQL ni elige tablas.
 */

/** Plantillas registradas. Agregar una plantilla es un cambio de codigo revisado. */
export const QUERY_TEMPLATES = [
  'records.count_by_municipality',
  'records.count_by_status',
  'records.count_by_age_band',
  'records.count_by_capture_month',
  'records.consent_breakdown',
  'records.count_by_gender',
  'records.total',
] as const

export type QueryTemplate = (typeof QUERY_TEMPLATES)[number]

/** Dimensiones permitidas por plantilla. Lista blanca, no texto libre. */
export const FILTER_FIELDS = [
  'municipality_code',
  'status',
  'age_band',
  'capture_month',
  'consent_state',
  'gender',
] as const

export type FilterField = (typeof FILTER_FIELDS)[number]

export const filterSchema = z
  .object({
    field: z.enum(FILTER_FIELDS),
    op: z.enum(['eq', 'in']),
    /** Valores escalares. Se enlazan como parametros, nunca se concatenan. */
    values: z.array(z.string().min(1).max(64)).min(1).max(150),
  })
  .strict()

export const queryPlanSchema = z
  .object({
    template: z.enum(QUERY_TEMPLATES),
    filters: z.array(filterSchema).max(5).default([]),
    /** Limite de filas. El servidor lo acota ademas por LIMITS. */
    limit: z.number().int().min(1).max(1_000).default(200),
  })
  .strict()

export type QueryPlan = z.infer<typeof queryPlanSchema>
export type QueryFilter = z.infer<typeof filterSchema>

/**
 * Resultado de una ejecucion analitica. Un grupo suprimido NO es cero:
 * lleva suppressed=true y value=null, y se serializa distinto de un cero real.
 */
export interface AnalyticsCell {
  key: string
  label: string
  value: number | null
  suppressed: boolean
}

export interface AnalyticsResult {
  template: QueryTemplate
  rows: AnalyticsCell[]
  /** Total de filas antes de suprimir. */
  totalGroups: number
  suppressedGroups: number
  suppressionThreshold: number
  executedAt: string
  /** Epoch de privacidad vigente al ejecutar. Invalida snapshots viejos. */
  privacyEpoch: number
}
