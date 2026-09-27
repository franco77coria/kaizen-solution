/**
 * Redaccion por nombre de clave, aplicada en profundidad.
 * Regla de diseno: se redacta por DEFECTO. Una clave desconocida cuyo nombre
 * sugiere secreto o dato personal se redacta igual; no hay lista de permitidos
 * que haya que mantener al dia.
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /pass(word|phrase)?/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /refresh/i,
  /session[-_]?id/i,
  /email/i,
  /correo/i,
  /phone|telefono|celular/i,
  /documento|cedula|dni|nit/i,
  /full[-_]?name|nombre/i,
  /direccion|address/i,
  /content|body|text|quote|answer|message/i,
  /embedding|vector/i,
]

const REDACTED = '[redactado]'
const MAX_STRING = 200
const MAX_DEPTH = 6

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key))
}

function truncate(value: string): string {
  if (value.length <= MAX_STRING) return value
  return `${value.slice(0, MAX_STRING)}...[+${value.length - MAX_STRING}]`
}

export function redact(input: unknown, depth = 0): unknown {
  if (input === null || input === undefined) return input
  if (depth >= MAX_DEPTH) return '[profundidad-maxima]'

  if (typeof input === 'string') return truncate(input)
  if (typeof input === 'number' || typeof input === 'boolean') return input
  if (typeof input === 'bigint') return input.toString()
  if (input instanceof Date) return input.toISOString()

  if (input instanceof Error) {
    return {
      name: input.name,
      message: truncate(input.message),
      // El stack puede contener rutas y, en errores de driver, fragmentos de SQL
      // con valores. Se conserva solo la primera linea util.
      stack: input.stack ? truncate(input.stack.split('\n').slice(0, 4).join(' | ')) : undefined,
    }
  }

  if (Array.isArray(input)) {
    return input.slice(0, 50).map((item) => redact(item, depth + 1))
  }

  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redact(value, depth + 1)
    }
    return out
  }

  return '[no-serializable]'
}
