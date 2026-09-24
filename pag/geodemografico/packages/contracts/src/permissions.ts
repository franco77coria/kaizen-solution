/**
 * Permisos por (usuario, tenant, proposito). Ninguno implica a otro:
 * leer notas no habilita analitica, y analitica agregada no habilita
 * consultar fichas nominales.
 */
export const PERMISSIONS = [
  'notes.read',
  'sources.manage',
  'analytics.aggregate',
  'records.capture',
  'records.review',
  'records.read_sensitive',
  'analyses.save',
  'analyses.share',
  'tenant.admin',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

/** Roles de conveniencia para el alta administrativa. La autoridad sigue siendo purpose_grants. */
export const ROLE_PRESETS = {
  lector_notas: ['notes.read'],
  gestor_fuentes: ['notes.read', 'sources.manage'],
  analista: ['notes.read', 'analytics.aggregate', 'analyses.save'],
  capturador: ['records.capture'],
  revisor: ['records.review'],
  administrador: ['tenant.admin', 'sources.manage'],
} as const satisfies Record<string, readonly Permission[]>

export type RolePreset = keyof typeof ROLE_PRESETS

export const TENANT_KINDS = ['municipality', 'campaign', 'internal_pilot'] as const
export type TenantKind = (typeof TENANT_KINDS)[number]

export const ARTIFACT_TYPES = ['meeting_notes', 'transcript', 'manual_document'] as const
export type ArtifactType = (typeof ARTIFACT_TYPES)[number]
