import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Cifrado de tokens OAuth con AES-256-GCM. La base guarda el criptograma, el
 * IV y el tag de autenticacion; nunca el token en claro.
 *
 * GCM es autenticado: si alguien altera el criptograma en la base, el
 * descifrado FALLA en vez de devolver basura.
 */
export interface SealedSecret {
  ciphertext: Buffer
  iv: Buffer
  authTag: Buffer
  keyVersion: number
}

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

function loadKey(): Buffer {
  const raw = process.env['TOKEN_VAULT_KEY']
  if (!raw) {
    throw new Error('TOKEN_VAULT_KEY no esta configurada: el vault no puede operar')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    // Falla cerrada. Una clave corta no se "estira" ni se acepta a medias.
    throw new Error('TOKEN_VAULT_KEY debe ser de 32 bytes en base64')
  }
  return key
}

export function seal(plaintext: string): SealedSecret {
  const key = loadKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: 1 }
}

export function open(sealed: SealedSecret): string {
  const key = loadKey()
  const decipher = createDecipheriv(ALGORITHM, key, sealed.iv)
  decipher.setAuthTag(sealed.authTag)
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]).toString('utf8')
}
