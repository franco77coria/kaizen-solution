import { z } from 'zod'
import { LIMITS } from './limits.js'

/** Esquemas estrictos de entrada. `.strict()` rechaza propiedades extra. */

export const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_SIZE_MAX).default(LIMITS.PAGE_SIZE_DEFAULT),
    cursor: z.string().max(200).optional(),
  })
  .strict()

export const createConversationSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
  })
  .strict()

export const postMessageSchema = z
  .object({
    content: z.string().min(1).max(LIMITS.MESSAGE_MAX_CHARS),
    /** Idempotencia: dos clics con la misma clave no duplican la operacion. */
    idempotencyKey: z.string().min(8).max(100),
  })
  .strict()

export const syncSourcesSchema = z
  .object({
    /** El ambito NO viene del cliente: se deriva de la sesion. Solo se pide el modo. */
    mode: z.enum(['incremental', 'full_reconcile']).default('incremental'),
    idempotencyKey: z.string().min(8).max(100),
  })
  .strict()

export const analyticsRunSchema = z
  .object({
    plan: z.unknown(),
    idempotencyKey: z.string().min(8).max(100),
  })
  .strict()

export const saveAnalysisSchema = z
  .object({
    runId: z.string().uuid(),
    title: z.string().min(1).max(120),
    /** Especificacion de la grafica asociada, opcional. */
    visualizationId: z.string().uuid().optional(),
  })
  .strict()

export const grantAnalysisSchema = z
  .object({
    /** Destinatario por identificador interno, nunca por email escrito a mano. */
    granteeUserId: z.string().uuid(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict()

/** Valores admitidos. La base tiene el mismo `check`: esto es la primera barrera, no la unica. */
export const GENDERS = ['femenino', 'masculino', 'no_binario', 'otro', 'prefiere_no_decir'] as const
export const RELATIONSHIPS = ['familia', 'amistad', 'vecindad', 'trabajo', 'comunidad', 'otra'] as const

export const captureRecordSchema = z
  .object({
    idempotencyKey: z.string().min(8).max(100),
    fullName: z.string().min(2).max(160),
    documentNumber: z.string().min(3).max(40),
    municipalityCode: z.string().regex(/^\d{5}$/),
    birthYear: z.number().int().min(1900).max(2026).optional(),
    phone: z.string().max(40).optional(),
    /** Datos del formulario de lideres. Genero admite "prefiere no decirlo". */
    gender: z.enum(GENDERS),
    relationship: z.enum(RELATIONSHIPS),
    usesWhatsapp: z.boolean(),
    occupation: z.string().trim().min(1).max(80).optional(),
    /** El check NUNCA viene premarcado desde el cliente; el servidor exige true explicito. */
    consentGiven: z.literal(true),
    /** Version del texto de consentimiento efectivamente mostrado. */
    consentTextVersion: z.string().min(1).max(40),
    /** Evidencia de la captura: firma, foto de formulario o registro verbal. */
    evidenceKind: z.enum(['firma_digital', 'formulario_papel', 'registro_verbal']),
    evidenceRef: z.string().min(1).max(200),
  })
  .strict()

export const reviewRecordSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z.string().min(3).max(500),
    /** Optimistic locking: si la version cambio, la revision se rechaza. */
    expectedVersion: z.number().int().min(1),
    idempotencyKey: z.string().min(8).max(100),
  })
  .strict()

export const referralLookupSchema = z
  .object({
    /** Consulta exacta. No hay busqueda por prefijo ni comodines. */
    documentNumber: z.string().min(3).max(40),
  })
  .strict()

export type PostMessageInput = z.infer<typeof postMessageSchema>
export type CaptureRecordInput = z.infer<typeof captureRecordSchema>
export type ReviewRecordInput = z.infer<typeof reviewRecordSchema>
