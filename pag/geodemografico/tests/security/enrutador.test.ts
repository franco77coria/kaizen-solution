import { describe, expect, it } from 'vitest'
import { enrutar } from '@kaizen/query-plans'

/**
 * Ticket 17f — el enrutador.
 *
 * Lo importante no es que acierte la ruta: es que la decision sea una REGLA
 * auditable y no una eleccion del modelo, y que nunca dirija una pregunta
 * hacia datos para los que falta permiso.
 */
const COMPLETO = { puedeLeerNotas: true, puedeAgregar: true }
const SOLO_NOTAS = { puedeLeerNotas: true, puedeAgregar: false }
const SIN_NADA = { puedeLeerNotas: false, puedeAgregar: false }

describe('preguntas sobre el contenido de las reuniones', () => {
  const CASOS = [
    'que se acordo sobre la pavimentacion del barrio centro?',
    'quien quedo como responsable de la obra?',
    'para cuando esta previsto el inicio?',
    'que dijo la tesorera sobre el certificado?',
  ]

  for (const pregunta of CASOS) {
    it(`va a notas: ${pregunta.slice(0, 40)}`, () => {
      expect(enrutar(pregunta, COMPLETO).tipo).toBe('notas')
    })
  }
})

describe('preguntas de conteo', () => {
  it('un conteo por municipio va a la analitica, no a las notas', () => {
    const ruta = enrutar('cuantos registros hay por municipio?', COMPLETO)
    expect(ruta.tipo).toBe('analitica')
    if (ruta.tipo === 'analitica') {
      expect(ruta.plan.template).toBe('records.count_by_municipality')
      // Sin filtros adivinados del texto: un filtro inventado cambia el
      // numero sin que el usuario se entere.
      expect(ruta.plan.filters).toEqual([])
    }
  })

  it('reconoce la agrupacion por franja etaria', () => {
    const ruta = enrutar('cuantas personas hay por rango etario?', COMPLETO)
    expect(ruta.tipo).toBe('analitica')
    if (ruta.tipo === 'analitica') expect(ruta.plan.template).toBe('records.count_by_age_band')
  })

  it('un conteo sin agrupacion usa el total', () => {
    const ruta = enrutar('cuantos registros tenemos?', COMPLETO)
    expect(ruta.tipo).toBe('analitica')
    if (ruta.tipo === 'analitica') expect(ruta.plan.template).toBe('records.total')
  })

  it('sin permiso de analitica NO contesta el numero leyendo notas', () => {
    // Es la trampa que hay que evitar: contestar un conteo con una cifra
    // sacada de un acta seria responder otra cosa, y saltearia el permiso.
    const ruta = enrutar('cuantos registros hay por municipio?', SOLO_NOTAS)
    expect(ruta.tipo).toBe('sin_ruta')
    if (ruta.tipo === 'sin_ruta') expect(ruta.motivo).toMatch(/permiso de anal[ií]tica/)
  })
})

describe('temas prohibidos', () => {
  const CASOS = [
    'cual es la intencion de voto de los registrados?',
    'que preferencia politica tiene Juan Perez?',
    'como persuadir a los indecisos del municipio?',
    'a quien van a votar en Chia?',
  ]

  for (const pregunta of CASOS) {
    it(`no tiene ruta: ${pregunta.slice(0, 40)}`, () => {
      const ruta = enrutar(pregunta, COMPLETO)
      expect(ruta.tipo).toBe('sin_ruta')
      if (ruta.tipo === 'sin_ruta') {
        expect(ruta.motivo).toMatch(/no infiere preferencias|persuadir/)
      }
    })
  }

  it('el bloqueo aplica aunque la cuenta tenga todos los permisos', () => {
    // No es un control de permisos: es una funcionalidad que no existe.
    expect(enrutar('intencion de voto por municipio', COMPLETO).tipo).toBe('sin_ruta')
  })
})

describe('sin permisos', () => {
  it('una cuenta sin lectura de notas no entra a la ruta documental', () => {
    const ruta = enrutar('que se acordo en el comite?', SIN_NADA)
    expect(ruta.tipo).toBe('sin_ruta')
  })
})

describe('turnos conversacionales', () => {
  /**
   * Un asistente que no puede decir "hola" esta mal configurado, no seguro.
   * La regla de abstenerse sin evidencia existe para no inventar HECHOS sobre
   * las reuniones; aplicarla a un saludo la desvirtua.
   */
  const SALUDOS = ['hola', 'Hola!', 'buenas', 'buen dia', 'hey', 'que tal', 'como estas?']

  for (const saludo of SALUDOS) {
    it(`"${saludo}" no busca en las notas`, () => {
      const ruta = enrutar(saludo, COMPLETO)
      expect(ruta.tipo).toBe('conversacional')
      if (ruta.tipo === 'conversacional') expect(ruta.intencion).toBe('saludo')
    })
  }

  it('reconoce preguntas por lo que hay cargado', () => {
    const ruta = enrutar('que notas tenes cargadas?', COMPLETO)
    expect(ruta.tipo).toBe('conversacional')
    if (ruta.tipo === 'conversacional') expect(ruta.intencion).toBe('inventario')
  })

  it('reconoce preguntas sobre el asistente', () => {
    const ruta = enrutar('que podes hacer?', COMPLETO)
    expect(ruta.tipo).toBe('conversacional')
    if (ruta.tipo === 'conversacional') expect(ruta.intencion).toBe('capacidades')
  })

  it('un saludo con pregunta adentro NO es conversacional', () => {
    // "hola, cuanto se aprobo?" tiene que ir a las notas: si se atendiera como
    // saludo, la pregunta real quedaria sin responder.
    const ruta = enrutar('hola, cuanto se aprobo para pavimentacion?', COMPLETO)
    expect(ruta.tipo).toBe('notas')
  })

  it('un tema prohibido NO se cuela por la via conversacional', () => {
    // El filtro de temas prohibidos corre ANTES que el de saludos.
    const ruta = enrutar('hola, cual es la intencion de voto por municipio?', COMPLETO)
    expect(ruta.tipo).toBe('sin_ruta')
  })

  it('un saludo funciona aunque la cuenta no tenga lectura de notas', () => {
    // Saludar no requiere permisos sobre el contenido.
    const ruta = enrutar('hola', SIN_NADA)
    expect(ruta.tipo).toBe('conversacional')
  })

  /**
   * Un saludo con una formula de cortesia pegada sigue siendo un saludo.
   *
   * Exigir el saludo SUELTO parecia correcto y no lo era: nadie escribe "hola"
   * a secas. La variante que se escribe de verdad -"hola, todo bien?"- caia en
   * la via de notas y se contestaba con una abstencion sobre las actas, que es
   * exactamente el comportamiento que hace sentir rota a la herramienta.
   */
  const SALUDOS_CON_CORTESIA = [
    'hola, todo bien?',
    'buenas, como estas?',
    'Hola, qué tal',
    'hola buenas tardes',
    '¿cómo andás?',
    'hola, todo ok',
  ]

  for (const saludo of SALUDOS_CON_CORTESIA) {
    it(`"${saludo}" sigue siendo un saludo`, () => {
      const ruta = enrutar(saludo, COMPLETO)
      expect(ruta.tipo).toBe('conversacional')
      if (ruta.tipo === 'conversacional') expect(ruta.intencion).toBe('saludo')
    })
  }

  /**
   * El limite de la ampliacion anterior. La lista de cortesias es cerrada, asi
   * que cualquier otra cosa pegada al saludo lo saca de la via conversacional.
   */
  const SALUDOS_CON_PEDIDO: Array<[string, string]> = [
    ['hola, cuantos registros hay en Chia', 'analitica'],
    ['hola quiero saber los compromisos', 'notas'],
    ['buenas, pasame el listado de municipios', 'notas'],
  ]

  for (const [texto, esperado] of SALUDOS_CON_PEDIDO) {
    it(`"${texto}" se atiende como ${esperado}, no como saludo`, () => {
      const ruta = enrutar(texto, COMPLETO)
      expect(ruta.tipo).toBe(esperado)
    })
  }

  it('la cortesia no le abre la puerta a un tema prohibido', () => {
    const ruta = enrutar('hola, todo bien? y la preferencia politica de cada uno?', COMPLETO)
    expect(ruta.tipo).toBe('sin_ruta')
  })
})
