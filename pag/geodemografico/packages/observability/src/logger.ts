import { redact } from './redact.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

export interface LogContext {
  requestId?: string
  tenantId?: string
  userId?: string
  purposeId?: string
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, meta?: LogContext): void
  info(message: string, meta?: LogContext): void
  warn(message: string, meta?: LogContext): void
  error(tag: string, err: unknown, meta?: LogContext): void
  child(bindings: LogContext): Logger
}

interface LoggerOptions {
  level?: LogLevel
  /** Destino. Inyectable para poder probar la redaccion. */
  sink?: (line: string) => void
}

export function createLogger(bindings: LogContext = {}, options: LoggerOptions = {}): Logger {
  const minLevel = LEVEL_ORDER[options.level ?? (process.env['LOG_LEVEL'] as LogLevel) ?? 'info']
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`))

  function emit(level: LogLevel, message: string, meta?: LogContext): void {
    if (LEVEL_ORDER[level] < minLevel) return
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...(redact({ ...bindings, ...meta }) as Record<string, unknown>),
    }
    sink(JSON.stringify(payload))
  }

  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (tag, err, meta) => emit('error', tag, { ...meta, err: redact(err) }),
    child: (extra) => createLogger({ ...bindings, ...extra }, options),
  }
}

/** Logger por defecto del proceso. */
export const logger = createLogger({ service: process.env['SERVICE_NAME'] ?? 'api' })

export function logError(tag: string, err: unknown, meta?: LogContext): void {
  logger.error(tag, err, meta)
}
