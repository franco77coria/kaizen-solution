import { describe, expect, it } from 'vitest'
import { createLogger } from './logger.js'
import { redact } from './redact.js'

/**
 * ADR 0004: los logs NO contienen contenido. La redaccion es por DEFECTO: una
 * clave desconocida con forma de secreto o de dato personal se redacta igual,
 * sin necesidad de agregarla a una lista.
 */
describe('redaccion de datos sensibles', () => {
  const CASOS = [
    'password',
    'refreshToken',
    'api_key',
    'authorization',
    'cookie',
    'email',
    'correo_electronico',
    'telefono',
    'documento',
    'cedula',
    'fullName',
    'nombre_completo',
    'direccion',
    'content',
    'quote',
    'answer',
    'embedding',
    'sessionId',
  ]

  for (const clave of CASOS) {
    it(`redacta la clave ${clave}`, () => {
      const salida = redact({ [clave]: 'valor-secreto-real' }) as Record<string, unknown>
      expect(salida[clave]).toBe('[redactado]')
    })
  }

  it('redacta en profundidad', () => {
    const salida = redact({ a: { b: { c: { token: 'abc123' } } } })
    expect(JSON.stringify(salida)).not.toContain('abc123')
  })

  it('conserva los campos que NO son sensibles', () => {
    const salida = redact({ requestId: 'r-1', cantidad: 5, ok: true }) as Record<string, unknown>
    expect(salida['requestId']).toBe('r-1')
    expect(salida['cantidad']).toBe(5)
    expect(salida['ok']).toBe(true)
  })

  it('trunca cadenas largas en vez de volcarlas enteras', () => {
    const salida = redact({ nota: 'x'.repeat(1000) }) as Record<string, string>
    expect(salida['nota']!.length).toBeLessThan(250)
    expect(salida['nota']).toContain('...')
  })

  it('no se cuelga con referencias circulares', () => {
    const objeto: Record<string, unknown> = { a: 1 }
    objeto['self'] = objeto
    expect(() => redact(objeto)).not.toThrow()
  })

  it('el stack de un error no vuelca el SQL completo', () => {
    const error = new Error('fallo')
    error.stack = `Error: fallo\n${'  at linea\n'.repeat(50)}`
    const salida = redact(error) as { stack: string }
    expect(salida.stack.length).toBeLessThan(250)
  })
})

describe('el logger aplica la redaccion', () => {
  it('no escribe un token en la salida', () => {
    const lineas: string[] = []
    const logger = createLogger({}, { level: 'debug', sink: (l) => lineas.push(l) })

    logger.info('prueba', { refreshToken: 'ya29.super-secreto', requestId: 'r-9' })

    expect(lineas[0]).not.toContain('ya29.super-secreto')
    expect(lineas[0]).toContain('[redactado]')
    expect(lineas[0]).toContain('r-9')
  })

  it('no escribe el texto de una reunion', () => {
    const lineas: string[] = []
    const logger = createLogger({}, { level: 'debug', sink: (l) => lineas.push(l) })

    logger.error('fallo', new Error('x'), {
      content: 'Se aprobo el presupuesto por 420 millones',
    })

    expect(lineas[0]).not.toContain('420 millones')
  })
})
