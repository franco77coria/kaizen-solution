import type { PoolClient } from 'pg'
import type { ChatAnswer } from '@kaizen/contracts'
import type { IntencionConversacional } from '@kaizen/query-plans'

/**
 * Respuestas a turnos que NO son preguntas sobre el contenido.
 *
 * Se arman con el ESTADO REAL del espacio -cuantos documentos hay, cuales, de
 * que fechas- leido de la base en el momento. No pasa por el modelo:
 *
 *   1. No hace falta. Saludar no requiere generacion.
 *   2. Es gratis e instantaneo, y no consume cuota.
 *   3. No puede alucinar: los numeros salen de un SELECT.
 *
 * Que no pase por el modelo NO significa que invente: todo lo que dice es
 * verificable contra la base. Si no hay documentos, lo dice; no promete lo
 * que no tiene.
 */
export interface EstadoDelEspacio {
  nombreEspacio: string
  documentos: number
  reuniones: number
  sinReunion: number
  incompletos: number
  desde: Date | null
  hasta: Date | null
  titulos: string[]
}

export async function leerEstadoDelEspacio(client: PoolClient): Promise<EstadoDelEspacio> {
  const { rows } = await client.query<{
    nombre_espacio: string | null
    documentos: string
    reuniones: string
    sin_reunion: string
    incompletos: string
    desde: Date | null
    hasta: Date | null
  }>(
    `select
       (select name from tenants limit 1) as nombre_espacio,
       (select count(*) from documents d where d.status = 'active')::text as documentos,
       (select count(distinct md.meeting_id)
          from meeting_documents md
          join documents d2 on d2.tenant_id = md.tenant_id and d2.id = md.document_id
         where d2.status = 'active')::text as reuniones,
       (select count(*) from documents d3
         where d3.status = 'active'
           and not exists (select 1 from meeting_documents md2
                            where md2.tenant_id = d3.tenant_id and md2.document_id = d3.id)
       )::text as sin_reunion,
       (select count(*) from document_versions v
         where v.status = 'published' and v.extraction_complete = false)::text as incompletos,
       (select min(meeting_at) from documents where status = 'active') as desde,
       (select max(meeting_at) from documents where status = 'active') as hasta`,
  )

  const titulos = await client.query<{ title: string }>(
    `select title from documents
      where status = 'active'
      order by meeting_at desc nulls last, title
      limit 8`,
  )

  const f = rows[0]
  return {
    // RLS acota `tenants` al del contexto, asi que este nombre es siempre el
    // del espacio activo.
    nombreEspacio: f?.nombre_espacio ?? 'este espacio',
    documentos: Number(f?.documentos ?? 0),
    reuniones: Number(f?.reuniones ?? 0),
    sinReunion: Number(f?.sin_reunion ?? 0),
    incompletos: Number(f?.incompletos ?? 0),
    desde: f?.desde ?? null,
    hasta: f?.hasta ?? null,
    titulos: titulos.rows.map((r) => r.title),
  }
}

function fecha(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function describirCorpus(estado: EstadoDelEspacio): string {
  if (estado.documentos === 0) {
    return 'Todavía no tengo documentos cargados en este espacio. Cuando se conecte la fuente y se admitan archivos, voy a poder responder sobre ellos.'
  }

  const desde = fecha(estado.desde)
  const hasta = fecha(estado.hasta)
  const rango =
    desde && hasta && desde !== hasta
      ? ` Van del ${desde} al ${hasta}.`
      : desde
        ? ` La más reciente es del ${desde}.`
        : ''

  const partes = [
    `Tengo ${estado.documentos} documento${estado.documentos === 1 ? '' : 's'} cargado${estado.documentos === 1 ? '' : 's'}`,
  ]

  if (estado.reuniones > 0) {
    partes.push(
      `, de ${estado.reuniones} reunión${estado.reuniones === 1 ? '' : 'es'} identificada${estado.reuniones === 1 ? '' : 's'}`,
    )
  }
  partes.push(`.${rango}`)

  return partes.join('')
}

function listarTitulos(estado: EstadoDelEspacio): string {
  if (estado.titulos.length === 0) return ''
  const lista = estado.titulos.map((t) => `• ${t}`).join('\n')
  const mas =
    estado.documentos > estado.titulos.length
      ? `\n…y ${estado.documentos - estado.titulos.length} más.`
      : ''
  return `\n\n${lista}${mas}`
}

function advertencias(estado: EstadoDelEspacio): string {
  const avisos: string[] = []
  if (estado.sinReunion > 0) {
    avisos.push(
      `${estado.sinReunion} documento${estado.sinReunion === 1 ? '' : 's'} no tiene${estado.sinReunion === 1 ? '' : 'n'} reunión identificada, así que cuenta${estado.sinReunion === 1 ? '' : 'n'} como documento y no como reunión.`,
    )
  }
  if (estado.incompletos > 0) {
    avisos.push(
      `${estado.incompletos} tiene${estado.incompletos === 1 ? '' : 'n'} la extracción incompleta: puede que no cubra todo su contenido.`,
    )
  }
  return avisos.length > 0 ? `\n\n${avisos.join(' ')}` : ''
}

export function responderConversacional(
  intencion: IntencionConversacional,
  estado: EstadoDelEspacio,
): ChatAnswer {
  const texto = construir(intencion, estado)

  return {
    abstained: false,
    answer: texto,
    abstentionReason: '',
    // Sin citas a proposito: no se esta afirmando nada sobre el contenido de
    // las notas, sino informando el estado del espacio.
    sources: [],
    summaryOnly: false,
    modelVersion: 'respuesta-directa',
    promptVersion: 'conversacional-v1',
  }
}

function construir(intencion: IntencionConversacional, estado: EstadoDelEspacio): string {
  switch (intencion) {
    case 'saludo':
      return [
        '¡Hola! Soy SUMA.',
        '',
        describirCorpus(estado) + advertencias(estado),
        '',
        estado.documentos > 0
          ? 'Preguntame lo que quieras sobre ellas: siempre te muestro de qué documento salió cada dato. Si no encuentro respaldo, te lo digo en vez de inventar.'
          : 'Avisame cuando haya notas cargadas y empezamos.',
      ].join('\n')

    case 'inventario':
      return [
        describirCorpus(estado) + listarTitulos(estado) + advertencias(estado),
        '',
        estado.documentos > 0 ? 'Preguntame sobre cualquiera de ellas.' : '',
      ]
        .filter(Boolean)
        .join('\n')

    case 'capacidades':
      return [
        'Soy SUMA: respondo preguntas sobre las notas de reunión de este espacio, citando siempre la fuente.',
        '',
        describirCorpus(estado),
        '',
        'Lo que puedo hacer:',
        '• Buscar hechos puntuales: cifras, fechas, responsables, decisiones.',
        '• Cruzar información entre varias reuniones.',
        '• Mostrarte el fragmento exacto que respalda cada respuesta.',
        '',
        'Lo que no hago:',
        '• Inventar. Si no hay respaldo en las notas, te digo que no lo encontré.',
        `• Responder sobre otros espacios: solo veo ${estado.nombreEspacio}.`,
        '• Sacar conclusiones sobre preferencias políticas de nadie.',
      ].join('\n')

    case 'agradecimiento':
      return '¡De nada! Cualquier otra cosa sobre las notas, preguntame.'
  }
}
