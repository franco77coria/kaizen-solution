import { AppError } from '@kaizen/contracts'
import { logger } from '@kaizen/observability'

/**
 * Ticket 15 — admision, limites y cortocircuito.
 *
 * Criterio de aceptacion del plan: "Fallo de Redis no abre acceso ilimitado".
 * Por eso hay DOS capas:
 *
 *   1. Un limitador distribuido (Redis) cuando esta configurado.
 *   2. Un limitador LOCAL en memoria que se aplica SIEMPRE, incluso si el
 *      distribuido responde bien.
 *
 * Si el distribuido falla, no se "permite y se sigue": se cae al limitador
 * local, que es mas estricto. Degradar hacia menos control seria convertir
 * una caida de Redis en una barra libre.
 */
export interface RateLimitRule {
  /** Ventana en milisegundos. */
  windowMs: number
  /** Maximo de operaciones por ventana. */
  max: number
  /** Maximo local por instancia cuando el distribuido no esta disponible. */
  fallbackMax: number
}

/**
 * En desarrollo todo el trafico sale de 127.0.0.1, asi que los limites por IP
 * bloquean a la unica persona que esta probando. Se multiplican; NO se apagan:
 * un limitador que en local no corre nunca es un limitador que nadie probo.
 */
const FACTOR_LOCAL = process.env['APP_ENV'] === 'local' ? 20 : 1

const escalar = (r: RateLimitRule): RateLimitRule => ({
  windowMs: r.windowMs,
  max: r.max * FACTOR_LOCAL,
  fallbackMax: r.fallbackMax * FACTOR_LOCAL,
})

export const RULES = {
  chat: escalar({ windowMs: 60_000, max: 20, fallbackMax: 10 }),
  analytics: escalar({ windowMs: 60_000, max: 30, fallbackMax: 15 }),
  sync: escalar({ windowMs: 300_000, max: 3, fallbackMax: 2 }),

  /**
   * El inicio del flujo solo ARMA una URL: no valida nada, no consulta a
   * Google y no crea sesion. Limitarlo como si fuera un intento de
   * credenciales confunde dos cosas distintas y bloquea a gente legitima que
   * abrio dos pestanas o volvio atras en el navegador.
   */
  login_inicio: escalar({ windowMs: 300_000, max: 40, fallbackMax: 20 }),

  /**
   * El callback SI hace el canje del codigo contra Google y crea la sesion.
   * Ese es el endpoint que vale la pena proteger.
   */
  login_callback: escalar({ windowMs: 300_000, max: 12, fallbackMax: 6 }),

  render: escalar({ windowMs: 60_000, max: 20, fallbackMax: 10 }),
  lookup: escalar({ windowMs: 60_000, max: 10, fallbackMax: 5 }),
} as const satisfies Record<string, RateLimitRule>

export type RuleName = keyof typeof RULES

interface Contador {
  hasta: number
  usos: number
}

const local = new Map<string, Contador>()

function consumirLocal(clave: string, regla: RateLimitRule, max: number): boolean {
  const ahora = Date.now()
  const actual = local.get(clave)

  if (!actual || actual.hasta <= ahora) {
    local.set(clave, { hasta: ahora + regla.windowMs, usos: 1 })
    return true
  }

  if (actual.usos >= max) return false
  actual.usos++
  return true
}

/**
 * Vacia TODOS los contadores locales. Es para pruebas: una suite que se
 * autentica varias veces agota el limite de login legitimamente, y eso no
 * deberia hacer fallar pruebas que no van sobre el limitador.
 *
 * No se expone por HTTP ni se llama desde el runtime.
 */
export function reiniciarAdmision(): void {
  local.clear()
}

/** Limpia contadores vencidos. Sin esto el Map crece sin techo. */
export function limpiarContadores(): void {
  const ahora = Date.now()
  for (const [clave, contador] of local) {
    if (contador.hasta <= ahora) local.delete(clave)
  }
}

export interface DistributedLimiter {
  consume(clave: string, regla: RateLimitRule): Promise<boolean>
}

let distribuido: DistributedLimiter | null = null

export function setDistributedLimiter(limiter: DistributedLimiter | null): void {
  distribuido = limiter
}

export async function admitir(rule: RuleName, sujeto: string): Promise<void> {
  const regla = RULES[rule]
  const clave = `${rule}:${sujeto}`

  // El limitador local se aplica SIEMPRE, no solo cuando falla el distribuido.
  if (!consumirLocal(clave, regla, regla.max)) {
    throw new AppError('RATE_LIMITED', `limite local de ${rule}`)
  }

  if (!distribuido) return

  try {
    const permitido = await distribuido.consume(clave, regla)
    if (!permitido) throw new AppError('RATE_LIMITED', `limite distribuido de ${rule}`)
  } catch (error) {
    if (error instanceof AppError) throw error

    // Redis caido: se aplica el limite MAS ESTRICTO, no ninguno.
    logger.warn('admision.limitador_distribuido_caido', { rule })
    if (!consumirLocal(`fallback:${clave}`, regla, regla.fallbackMax)) {
      throw new AppError('RATE_LIMITED', `limite de contingencia de ${rule}`)
    }
  }
}

/**
 * Cortocircuito por proveedor. Tras varios fallos seguidos deja de intentar
 * durante un tiempo, para no acumular peticiones colgadas contra un servicio
 * que ya se sabe caido.
 */
export class CircuitBreaker {
  private fallos = 0
  private abiertoHasta = 0

  constructor(
    private readonly nombre: string,
    private readonly umbral = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  get abierto(): boolean {
    return Date.now() < this.abiertoHasta
  }

  async ejecutar<T>(fn: () => Promise<T>): Promise<T> {
    if (this.abierto) {
      throw new AppError('PROVIDER_UNAVAILABLE', `circuito abierto para ${this.nombre}`)
    }

    try {
      const resultado = await fn()
      this.fallos = 0
      return resultado
    } catch (error) {
      this.fallos++
      if (this.fallos >= this.umbral) {
        this.abiertoHasta = Date.now() + this.cooldownMs
        logger.warn('admision.circuito_abierto', { proveedor: this.nombre, fallos: this.fallos })
      }
      throw error
    }
  }
}

export const breakers = {
  llm: new CircuitBreaker('llm'),
  embeddings: new CircuitBreaker('embeddings'),
  drive: new CircuitBreaker('drive'),
}
