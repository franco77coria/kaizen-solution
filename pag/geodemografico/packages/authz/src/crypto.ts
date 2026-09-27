import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Comparacion en tiempo constante. NUNCA usar `===` para secretos: la
 * comparacion de cadenas corta en el primer byte distinto y filtra el prefijo.
 */
export function secretsEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // timingSafeEqual exige la misma longitud. Comparar longitudes antes es
  // inevitable, y la longitud de un secreto no es la parte sensible.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Token opaco de alta entropia para sesiones e invitaciones. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * En la base se guarda el HASH, no el token. Si alguien lee la tabla de
 * sesiones no obtiene credenciales utilizables.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Hash no reversible de un dato de contexto para correlacionar sin guardarlo. */
export function contextHash(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`, 'utf8').digest('hex').slice(0, 32)
}
