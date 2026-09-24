import { useMemo, useState } from 'react'
import { CUNDINAMARCA_PROVINCES, displayName } from '@kaizen/geography'
import type { CeldaAnalitica } from './api'

/**
 * Mosaico territorial: las 15 provincias de Cundinamarca, cada una con sus
 * municipios como celdas que se llenan a medida que se suma gente.
 *
 * POR QUE NO ES UN MAPA. No hay geometrias oficiales. Un mapa con limites
 * aproximados se leeria como autoridad sobre territorios que no son los que
 * muestra. El mosaico da la misma lectura -donde hay gente y donde no- sin
 * afirmar nada sobre fronteras.
 *
 * ORDEN FIJO. Las provincias van siempre en el mismo orden, sin importar
 * cuanta gente tengan: un mosaico funciona como mapa mental solo si la forma
 * no se reacomoda al filtrar. Lo que cambia es el color, no el lugar.
 *
 * SUBTOTALES. El de cada provincia es la suma de sus municipios VISIBLES, y
 * dice "+ n/d" si alguno esta suprimido. No se pide al servidor un total por
 * provincia: restarle los municipios visibles revelaria la cifra exacta del
 * suprimido, que es justo lo que la supresion protege.
 */

type Nivel = 'vacio' | 'suprimido' | 1 | 2 | 3 | 4 | 5

interface Celda {
  code: string
  nombre: string
  valor: number | null
  nivel: Nivel
}

const PROVINCIAS_ORDENADAS = [...CUNDINAMARCA_PROVINCES].sort((a, b) =>
  a.name.localeCompare(b.name, 'es'),
)

function nivelDe(valor: number, maximo: number): 1 | 2 | 3 | 4 | 5 {
  // Cinco escalones discretos, no un degradado: el ojo no distingue 12 de 14
  // por el tono, y el numero exacto esta al pasar por encima.
  const r = valor / maximo
  if (r > 0.8) return 5
  if (r > 0.6) return 4
  if (r > 0.4) return 3
  if (r > 0.2) return 2
  return 1
}

const formato = new Intl.NumberFormat('es-CO')

export function Mosaico({
  filas,
  umbral,
  seleccionado,
  onElegir,
}: {
  filas: CeldaAnalitica[]
  umbral: number
  seleccionado: string
  onElegir: (codigo: string) => void
}): JSX.Element {
  const [enFoco, setEnFoco] = useState<string | null>(null)

  const { provincias, celdasPorCodigo } = useMemo(() => {
    const porCodigo = new Map(filas.map((f) => [f.key, f]))
    const maximo = Math.max(1, ...filas.map((f) => f.value ?? 0))
    const celdas = new Map<string, Celda>()

    const provincias = PROVINCIAS_ORDENADAS.map((p) => {
      let suma = 0
      let conDatos = 0
      let suprimidos = 0

      const propias = p.municipalityCodes
        .map((code): Celda => {
          const fila = porCodigo.get(code)
          const nombre = displayName(code)
          let celda: Celda
          if (!fila) celda = { code, nombre, valor: null, nivel: 'vacio' }
          else if (fila.suppressed) {
            celda = { code, nombre, valor: null, nivel: 'suprimido' }
            suprimidos++
            conDatos++
          } else {
            celda = { code, nombre, valor: fila.value, nivel: nivelDe(fila.value ?? 0, maximo) }
            suma += fila.value ?? 0
            conDatos++
          }
          celdas.set(code, celda)
          return celda
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

      return { ...p, celdas: propias, suma, conDatos, suprimidos }
    })

    return { provincias, celdasPorCodigo: celdas }
  }, [filas])

  const detalle = enFoco ? celdasPorCodigo.get(enFoco) : null

  return (
    <div className="mosaico">
      <div className="mosaico-provincias">
        {provincias.map((p) => (
          <section key={p.id} className="provincia" aria-label={`Provincia ${p.name}`}>
            <header>
              <h3>{p.name}</h3>
              <span className="cifra">
                {/* Si todo lo que hay está suprimido, el subtotal visible es 0
                    pero HAY gente: mostrar "0 + n/d" diría lo contrario. */}
                {p.conDatos === 0 ? (
                  '—'
                ) : p.suma === 0 ? (
                  <span className="mas-tenue">n/d</span>
                ) : (
                  <>
                    {formato.format(p.suma)}
                    {p.suprimidos > 0 && <span className="mas-tenue"> + n/d</span>}
                  </>
                )}
              </span>
            </header>
            <ul className="celdas">
              {p.celdas.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className={`celda n-${c.nivel}`}
                    aria-pressed={seleccionado === c.code}
                    onMouseEnter={() => setEnFoco(c.code)}
                    onMouseLeave={() => setEnFoco(null)}
                    onFocus={() => setEnFoco(c.code)}
                    onBlur={() => setEnFoco(null)}
                    onClick={() => onElegir(seleccionado === c.code ? '' : c.code)}
                  >
                    <span className="solo-lectores">
                      {c.nombre}: {describir(c, umbral)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <footer className="mas-tenue">
              {p.conDatos} de {p.municipalityCodes.length} municipios
            </footer>
          </section>
        ))}
      </div>

      <div className="mosaico-pie">
        <p className="mosaico-detalle" aria-live="polite">
          {detalle ? (
            <>
              <strong>{detalle.nombre}</strong>
              <span className="tenue"> · {describir(detalle, umbral)}</span>
            </>
          ) : (
            <span className="mas-tenue">
              Pasá por encima de un municipio para ver cuántas personas tiene. Tocalo para filtrar.
            </span>
          )}
        </p>
        <div className="leyenda" aria-hidden="true">
          <span>
            <i className="celda n-vacio" /> sin personas
          </span>
          <span>
            <i className="celda n-suprimido" /> pocas, sin precisar
          </span>
          <span>
            menos <i className="celda n-1" />
            <i className="celda n-3" />
            <i className="celda n-5" /> más
          </span>
        </div>
      </div>
    </div>
  )
}

function describir(c: Celda, umbral: number): string {
  if (c.nivel === 'vacio') return 'todavía sin personas'
  // Suprimido NO es cero: hay gente, pero menos que el umbral, y precisar la
  // cifra permitiria reconocer a alguien.
  if (c.nivel === 'suprimido') return `menos de ${umbral}, no se precisa`
  return `${formato.format(c.valor ?? 0)} persona${c.valor === 1 ? '' : 's'}`
}
