import type { FilterField, QueryTemplate } from '@kaizen/contracts'

/**
 * Catalogo de plantillas SQL. Cada entrada es una sentencia ESTATICA escrita
 * a mano y revisada. Nada aqui se construye por concatenacion con datos del
 * usuario: los filtros se agregan como predicados fijos con parametros
 * enlazados, elegidos de una lista blanca.
 *
 * El modelo NUNCA escribe SQL, no elige tablas ni columnas, y no puede
 * agregar una plantilla: agregar una es un cambio de codigo revisado.
 */
export interface TemplateDefinition {
  /** Expresion de agrupacion. Constante del codigo, jamas entrada de usuario. */
  groupExpression: string
  groupLabel: string
  /** Campos por los que esta plantilla admite filtrar. */
  allowedFilters: readonly FilterField[]
  /** Permiso necesario para ejecutarla. */
  permission: 'analytics.aggregate'
  description: string
}

/** Predicados fijos, uno por campo permitido. El valor va como parametro. */
export const FILTER_PREDICATES: Record<FilterField, string> = {
  municipality_code: 'r.municipality_code',
  status: 'r.status',
  age_band: `case
      when r.birth_year is null then 'desconocida'
      when (extract(year from now()) - r.birth_year) < 18 then 'menor'
      when (extract(year from now()) - r.birth_year) < 30 then '18-29'
      when (extract(year from now()) - r.birth_year) < 45 then '30-44'
      when (extract(year from now()) - r.birth_year) < 60 then '45-59'
      else '60+'
    end`,
  capture_month: `to_char(r.created_at, 'YYYY-MM')`,
  // Los registros anteriores al campo no tienen genero: se agrupan como
  // 'sin_dato' en vez de desaparecer del grafico.
  gender: `coalesce(r.gender, 'sin_dato')`,
  consent_state: `case when exists (
      select 1 from consent_records c
       where c.tenant_id = r.tenant_id and c.record_id = r.id and c.withdrawn_at is null
    ) then 'vigente' else 'sin_consentimiento_vigente' end`,
}

export const TEMPLATES: Record<QueryTemplate, TemplateDefinition> = {
  'records.count_by_municipality': {
    groupExpression: FILTER_PREDICATES.municipality_code,
    groupLabel: 'municipio',
    allowedFilters: ['municipality_code', 'status', 'age_band', 'capture_month', 'consent_state', 'gender'],
    permission: 'analytics.aggregate',
    description: 'Cantidad de registros por municipio',
  },
  'records.count_by_status': {
    groupExpression: FILTER_PREDICATES.status,
    groupLabel: 'estado',
    allowedFilters: ['municipality_code', 'capture_month'],
    permission: 'analytics.aggregate',
    description: 'Cantidad de registros por estado de revision',
  },
  'records.count_by_age_band': {
    groupExpression: FILTER_PREDICATES.age_band,
    groupLabel: 'franja etaria',
    allowedFilters: ['municipality_code', 'status', 'age_band', 'capture_month', 'consent_state', 'gender'],
    permission: 'analytics.aggregate',
    description: 'Cantidad de registros por franja etaria',
  },
  'records.count_by_capture_month': {
    groupExpression: FILTER_PREDICATES.capture_month,
    groupLabel: 'mes de captura',
    allowedFilters: ['municipality_code', 'status', 'age_band', 'capture_month', 'consent_state', 'gender'],
    permission: 'analytics.aggregate',
    description: 'Cantidad de registros por mes de captura',
  },
  'records.consent_breakdown': {
    groupExpression: FILTER_PREDICATES.consent_state,
    groupLabel: 'estado de consentimiento',
    allowedFilters: ['municipality_code', 'status'],
    permission: 'analytics.aggregate',
    description: 'Registros segun vigencia del consentimiento',
  },
  'records.count_by_gender': {
    groupExpression: FILTER_PREDICATES.gender,
    groupLabel: 'genero',
    allowedFilters: ['municipality_code', 'status', 'age_band', 'capture_month', 'consent_state', 'gender'],
    permission: 'analytics.aggregate',
    description: 'Cantidad de personas por genero',
  },
  'records.total': {
    groupExpression: `'total'`,
    groupLabel: 'total',
    allowedFilters: ['municipality_code', 'status', 'age_band', 'capture_month', 'consent_state', 'gender'],
    permission: 'analytics.aggregate',
    description: 'Total de registros',
  },
}
