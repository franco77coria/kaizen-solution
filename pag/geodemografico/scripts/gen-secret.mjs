/** Genera un secreto aleatorio en base64. No lo escribe en ningun archivo. */
import { randomBytes } from 'node:crypto'
const bytes = Number(process.argv[2] ?? 32)
process.stdout.write(`${randomBytes(bytes).toString('base64')}\n`)
