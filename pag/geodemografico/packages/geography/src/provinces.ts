import { CUNDINAMARCA_MUNICIPALITIES, findByName, findMunicipality } from './catalog.js'

/**
 * Division provincial de Cundinamarca: 15 provincias.
 *
 * PROCEDENCIA. Igual que el catalogo de municipios, esto es una TRANSCRIPCION
 * de la division administrativa departamental, no una fuente primaria. Queda
 * **pendiente de cotejo** contra el acto administrativo vigente antes de usarla
 * para decisiones sobre datos reales.
 *
 * Las provincias se escriben por NOMBRE de municipio porque asi se leen y se
 * revisan; al cargar el modulo cada nombre se resuelve contra el catalogo por
 * codigo. Un nombre mal escrito, un municipio sin provincia o uno en dos
 * provincias hacen fallar el arranque: una agrupacion con un municipio de menos
 * no avisa, simplemente dibuja un territorio incompleto.
 */

export interface ProvinceEntry {
  id: string
  name: string
  municipalityCodes: readonly string[]
}

export const PROVINCE_SOURCE_STATUS = 'pendiente_de_cotejo' as const

const DEFINICION: ReadonlyArray<[id: string, nombre: string, municipios: readonly string[]]> = [
  ['almeidas', 'Almeidas', ['Choconta', 'Macheta', 'Manta', 'Sesquile', 'Suesca', 'Tibirita', 'Villapinzon']],
  ['alto_magdalena', 'Alto Magdalena', ['Girardot', 'Agua de Dios', 'Guataqui', 'Jerusalen', 'Narino', 'Nilo', 'Ricaurte', 'Tocaima']],
  ['bajo_magdalena', 'Bajo Magdalena', ['Guaduas', 'Caparrapi', 'Puerto Salgar']],
  ['gualiva', 'Gualivá', ['Villeta', 'Alban', 'La Pena', 'La Vega', 'Nimaima', 'Nocaima', 'Quebradanegra', 'San Francisco', 'Sasaima', 'Supata', 'Utica', 'Vergara']],
  ['guavio', 'Guavio', ['Gacheta', 'Gachala', 'Gama', 'Guasca', 'Guatavita', 'Junin', 'La Calera', 'Ubala']],
  ['magdalena_centro', 'Magdalena Centro', ['San Juan de Rioseco', 'Beltran', 'Bituima', 'Chaguani', 'Guayabal de Siquima', 'Puli', 'Viani']],
  ['medina', 'Medina', ['Medina', 'Paratebueno']],
  ['oriente', 'Oriente', ['Caqueza', 'Chipaque', 'Choachi', 'Fomeque', 'Fosca', 'Guayabetal', 'Gutierrez', 'Quetame', 'Ubaque', 'Une']],
  ['rionegro', 'Rionegro', ['Pacho', 'El Penon', 'La Palma', 'Paime', 'San Cayetano', 'Topaipi', 'Villagomez', 'Yacopi']],
  ['sabana_centro', 'Sabana Centro', ['Zipaquira', 'Cajica', 'Chia', 'Cogua', 'Cota', 'Gachancipa', 'Nemocon', 'Sopo', 'Tabio', 'Tenjo', 'Tocancipa']],
  ['sabana_occidente', 'Sabana Occidente', ['Facatativa', 'Bojaca', 'El Rosal', 'Funza', 'Madrid', 'Mosquera', 'Subachoque', 'Zipacon']],
  ['soacha', 'Soacha', ['Soacha', 'Sibate']],
  ['sumapaz', 'Sumapaz', ['Fusagasuga', 'Arbelaez', 'Cabrera', 'Granada', 'Pandi', 'Pasca', 'San Bernardo', 'Silvania', 'Tibacuy', 'Venecia']],
  ['tequendama', 'Tequendama', ['La Mesa', 'Anapoima', 'Anolaima', 'Apulo', 'Cachipay', 'El Colegio', 'Quipile', 'San Antonio del Tequendama', 'Tena', 'Viota']],
  ['ubate', 'Ubaté', ['Villa de San Diego de Ubate', 'Carmen de Carupa', 'Cucunuba', 'Fuquene', 'Guacheta', 'Lenguazaque', 'Simijaca', 'Susa', 'Sutatausa', 'Tausa']],
]

export const EXPECTED_PROVINCE_COUNT = 15

function resolver(): ProvinceEntry[] {
  const asignado = new Map<string, string>()

  const provincias = DEFINICION.map(([id, name, nombres]) => {
    const municipalityCodes = nombres.map((nombre) => {
      const encontrados = findByName(nombre)
      if (encontrados.length !== 1) {
        throw new Error(`provincia ${name}: "${nombre}" resuelve a ${encontrados.length} municipios`)
      }
      const code = encontrados[0]!.code
      const previa = asignado.get(code)
      if (previa) throw new Error(`${nombre} figura en ${previa} y en ${name}`)
      asignado.set(code, name)
      return code
    })
    return { id, name, municipalityCodes }
  })

  if (provincias.length !== EXPECTED_PROVINCE_COUNT) {
    throw new Error(`hay ${provincias.length} provincias y se esperan ${EXPECTED_PROVINCE_COUNT}`)
  }

  const sinProvincia = CUNDINAMARCA_MUNICIPALITIES.filter((m) => !asignado.has(m.code))
  if (sinProvincia.length > 0) {
    throw new Error(`municipios sin provincia: ${sinProvincia.map((m) => m.name).join(', ')}`)
  }

  return provincias
}

export const CUNDINAMARCA_PROVINCES: readonly ProvinceEntry[] = resolver()

const PROVINCIA_POR_CODIGO = new Map(
  CUNDINAMARCA_PROVINCES.flatMap((p) => p.municipalityCodes.map((c) => [c, p] as const)),
)

export function provinceOf(municipalityCode: string): ProvinceEntry | null {
  return PROVINCIA_POR_CODIGO.get(municipalityCode) ?? null
}

/**
 * Nombres para MOSTRAR, con tildes y eñes.
 *
 * El catalogo guarda los nombres sin tildes a proposito (la clave es el codigo
 * y la comparacion por nombre no debe depender de la normalizacion Unicode).
 * Pero "Zipaquira" en una pantalla se lee como un error. Esta tabla solo
 * restaura la ortografia: el invariante de abajo exige que, quitando tildes,
 * el nombre mostrado sea EXACTAMENTE el del catalogo — asi una correccion de
 * ortografia no puede convertirse por accidente en otro municipio.
 */
const CON_TILDE: Record<string, string> = {
  '25019': 'Albán',
  '25053': 'Arbeláez',
  '25086': 'Beltrán',
  '25099': 'Bojacá',
  '25126': 'Cajicá',
  '25148': 'Caparrapí',
  '25151': 'Cáqueza',
  '25168': 'Chaguaní',
  '25175': 'Chía',
  '25181': 'Choachí',
  '25183': 'Chocontá',
  '25224': 'Cucunubá',
  '25258': 'El Peñón',
  '25269': 'Facatativá',
  '25279': 'Fómeque',
  '25288': 'Fúquene',
  '25290': 'Fusagasugá',
  '25293': 'Gachalá',
  '25295': 'Gachancipá',
  '25297': 'Gachetá',
  '25317': 'Guachetá',
  '25324': 'Guataquí',
  '25328': 'Guayabal de Síquima',
  '25339': 'Gutiérrez',
  '25368': 'Jerusalén',
  '25372': 'Junín',
  '25398': 'La Peña',
  '25426': 'Machetá',
  '25483': 'Nariño',
  '25486': 'Nemocón',
  '25580': 'Pulí',
  '25736': 'Sesquilé',
  '25740': 'Sibaté',
  '25758': 'Sopó',
  '25777': 'Supatá',
  '25817': 'Tocancipá',
  '25823': 'Topaipí',
  '25839': 'Ubalá',
  '25843': 'Villa de San Diego de Ubaté',
  '25851': 'Útica',
  '25867': 'Vianí',
  '25871': 'Villagómez',
  '25873': 'Villapinzón',
  '25878': 'Viotá',
  '25885': 'Yacopí',
  '25898': 'Zipacón',
  '25899': 'Zipaquirá',
}

const sinTildes = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

for (const [code, mostrado] of Object.entries(CON_TILDE)) {
  const municipio = findMunicipality(code)
  if (!municipio) throw new Error(`nombre con tilde para un codigo inexistente: ${code}`)
  if (sinTildes(mostrado) !== sinTildes(municipio.name)) {
    throw new Error(`"${mostrado}" no es el mismo municipio que "${municipio.name}" (${code})`)
  }
}

export function displayName(municipalityCode: string): string {
  return CON_TILDE[municipalityCode] ?? findMunicipality(municipalityCode)?.name ?? municipalityCode
}
