import { useState } from 'react'
import { displayName } from '@kaizen/geography'
import type { RespuestaDatos } from './api'
import { etiquetaGenero } from './etiquetas'

/**
 * Un resultado analitico dibujado: el numero grande (total) o barras por
 * grupo. Lo usan SUMA y los dashboards.
 *
 * Un grupo suprimido se muestra como "n/d", nunca como cero ni como barra
 * vacia: un cero es un dato, un n/d es la ausencia deliberada de uno.
 */
const numero = new Intl.NumberFormat('es-CO')
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const ESTADOS: Record<string, string> = {
  submitted: 'Enviadas',
  approved: 'Aprobadas',
  rejected: 'Rechazadas',
  withdrawn: 'Retiradas',
}

export function etiquetaGrupo(template: string, clave: string): string {
  switch (template) {
    case 'records.count_by_municipality':
      return displayName(clave)
    case 'records.count_by_gender':
      return etiquetaGenero(clave)
    case 'records.count_by_status':
      return ESTADOS[clave] ?? clave
    case 'records.consent_breakdown':
      return clave === 'vigente' ? 'Consentimiento vigente' : 'Sin consentimiento vigente'
    case 'records.count_by_capture_month': {
      const [anio, mes] = clave.split('-')
      const nombre = MESES[Number(mes) - 1]
      return nombre && anio ? `${nombre} ${anio}` : clave
    }
    case 'records.count_by_age_band':
      return clave === 'desconocida' ? 'Edad desconocida' : clave === 'menor' ? 'Menores' : `${clave} años`
    default:
      return clave
  }
}

/** Cuantas barras se ven antes de "Ver todos". */
const VISIBLES = 8

export function DatosRespuesta({ datos }: { datos: RespuestaDatos }): JSX.Element {
  const [todos, setTodos] = useState(false)
  const { resultado } = datos

  const encabezado = (
    <header className="datos-cabecera">
      <strong>{datos.titulo}</strong>
      {datos.filtros.length > 0 && (
        <span className="datos-filtros">
          {datos.filtros.map((f) => (
            <span key={f} className="datos-filtro">
              {f}
            </span>
          ))}
        </span>
      )}
    </header>
  )

  if (resultado.template === 'records.total') {
    const celda = resultado.rows[0]
    const suprimido = celda?.suppressed === true || (celda !== undefined && celda.value === null)
    const valor = !celda
      ? '0'
      : suprimido
        ? `< ${resultado.suppressionThreshold}`
        : numero.format(celda.value ?? 0)
    return (
      <section className="datos" aria-label={datos.titulo}>
        {encabezado}
        <p className="datos-total cifra">{valor}</p>
        {suprimido && (
          <p className="datos-nota">
            Menos de {resultado.suppressionThreshold}: la cifra exacta no se muestra para que nadie
            pueda ser identificado.
          </p>
        )}
      </section>
    )
  }

  // Visibles primero (de mayor a menor) y los n/d al final.
  const filas = [...resultado.rows].sort((a, b) => {
    if (a.value === null) return 1
    if (b.value === null) return -1
    return b.value - a.value
  })
  const maximo = Math.max(1, ...filas.map((f) => f.value ?? 0))
  const mostradas = todos ? filas : filas.slice(0, VISIBLES)

  return (
    <section className="datos" aria-label={datos.titulo}>
      {encabezado}
      {filas.length === 0 ? (
        <p className="datos-nota">Todavía no hay personas registradas.</p>
      ) : (
        <ol className="datos-barras">
          {mostradas.map((f) => (
            <li key={f.key} className={f.value === null ? 'datos-fila suprimida' : 'datos-fila'}>
              <span className="datos-etiqueta">{etiquetaGrupo(resultado.template, f.key)}</span>
              <span className="datos-pista" aria-hidden="true">
                {f.value !== null && <span style={{ width: `${(f.value / maximo) * 100}%` }} />}
              </span>
              <span className="datos-valor cifra">
                {f.value === null ? 'n/d' : numero.format(f.value)}
              </span>
            </li>
          ))}
        </ol>
      )}
      {filas.length > VISIBLES && (
        <button type="button" className="boton fantasma datos-mas" onClick={() => setTodos((t) => !t)}>
          {todos ? 'Ver menos' : `Ver los ${filas.length}`}
        </button>
      )}
      {resultado.suppressedGroups > 0 && (
        <p className="datos-nota">
          n/d: grupos de menos de {resultado.suppressionThreshold} personas, o que permitirían deducir
          a alguien.
        </p>
      )}
    </section>
  )
}
