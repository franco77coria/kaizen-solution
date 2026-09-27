import { CUNDINAMARCA_PROVINCES, displayName } from '@kaizen/geography'
import type { FiltroAnalitico } from './api'
import { GENEROS } from './etiquetas'

/**
 * Barra de filtros del tablero.
 *
 * Todo lo que se ofrece aca sale de la MISMA lista blanca que acepta el
 * servidor. No hay campo de texto libre, y no por comodidad: el compilador de
 * planes enlaza los valores como parametros y rechaza cualquier campo que no
 * este en la lista. Ofrecer en la pantalla algo que el servidor va a rebotar
 * solo produce un error que el usuario no puede interpretar.
 *
 * Los valores de las dimensiones derivadas (franja etaria, consentimiento) no
 * se inventan aca: son exactamente las etiquetas que produce el `case` de
 * `FILTER_PREDICATES`. Si divergen, el filtro no matchea nada y la grafica se
 * vacia sin explicar por que.
 */

export interface EstadoFiltros {
  municipio: string
  franja: string
  genero: string
  consentimiento: string
  mes: string
}

export const FILTROS_VACIOS: EstadoFiltros = {
  municipio: '',
  franja: '',
  genero: '',
  consentimiento: '',
  mes: '',
}

export const FRANJAS = ['menor', '18-29', '30-44', '45-59', '60+', 'desconocida'] as const

/*
 * No hay filtro por estado de revisión: el panorama cuenta solo registros
 * APROBADOS (`where r.status = 'approved'` en el compilador de planes). Un
 * selector con "Borrador" o "Enviado a revisión" devolvía siempre cero, sin
 * ningún error, y se leía como "no hay nadie pendiente".
 */

const CONSENTIMIENTO: Array<[string, string]> = [
  ['vigente', 'Vigente'],
  ['sin_consentimiento_vigente', 'Sin consentimiento vigente'],
]

/** Los ultimos 12 meses, en el formato `YYYY-MM` que produce la plantilla. */
export function ultimosMeses(cantidad = 12): Array<[string, string]> {
  const hoy = new Date()
  const meses: Array<[string, string]> = []
  for (let i = 0; i < cantidad; i++) {
    // Se compone con las partes LOCALES. `toISOString()` daria el mes UTC, que
    // en Colombia (UTC-5) cambia antes de tiempo los primeros dias del mes.
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push([valor, d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })])
  }
  return meses
}

/**
 * Traduce el estado de la pantalla al contrato del servidor.
 *
 * Una dimension sin elegir NO viaja como filtro. Mandar `values: []` seria un
 * error de validacion, y mandar un valor vacio filtraria por la cadena vacia:
 * las dos formas devuelven cero filas y ninguna dice que el problema es el
 * filtro.
 */
export function aFiltros(estado: EstadoFiltros): FiltroAnalitico[] {
  const filtros: FiltroAnalitico[] = []
  const agregar = (field: FiltroAnalitico['field'], valor: string): void => {
    if (valor) filtros.push({ field, op: 'eq', values: [valor] })
  }

  agregar('municipality_code', estado.municipio)
  agregar('age_band', estado.franja)
  agregar('gender', estado.genero)
  agregar('consent_state', estado.consentimiento)
  agregar('capture_month', estado.mes)

  // El servidor acepta 5 filtros como maximo y aca hay exactamente 5
  // dimensiones, asi que no puede pasarse. Si se agrega una sexta, esto
  // tiene que revisarse.
  return filtros
}

export function contarActivos(estado: EstadoFiltros): number {
  return Object.values(estado).filter((v) => v !== '').length
}

export function etiquetaFranja(f: string): string {
  if (f === 'menor') return 'Menor de 18'
  if (f === 'desconocida') return 'Sin dato'
  return f
}

/**
 * Fila compacta de filtros. Cada selector muestra su valor cuando esta activo
 * (queda resaltado), así se ve de un vistazo qué recorte se está mirando sin
 * leer el formulario entero.
 */
export function Filtros({
  valor,
  onCambio,
}: {
  valor: EstadoFiltros
  onCambio: (e: EstadoFiltros) => void
}): JSX.Element {
  const set = (k: keyof EstadoFiltros) => (e: { target: { value: string } }) =>
    onCambio({ ...valor, [k]: e.target.value })

  const activos = contarActivos(valor)
  const clase = (k: keyof EstadoFiltros): string => (valor[k] ? 'filtro activo' : 'filtro')

  return (
    <div className="filtros" role="group" aria-label="Filtros">
      <label className={clase('municipio')}>
        <span className="solo-lectores">Municipio</span>
        <select value={valor.municipio} onChange={set('municipio')}>
          <option value="">Todos los municipios</option>
          {[...CUNDINAMARCA_PROVINCES]
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((p) => (
              <optgroup key={p.id} label={p.name}>
                {[...p.municipalityCodes]
                  .sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'))
                  .map((code) => (
                    <option key={code} value={code}>
                      {displayName(code)}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      </label>

      <label className={clase('franja')}>
        <span className="solo-lectores">Edad</span>
        <select value={valor.franja} onChange={set('franja')}>
          <option value="">Todas las edades</option>
          {FRANJAS.map((f) => (
            <option key={f} value={f}>
              {etiquetaFranja(f)}
            </option>
          ))}
        </select>
      </label>

      <label className={clase('genero')}>
        <span className="solo-lectores">Género</span>
        <select value={valor.genero} onChange={set('genero')}>
          <option value="">Todos los géneros</option>
          {GENEROS.map(([v, etiqueta]) => (
            <option key={v} value={v}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label className={clase('mes')}>
        <span className="solo-lectores">Mes</span>
        <select value={valor.mes} onChange={set('mes')}>
          <option value="">Todos los meses</option>
          {ultimosMeses().map(([v, etiqueta]) => (
            <option key={v} value={v}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>


      <label className={clase('consentimiento')}>
        <span className="solo-lectores">Consentimiento</span>
        <select value={valor.consentimiento} onChange={set('consentimiento')}>
          <option value="">Cualquier consentimiento</option>
          {CONSENTIMIENTO.map(([v, etiqueta]) => (
            <option key={v} value={v}>
              {etiqueta}
            </option>
          ))}
        </select>
      </label>

      {activos > 0 && (
        <button type="button" className="boton fantasma" onClick={() => onCambio(FILTROS_VACIOS)}>
          Limpiar
        </button>
      )}
    </div>
  )
}
