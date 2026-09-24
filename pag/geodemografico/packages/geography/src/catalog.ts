/**
 * Catalogo territorial de Cundinamarca.
 *
 * IMPORTANTE SOBRE LA PROCEDENCIA. Esta lista se transcribio de la division
 * politico-administrativa (DIVIPOLA) del DANE. NO es una fuente primaria: es
 * una copia y, como toda copia, puede tener errores de transcripcion.
 *
 * Antes de usarla con cifras reales hay que cotejarla contra el archivo
 * oficial con `pnpm geo:verify <ruta-al-csv-divipola>`, que compara codigo por
 * codigo y falla si hay una sola diferencia. Hasta que esa verificacion se
 * ejecute, la version de geografia queda en estado `draft` y las capas que
 * dependen de geometrias declaran su ausencia en vez de dibujar algo.
 *
 * Bogota D.C. (11001) queda FUERA por decision explicita del plan: es Distrito
 * Capital, no un municipio del departamento.
 *
 * Los nombres van sin tildes para que la comparacion por nombre no dependa de
 * la normalizacion Unicode del archivo de origen. La clave real es el codigo.
 */
export interface MunicipalityEntry {
  code: string
  name: string
}

export const DEPARTMENT_CODE = '25'
export const DEPARTMENT_NAME = 'Cundinamarca'
export const EXPECTED_MUNICIPALITY_COUNT = 116

/** Bogota D.C.: se declara explicitamente como excluido, no se omite en silencio. */
export const EXCLUDED_CODES: readonly string[] = ['11001']

const FILAS = `
25001 Agua de Dios
25019 Alban
25035 Anapoima
25040 Anolaima
25053 Arbelaez
25086 Beltran
25095 Bituima
25099 Bojaca
25120 Cabrera
25123 Cachipay
25126 Cajica
25148 Caparrapi
25151 Caqueza
25154 Carmen de Carupa
25168 Chaguani
25175 Chia
25178 Chipaque
25181 Choachi
25183 Choconta
25200 Cogua
25214 Cota
25224 Cucunuba
25245 El Colegio
25258 El Penon
25260 El Rosal
25269 Facatativa
25279 Fomeque
25281 Fosca
25286 Funza
25288 Fuquene
25290 Fusagasuga
25293 Gachala
25295 Gachancipa
25297 Gacheta
25299 Gama
25307 Girardot
25312 Granada
25317 Guacheta
25320 Guaduas
25322 Guasca
25324 Guataqui
25326 Guatavita
25328 Guayabal de Siquima
25335 Guayabetal
25339 Gutierrez
25368 Jerusalen
25372 Junin
25377 La Calera
25386 La Mesa
25394 La Palma
25398 La Pena
25402 La Vega
25407 Lenguazaque
25426 Macheta
25430 Madrid
25436 Manta
25438 Medina
25473 Mosquera
25483 Narino
25486 Nemocon
25488 Nilo
25489 Nimaima
25491 Nocaima
25506 Venecia
25513 Pacho
25518 Paime
25524 Pandi
25530 Paratebueno
25535 Pasca
25572 Puerto Salgar
25580 Puli
25592 Quebradanegra
25594 Quetame
25596 Quipile
25599 Apulo
25612 Ricaurte
25645 San Antonio del Tequendama
25649 San Bernardo
25653 San Cayetano
25658 San Francisco
25662 San Juan de Rioseco
25718 Sasaima
25736 Sesquile
25740 Sibate
25743 Silvania
25745 Simijaca
25754 Soacha
25758 Sopo
25769 Subachoque
25772 Suesca
25777 Supata
25779 Susa
25781 Sutatausa
25785 Tabio
25793 Tausa
25797 Tena
25799 Tenjo
25805 Tibacuy
25807 Tibirita
25815 Tocaima
25817 Tocancipa
25823 Topaipi
25839 Ubala
25841 Ubaque
25843 Villa de San Diego de Ubate
25845 Une
25851 Utica
25862 Vergara
25867 Viani
25871 Villagomez
25873 Villapinzon
25875 Villeta
25878 Viota
25885 Yacopi
25898 Zipacon
25899 Zipaquira
`

export const CUNDINAMARCA_MUNICIPALITIES: readonly MunicipalityEntry[] = FILAS.trim()
  .split('\n')
  .map((linea) => {
    const texto = linea.trim()
    const code = texto.slice(0, 5)
    const name = texto.slice(5).trim()
    return { code, name }
  })

/**
 * Invariantes del catalogo. Se comprueban al cargar el modulo, no solo en una
 * prueba: si alguien edita la lista y rompe una, el proceso falla al arrancar
 * en vez de servir un mapa con municipios de menos.
 */
function verificarInvariantes(): void {
  const lista = CUNDINAMARCA_MUNICIPALITIES

  if (lista.length !== EXPECTED_MUNICIPALITY_COUNT) {
    throw new Error(
      `el catalogo tiene ${lista.length} municipios y se esperan ${EXPECTED_MUNICIPALITY_COUNT}`,
    )
  }

  const codigos = new Set<string>()
  for (const m of lista) {
    if (!/^\d{5}$/.test(m.code)) throw new Error(`codigo invalido: ${m.code}`)
    if (!m.code.startsWith(DEPARTMENT_CODE)) {
      throw new Error(`codigo fuera del departamento ${DEPARTMENT_CODE}: ${m.code}`)
    }
    if (EXCLUDED_CODES.includes(m.code)) {
      throw new Error(`codigo excluido presente en el catalogo: ${m.code}`)
    }
    if (codigos.has(m.code)) throw new Error(`codigo duplicado: ${m.code}`)
    if (m.name.length === 0) throw new Error(`municipio sin nombre: ${m.code}`)
    codigos.add(m.code)
  }
}

verificarInvariantes()

const PORCODIGO = new Map(CUNDINAMARCA_MUNICIPALITIES.map((m) => [m.code, m]))

export function findMunicipality(code: string): MunicipalityEntry | null {
  return PORCODIGO.get(code) ?? null
}

/**
 * Los homonimos existen: hay municipios con el mismo nombre en departamentos
 * distintos (Granada, San Francisco, Ricaurte, San Bernardo, Venecia...).
 * Por eso la busqueda por nombre devuelve una LISTA y nunca se usa como clave.
 */
export function findByName(name: string): MunicipalityEntry[] {
  const buscado = normalizar(name)
  return CUNDINAMARCA_MUNICIPALITIES.filter((m) => normalizar(m.name) === buscado)
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
