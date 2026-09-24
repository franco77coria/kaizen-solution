import { describe, expect, it } from 'vitest'
import { deduplicarPorDestino, parseMeetingDateFromTitle, resolveMeetingIdentity } from './meeting.js'
import type { ProviderFile } from './provider.js'

const base: ProviderFile = {
  id: 'f1',
  name: '',
  mimeType: 'application/vnd.google-apps.document',
  createdTime: '2026-01-01T00:00:00Z',
  modifiedTime: '2026-09-20T00:00:00Z',
  version: '1',
  parents: [],
  shortcutTargetId: null,
  meetingKey: null,
  trashed: false,
  canRead: true,
}

/**
 * Titulos reales observados en el Drive del piloto. Meet nombra sus notas con
 * un formato fijo que incluye la fecha de la REUNION; la de modificacion del
 * archivo no sirve, porque editar la nota despues no cambia cuando ocurrio.
 */
describe('fecha de reunion tomada del titulo de Meet', () => {
  it('extrae la fecha de un titulo real', () => {
    const iso = parseMeetingDateFromTitle(
      'FB PRESENTACION KAIZEN - 2026/09/18 19:53 GMT-05:00 - Notas de Gemini',
    )
    expect(iso).toBe('2026-09-19T00:53:00.000Z')
  })

  it('respeta el desfase horario declarado, no lo asume', () => {
    // Mismo instante nominal, husos distintos: no pueden dar el mismo UTC.
    const bogota = parseMeetingDateFromTitle('X - 2026/09/08 21:09 GMT-05:00 - Notas de Gemini')
    const buenosAires = parseMeetingDateFromTitle('X - 2026/09/08 21:09 GMT-03:00 - Notas de Gemini')
    expect(bogota).not.toBe(buenosAires)
    expect(buenosAires).toBe('2026-09-09T00:09:00.000Z')
  })

  it('no inventa una fecha cuando el titulo no tiene el formato', () => {
    expect(parseMeetingDateFromTitle('Acta de reunion de marzo')).toBeNull()
    expect(parseMeetingDateFromTitle('Notas 2026')).toBeNull()
    expect(parseMeetingDateFromTitle('')).toBeNull()
  })

  it('no acepta una fecha con forma parecida pero sin huso', () => {
    // Sin el desfase no se puede saber a que instante corresponde, y
    // suponerlo produce errores de un dia entero cerca de la medianoche.
    expect(parseMeetingDateFromTitle('Reunion 2026/09/18 19:53')).toBeNull()
  })
})

describe('identidad de reunion', () => {
  it('la clave del proveedor manda sobre el titulo', () => {
    const r = resolveMeetingIdentity({
      ...base,
      meetingKey: 'meet-123',
      name: 'X - 2026/09/18 19:53 GMT-05:00 - Notas de Gemini',
    })
    expect(r.confidence).toBe('provider_key')
    expect(r.providerMeetingKey).toBe('meet-123')
  })

  it('sin clave del proveedor NO hay reunion identificada, aunque haya fecha', () => {
    const r = resolveMeetingIdentity({
      ...base,
      name: 'X - 2026/09/18 19:53 GMT-05:00 - Notas de Gemini',
    })
    // La fecha es utilizable; la identidad de reunion no. Son cosas distintas:
    // agrupar por titulo falsearia el conteo de reuniones.
    expect(r.providerMeetingKey).toBeNull()
    expect(r.confidence).toBe('low')
    expect(r.startedAt).toBe('2026-09-19T00:53:00.000Z')
  })

  it('sin clave y sin formato, no hay fecha', () => {
    const r = resolveMeetingIdentity({ ...base, name: 'Documento suelto' })
    expect(r.startedAt).toBeNull()
  })
})

describe('deduplicacion por destino', () => {
  it('el archivo real gana sobre el acceso directo', () => {
    const { unicos, duplicados } = deduplicarPorDestino([
      { ...base, id: 'atajo', shortcutTargetId: 'real' },
      { ...base, id: 'real' },
    ])
    expect(unicos).toHaveLength(1)
    expect(unicos[0]?.id).toBe('real')
    expect(duplicados[0]?.fileId).toBe('atajo')
  })
})
