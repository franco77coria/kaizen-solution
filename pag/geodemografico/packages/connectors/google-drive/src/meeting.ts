import type { ProviderFile } from './provider.js'

/**
 * Ticket 06 — identidad canonica de reunion.
 *
 * El problema real: una reunion puede producir una nota Y una transcripcion, y
 * ambas pueden estar duplicadas por accesos directos. Si cada archivo cuenta
 * como una reunion, el total que ve el alcalde es el triple del verdadero.
 *
 * Regla: solo la clave del proveedor identifica una reunion con certeza. Un
 * titulo parecido NO alcanza; esos documentos se cuentan como documentos sin
 * reunion identificada, y esa cantidad se informa como limite de cobertura.
 */
export type IdentityConfidence = 'provider_key' | 'metadata_match' | 'manual_review' | 'low'

export interface MeetingIdentity {
  providerMeetingKey: string | null
  confidence: IdentityConfidence
  startedAt: string | null
  reason: string
}

/**
 * Fecha de reunion escrita en el titulo de las notas de Meet.
 *
 * Meet nombra sus documentos con un formato fijo:
 *   "<asunto> - 2026/09/18 19:53 GMT-05:00 - Notas de Gemini"
 *
 * Esa fecha es la de la REUNION. La de modificacion del archivo no sirve:
 * editar la nota un mes despues no cambia cuando ocurrio la reunion, y usarla
 * pondria fechas equivocadas en las citas.
 *
 * Es una convencion del proveedor, no una adivinanza sobre texto libre: o el
 * titulo tiene exactamente esa forma, o se devuelve null. No se infiere una
 * fecha a partir de un titulo parecido.
 */
const RE_FECHA_MEET =
  /(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*GMT([+-]\d{2}):?(\d{2})/

export function parseMeetingDateFromTitle(titulo: string): string | null {
  const m = RE_FECHA_MEET.exec(titulo)
  if (!m) return null

  const [, anio, mes, dia, hora, minuto, segundo, offsetHora, offsetMinuto] = m

  // Se conserva el desfase horario del titulo en vez de normalizar a UTC a
  // mano: componerla con aritmetica propia es como se producen errores de un
  // dia entero cerca de la medianoche.
  const iso = `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo ?? '00'}${offsetHora}:${offsetMinuto}`
  const fecha = new Date(iso)

  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString()
}

export function resolveMeetingIdentity(file: ProviderFile): MeetingIdentity {
  if (file.meetingKey) {
    return {
      providerMeetingKey: file.meetingKey,
      confidence: 'provider_key',
      startedAt: file.createdTime,
      reason: 'clave de reunion entregada por el proveedor',
    }
  }

  // Sin clave del proveedor no hay reunion identificada: el documento se
  // cuenta como documento. Pero la FECHA sigue siendo utilizable si el titulo
  // trae el formato de Meet, y tenerla es mejor que mostrar "sin fecha".
  const fechaDelTitulo = parseMeetingDateFromTitle(file.name)

  return {
    providerMeetingKey: null,
    confidence: 'low',
    startedAt: fechaDelTitulo,
    reason: fechaDelTitulo
      ? 'sin clave de reunion del proveedor; fecha tomada del titulo con formato de Meet'
      : 'sin clave de reunion del proveedor; un titulo similar no es evidencia',
  }
}

/**
 * Deduplicacion de un inventario. Un acceso directo y su destino son el mismo
 * archivo: se conserva UNA entrada por `target_file_id`.
 *
 * Lo que esta funcion NO hace: fusionar documentos distintos que comparten
 * titulo. Dos actas llamadas igual de dos reuniones distintas siguen siendo
 * dos documentos.
 */
export function deduplicarPorDestino(files: ProviderFile[]): {
  unicos: ProviderFile[]
  duplicados: Array<{ fileId: string; targetId: string }>
} {
  const porDestino = new Map<string, ProviderFile>()
  const duplicados: Array<{ fileId: string; targetId: string }> = []

  for (const file of files) {
    const destino = file.shortcutTargetId ?? file.id
    const previo = porDestino.get(destino)

    if (!previo) {
      porDestino.set(destino, file)
      continue
    }

    // Ante un acceso directo y el archivo real, gana el archivo real.
    if (previo.shortcutTargetId && !file.shortcutTargetId) {
      porDestino.set(destino, file)
      duplicados.push({ fileId: previo.id, targetId: destino })
    } else {
      duplicados.push({ fileId: file.id, targetId: destino })
    }
  }

  return { unicos: [...porDestino.values()], duplicados }
}
