/**
 * Errores externos uniformes. El cliente nunca debe poder distinguir
 * "no existe" de "existe pero no es tuyo": ambos son NOT_FOUND.
 * El detalle real va al log interno, nunca a la respuesta.
 */
export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT',
  'RATE_LIMITED',
  'DEPENDENCY_REVOKED',
  'PROVIDER_UNAVAILABLE',
  'BUDGET_EXCEEDED',
  'INTERNAL',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  DEPENDENCY_REVOKED: 409,
  PROVIDER_UNAVAILABLE: 503,
  BUDGET_EXCEEDED: 429,
  INTERNAL: 500,
}

/** Mensajes fijos. No se interpolan datos: interpolar filtra existencia. */
const PUBLIC_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Necesitas iniciar sesion.',
  FORBIDDEN: 'No tenes permiso para esta operacion.',
  NOT_FOUND: 'No encontramos ese recurso.',
  VALIDATION_FAILED: 'La solicitud no es valida.',
  CONFLICT: 'La operacion no pudo completarse por un conflicto de estado.',
  RATE_LIMITED: 'Demasiadas solicitudes. Intentalo en unos momentos.',
  DEPENDENCY_REVOKED: 'Una fuente de esta operacion ya no esta disponible.',
  PROVIDER_UNAVAILABLE: 'Servicio temporalmente ocupado.',
  BUDGET_EXCEEDED: 'Se alcanzo el limite de uso configurado.',
  INTERNAL: 'Ocurrio un error inesperado.',
}

export class AppError extends Error {
  readonly code: ErrorCode
  /** Detalle interno para el log. Nunca se serializa al cliente. */
  readonly internalDetail: string | undefined
  readonly fieldErrors: Readonly<Record<string, string>> | undefined

  constructor(
    code: ErrorCode,
    internalDetail?: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(PUBLIC_MESSAGE[code])
    this.name = 'AppError'
    this.code = code
    this.internalDetail = internalDetail
    this.fieldErrors = fieldErrors
  }

  get status(): number {
    return STATUS[this.code]
  }

  /** Cuerpo seguro para el cliente. */
  toPublic(requestId: string): {
    error: { code: ErrorCode; message: string; requestId: string; fields?: Record<string, string> }
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId,
        ...(this.fieldErrors ? { fields: { ...this.fieldErrors } } : {}),
      },
    }
  }
}

export const unauthenticated = (d?: string) => new AppError('UNAUTHENTICATED', d)
export const forbidden = (d?: string) => new AppError('FORBIDDEN', d)
export const notFound = (d?: string) => new AppError('NOT_FOUND', d)
export const conflict = (d?: string) => new AppError('CONFLICT', d)
export const validationFailed = (d?: string, f?: Record<string, string>) =>
  new AppError('VALIDATION_FAILED', d, f)
export const dependencyRevoked = (d?: string) => new AppError('DEPENDENCY_REVOKED', d)
