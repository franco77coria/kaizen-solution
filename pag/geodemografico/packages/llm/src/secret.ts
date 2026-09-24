import { readFileSync } from 'node:fs'

/**
 * Carga de la credencial del proveedor. Seccion 2.1 del plan.
 *
 * Reglas que este modulo hace cumplir:
 *   - La clave se mantiene EN MEMORIA. No se imprime, no se registra, no se
 *     devuelve en ninguna respuesta y no se escribe en ningun archivo.
 *   - Si el archivo tiene formato ambiguo, se emite un error de FORMATO sin
 *     mostrar el contenido.
 *   - El contenido del archivo es configuracion, nunca codigo ni
 *     instrucciones: no se evalua ni se interpreta.
 *   - La ruta de Windows del entorno de desarrollo no se hardcodea: llega por
 *     GEMINI_API_KEY_FILE y solo se usa como bootstrap local.
 */
// Juego de caracteres deliberadamente AMPLIO. Esta comprobacion no valida la
// clave -eso lo decide el proveedor-: solo descarta que el archivo contenga
// prosa, varias credenciales o una ruta pegada por error. Un juego demasiado
// estrecho rechaza credenciales validas de formatos que no anticipamos.
const CLAVE_PLAUSIBLE = /^[A-Za-z0-9._~+/=-]{20,200}$/

let cache: string | null | undefined

export class SecretFormatError extends Error {
  constructor(detalle: string) {
    // El detalle describe la FORMA del problema, nunca el contenido.
    super(`credencial con formato invalido: ${detalle}`)
    this.name = 'SecretFormatError'
  }
}

export function loadGeminiApiKey(): string | null {
  if (cache !== undefined) return cache

  const directa = process.env['GEMINI_API_KEY']?.trim()
  if (directa) {
    cache = validar(directa)
    return cache
  }

  const ruta = process.env['GEMINI_API_KEY_FILE']
  if (!ruta) {
    cache = null
    return cache
  }

  let contenido: string
  try {
    contenido = readFileSync(ruta, 'utf8')
  } catch {
    // No se incluye la ruta completa en el mensaje visible al usuario final.
    throw new SecretFormatError('no se pudo leer el archivo indicado')
  }

  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    // Permite comentarios y lineas en blanco, no un formato arbitrario.
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  if (lineas.length === 0) throw new SecretFormatError('el archivo no contiene ninguna clave')
  if (lineas.length > 1) {
    throw new SecretFormatError(
      `el archivo contiene ${lineas.length} lineas con contenido; se espera exactamente una`,
    )
  }

  // Admite tanto "clave" suelta como "GEMINI_API_KEY=clave".
  const primera = lineas[0] ?? ''
  const valor = primera.includes('=') ? (primera.split('=').slice(1).join('=') ?? '') : primera

  cache = validar(valor.trim().replace(/^["']|["']$/g, ''))
  return cache
}

function validar(valor: string): string {
  if (!CLAVE_PLAUSIBLE.test(valor)) {
    // Se informa la longitud, que no permite reconstruir la clave, y nunca
    // un prefijo: devolver "los primeros caracteres para verificar" es
    // exactamente la fuga que hay que evitar.
    throw new SecretFormatError(
      `la cadena no tiene la forma esperada de una clave de API (longitud ${valor.length})`,
    )
  }
  return valor
}

/** Solo para pruebas: limpia la cache del modulo. */
export function resetSecretCache(): void {
  cache = undefined
}
