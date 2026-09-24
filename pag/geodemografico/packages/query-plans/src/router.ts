import type { QueryPlan, QueryTemplate } from '@kaizen/contracts'

/**
 * Ticket 17f — enrutador del chat.
 *
 * Decide si un turno se responde con las NOTAS (recuperacion aumentada), con
 * la ANALITICA (conteo exacto) o de forma CONVERSACIONAL. La decision es una
 * REGLA determinista, no una eleccion del modelo: si el modelo pudiera elegir
 * la ruta, podria dirigir una pregunta hacia datos para los que el usuario no
 * tiene permiso, y la eleccion no seria auditable.
 *
 * Reglas del plan que esto hace cumplir:
 *   - Un turno resuelve UNA sola ruta y UN solo proposito.
 *   - La ruta analitica solo produce un QueryPlan de una plantilla registrada.
 *   - Un conteo nunca se contesta leyendo notas: los numeros salen de la base.
 */
export type Ruta =
  | { tipo: 'notas'; motivo: string }
  | { tipo: 'analitica'; plan: QueryPlan; motivo: string }
  | { tipo: 'conversacional'; intencion: IntencionConversacional; motivo: string }
  | { tipo: 'sin_ruta'; motivo: string }

/**
 * Turnos que NO son preguntas sobre el contenido: saludos, cortesia y
 * preguntas sobre el propio asistente.
 *
 * Se atienden aparte a proposito. La regla de abstenerse sin evidencia existe
 * para no inventar HECHOS sobre las reuniones; aplicarla a un saludo produce
 * un asistente que no puede decir "hola", lo que ademas hace parecer roto un
 * sistema que funciona.
 *
 * La respuesta no sale del modelo ni de las notas: sale del ESTADO REAL del
 * espacio (cuantos documentos hay, cuales, de que fechas). Es informacion
 * verificable sobre el sistema, no una afirmacion sobre el contenido.
 */
export type IntencionConversacional = 'saludo' | 'capacidades' | 'inventario' | 'agradecimiento'

const RE_CONTEO = /\b(cu[aá]nt[oa]s?|n[uú]mero de|cantidad de|total de|totales)\b/i

/**
 * Un saludo: solo, o encadenado con formulas de cortesia.
 *
 * "hola" y "hola, todo bien?" son el mismo turno para una persona, asi que
 * tienen que serlo tambien para el enrutador. Exigir el saludo SUELTO hacia
 * que la segunda variante -la que se escribe de verdad- cayera en la via de
 * notas y se contestara con una abstencion sobre las actas.
 *
 * Lo que NO se admite es cualquier otra cosa pegada al saludo: la lista de
 * cortesias es cerrada, asi que "hola, cuantos registros hay en Chia" sigue
 * siendo una consulta y se enruta como tal. Ademas los temas prohibidos se
 * evaluan ANTES que esto (ver mas abajo), de modo que ampliar el saludo no
 * abre una via para colar una pregunta que no se debe contestar.
 */
const SALUDO = '(?:hola|holis|buenas|buen d[ií]a|buenas tardes|buenas noches|hey)'
const CORTESIA =
  '(?:qu[eé] tal|c[oó]mo (?:est[aá]s|va|andas|and[aá]s|te va)|todo bien|todo ok|como va)'
const SEPARADOR = '[\\s!¡.,?¿-]*'

const RE_SALUDO = new RegExp(
  `^${SEPARADOR}(?:${SALUDO}|${CORTESIA})(?:${SEPARADOR}(?:${SALUDO}|${CORTESIA}))*${SEPARADOR}$`,
  'i',
)

const RE_AGRADECIMIENTO = /^\s*(gracias|muchas gracias|genial|perfecto|dale|ok|listo)\b[\s!.,]*$/i

/** Preguntas sobre el asistente mismo, no sobre el contenido de las notas. */
const RE_CAPACIDADES =
  /\b(qu[eé] (pod[eé]s|puedes|sab[eé]s|hac[eé]s|haces)|para qu[eé] serv[ií]s|c[oó]mo funcionas?|en qu[eé] me pod[eé]s ayudar|qui[eé]n sos|ayuda)\b/i

/** Preguntas por lo que hay cargado, que se responden con el inventario real. */
const RE_INVENTARIO =
  /\b(qu[eé] (notas|documentos|reuniones|archivos)|qu[eé] ten[eé]s cargado|de qu[eé] reuniones|listame|lista de (notas|documentos|reuniones))\b/i

/** Senales de agrupacion, en orden de especificidad. */
const AGRUPACIONES: Array<{ re: RegExp; template: QueryTemplate; etiqueta: string }> = [
  {
    re: /\b(municipio|municipios|por municipio|localidad|territorio)\b/i,
    template: 'records.count_by_municipality',
    etiqueta: 'por municipio',
  },
  {
    re: /\b(edad|edades|franja|rango etario|etari[ao])\b/i,
    template: 'records.count_by_age_band',
    etiqueta: 'por franja etaria',
  },
  {
    re: /\b(mes|meses|mensual|por fecha de captura)\b/i,
    template: 'records.count_by_capture_month',
    etiqueta: 'por mes de captura',
  },
  {
    re: /\b(consentimiento|autorizaci[oó]n|habeas data)\b/i,
    template: 'records.consent_breakdown',
    etiqueta: 'por estado de consentimiento',
  },
  {
    re: /\b(estado|revisi[oó]n|aprobad[oa]s?|rechazad[oa]s?|pendientes)\b/i,
    template: 'records.count_by_status',
    etiqueta: 'por estado de revision',
  },
]

/** Lo que indica que la pregunta es sobre registros de personas, no sobre notas. */
const RE_REGISTROS =
  /\b(registros?|personas?|referidos?|inscript[oa]s?|base de datos|padr[oó]n)\b/i

/** Temas que NUNCA se responden, venga la pregunta como venga. */
const RE_PROHIBIDO =
  /\b(intenci[oó]n de voto|preferencia pol[ií]tica|a qui[eé]n va(n)? a votar|persuadir|convencer a|c[oó]mo influir)\b/i

export interface ContextoRuta {
  /** Permisos efectivos del usuario en el proposito activo. */
  puedeLeerNotas: boolean
  puedeAgregar: boolean
}

export function enrutar(pregunta: string, contexto: ContextoRuta): Ruta {
  const limpia = pregunta.trim()

  // Los temas prohibidos se evaluan PRIMERO: un saludo pegado a una pregunta
  // sobre preferencia politica no puede colarse por la via conversacional.
  if (RE_PROHIBIDO.test(limpia)) {
    return {
      tipo: 'sin_ruta',
      motivo:
        'El asistente no infiere preferencias políticas de ninguna persona ni sugiere formas de persuadir.',
    }
  }

  // Turnos conversacionales. Van antes del conteo y de las notas porque no
  // son preguntas sobre datos: "hola" no tiene que buscar en ningun lado.
  if (RE_SALUDO.test(limpia)) {
    return { tipo: 'conversacional', intencion: 'saludo', motivo: 'saludo' }
  }
  if (RE_AGRADECIMIENTO.test(limpia)) {
    return { tipo: 'conversacional', intencion: 'agradecimiento', motivo: 'cortesia' }
  }
  if (RE_INVENTARIO.test(limpia)) {
    return { tipo: 'conversacional', intencion: 'inventario', motivo: 'pregunta por lo cargado' }
  }
  if (RE_CAPACIDADES.test(limpia)) {
    return { tipo: 'conversacional', intencion: 'capacidades', motivo: 'pregunta por el asistente' }
  }

  const pareceConteo = RE_CONTEO.test(limpia)
  const hablaDeRegistros = RE_REGISTROS.test(limpia)
  const agrupacion = AGRUPACIONES.find((a) => a.re.test(limpia))

  // Un conteo sobre registros va SIEMPRE a la analitica, aunque el usuario no
  // tenga el permiso: en ese caso se le dice que le falta, en vez de
  // contestarle con un numero sacado de una nota, que seria otro dato.
  if (pareceConteo && (hablaDeRegistros || agrupacion)) {
    if (!contexto.puedeAgregar) {
      return {
        tipo: 'sin_ruta',
        motivo:
          'Esa es una consulta agregada sobre registros y tu cuenta no tiene el permiso de analítica en este espacio.',
      }
    }

    const template: QueryTemplate = agrupacion?.template ?? 'records.total'
    return {
      tipo: 'analitica',
      // Sin filtros: se agregan desde la UI guiada, no adivinandolos del texto
      // libre. Adivinar un filtro cambia el numero sin que el usuario lo sepa.
      plan: { template, filters: [], limit: 200 },
      motivo: agrupacion
        ? `conteo de registros ${agrupacion.etiqueta}`
        : 'conteo total de registros',
    }
  }

  if (!contexto.puedeLeerNotas) {
    return {
      tipo: 'sin_ruta',
      motivo: 'Tu cuenta no tiene permiso de lectura de notas en este espacio.',
    }
  }

  return { tipo: 'notas', motivo: 'pregunta sobre el contenido de las reuniones' }
}
