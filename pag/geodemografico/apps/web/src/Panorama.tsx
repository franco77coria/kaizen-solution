import { useEffect, useState } from 'react'
import { displayName } from '@kaizen/geography'
import { ApiError, api, type CeldaAnalitica, type Lider, type ResultadoAnalitico, type Scope } from './api'
import { GENEROS, etiquetaGenero } from './etiquetas'
import {
  FILTROS_VACIOS,
  FRANJAS,
  Filtros,
  aFiltros,
  contarActivos,
  etiquetaFranja,
  type EstadoFiltros,
} from './Filtros'
import { SimboloSuma } from './Marca'
import { Mosaico } from './Mosaico'
import { Enlace } from './rutas'

/**
 * Panorama geodemográfico: cuánta gente se sumó y dónde.
 *
 * Solo agregados. Ninguna consulta de esta pantalla devuelve datos de una
 * persona, y los grupos por debajo del umbral llegan como `null`: se muestran
 * como "n/d", jamás como cero.
 */

interface Datos {
  total: CeldaAnalitica | null
  porMunicipio: ResultadoAnalitico
  porEdad: ResultadoAnalitico
  porMes: ResultadoAnalitico
  porGenero: ResultadoAnalitico
}

const TOTAL_MUNICIPIOS = 116
const formato = new Intl.NumberFormat('es-CO')

export function Panorama({ scope }: { scope: Scope }): JSX.Element {
  const [filtros, setFiltros] = useState<EstadoFiltros>(FILTROS_VACIOS)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const puedeVer = scope.permissions.includes('analytics.aggregate')
  const puedeSumar = scope.permissions.includes('records.capture')
  const administra = scope.permissions.includes('tenant.admin')
  const [mias, setMias] = useState<{ total: number; municipios: number; hoy: number } | null>(null)
  const [lideres, setLideres] = useState<Lider[] | null>(null)

  // Lo propio y el ranking no dependen de los filtros: son otra pregunta.
  useEffect(() => {
    if (puedeSumar) void api.mias(scope).then(setMias).catch(() => setMias(null))
    if (administra) void api.lideres(scope).then((r) => setLideres(r.lideres)).catch(() => setLideres(null))
  }, [scope, puedeSumar, administra])
  const filtrado = contarActivos(filtros) > 0

  useEffect(() => {
    if (!puedeVer) {
      setCargando(false)
      return
    }
    let vigente = true
    setCargando(true)
    setError(null)

    const f = aFiltros(filtros)
    void Promise.all([
      api.analitica(scope, 'records.total', f),
      api.analitica(scope, 'records.count_by_municipality', f),
      api.analitica(scope, 'records.count_by_age_band', f),
      api.analitica(scope, 'records.count_by_capture_month', f),
      api.analitica(scope, 'records.count_by_gender', f),
    ])
      .then(([total, porMunicipio, porEdad, porMes, porGenero]) => {
        // Una respuesta vieja que llega tarde no pisa la del filtro nuevo.
        if (!vigente) return
        setDatos({
          total: total.result.rows[0] ?? null,
          porMunicipio: porMunicipio.result,
          porEdad: porEdad.result,
          porMes: porMes.result,
          porGenero: porGenero.result,
        })
      })
      .catch((e: unknown) => {
        if (!vigente) return
        setError(e instanceof ApiError ? e.message : 'No se pudieron calcular los datos.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [scope, filtros, puedeVer])

  if (!puedeVer) {
    return (
      <div className="vacio">
        <strong>No tenés acceso a los datos agregados de este espacio.</strong>
        <span>Pedile a quien administra el espacio que te habilite la vista del panorama.</span>
      </div>
    )
  }

  const vacio = !filtrado && datos !== null && (datos.total?.value ?? 0) === 0 && !datos.total?.suppressed
  const alcanzados = datos?.porMunicipio.rows.length ?? 0

  return (
    <div className={cargando && datos ? 'panorama recalculando' : 'panorama'}>
      <header className="panorama-cabecera">
        <div>
          <p className="eyebrow">Cundinamarca · 15 provincias · 116 municipios</p>
          <h1>Panorama</h1>
        </div>
      </header>

      <section className="resumen" aria-label="Resumen">
        <div className="resumen-bloque">
          <span className="etiqueta">{filtrado ? 'Personas en este recorte' : 'Personas sumadas'}</span>
          <strong className="numero-grande cifra">
            {datos === null ? '—' : datos.total?.suppressed ? 'n/d' : formato.format(datos.total?.value ?? 0)}
          </strong>
          {datos?.total?.suppressed && (
            // Suprimido no es cero: hay gente, pero precisar cuánta permitiría
            // reconocer a alguien.
            <span className="mas-tenue">
              Menos de {datos.porMunicipio.suppressionThreshold}: no se precisa la cifra.
            </span>
          )}
        </div>

        <div className="resumen-bloque">
          <span className="etiqueta">Municipios alcanzados</span>
          <strong className="numero-grande cifra">
            {datos === null ? '—' : alcanzados}
            <small> de {TOTAL_MUNICIPIOS}</small>
          </strong>
          <div
            className="progreso"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={TOTAL_MUNICIPIOS}
            aria-valuenow={alcanzados}
            aria-label="Municipios alcanzados"
          >
            <i style={{ width: `${(alcanzados / TOTAL_MUNICIPIOS) * 100}%` }} />
          </div>
        </div>
      </section>

      {mias && mias.total > 0 && (
        <p className="propias">
          <span className="suma-sello" aria-hidden="true">
            <SimboloSuma />
          </span>
          <span>
            Sumaste <strong className="cifra">{formato.format(mias.total)}</strong>{' '}
            {mias.total === 1 ? 'persona' : 'personas'} en {mias.municipios}{' '}
            {mias.municipios === 1 ? 'municipio' : 'municipios'}
            {mias.hoy > 0 && <span className="tenue"> · {mias.hoy} hoy</span>}
          </span>
        </p>
      )}

      <Filtros valor={filtros} onCambio={setFiltros} />

      {error && <p className="aviso error">{error}</p>}

      {vacio && (
        <div className="vacio-panorama">
          <div>
            <strong>Todavía no se sumó nadie.</strong>
            <span className="tenue">
              Cada persona que se suma aparece acá, en su municipio. El mapa de abajo se va llenando.
            </span>
          </div>
          {puedeSumar && (
            <Enlace a="sumar" className="boton primario grande">
              Sumar la primera persona
            </Enlace>
          )}
        </div>
      )}

      {filtrado && datos && (datos.total?.value ?? 0) === 0 && !datos.total?.suppressed && (
        <p className="aviso">
          Ninguna persona coincide con estos filtros. Probá quitando alguno.
        </p>
      )}

      <section className="tarjeta" aria-label="Territorio">
        <div className="tarjeta-titulo">
          <h2>Territorio</h2>
          <span>
            {filtros.municipio ? `Filtrado a ${displayName(filtros.municipio)}` : 'Por provincia'}
          </span>
        </div>
        {datos ? (
          <Mosaico
            filas={datos.porMunicipio.rows}
            umbral={datos.porMunicipio.suppressionThreshold}
            seleccionado={filtros.municipio}
            onElegir={(codigo) => setFiltros({ ...filtros, municipio: codigo })}
          />
        ) : (
          <div className="cargando">Calculando…</div>
        )}
      </section>

      {administra && lideres && lideres.length > 0 && (
        <section className="tarjeta" aria-label="Líderes que más suman">
          <div className="tarjeta-titulo">
            <h2>Quién más suma</h2>
            <Enlace a="lideres" className="enlace-tenue">
              Ver todos
            </Enlace>
          </div>
          <ol className="ranking">
            {lideres.slice(0, 5).map((l, i) => (
              <li key={l.id}>
                <span className="puesto cifra">{i + 1}</span>
                <span className="ranking-nombre">{l.nombre}</span>
                <span className="ranking-carril">
                  <i
                    style={{
                      width: `${(l.sumadas / Math.max(1, lideres[0]?.sumadas ?? 1)) * 100}%`,
                    }}
                  />
                </span>
                <span className="cifra">{formato.format(l.sumadas)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {datos && !vacio && (
        <div className="panorama-graficas">
          <section className="tarjeta" aria-label="Por edad">
            <div className="tarjeta-titulo">
              <h2>Por edad</h2>
            </div>
            <BarrasHorizontales
              filas={FRANJAS.map((f) => {
                const fila = datos.porEdad.rows.find((r) => r.key === f)
                return {
                  clave: f,
                  etiqueta: etiquetaFranja(f),
                  valor: fila?.value ?? (fila ? null : 0),
                  suprimido: fila?.suppressed ?? false,
                }
              })}
            />
          </section>

          <section className="tarjeta" aria-label="Por género">
            <div className="tarjeta-titulo">
              <h2>Por género</h2>
            </div>
            <BarrasHorizontales
              filas={[...GENEROS.map(([v]) => v), 'sin_dato']
                .map((g) => {
                  const fila = datos.porGenero.rows.find((r) => r.key === g)
                  return {
                    clave: g,
                    etiqueta: etiquetaGenero(g),
                    valor: fila?.value ?? (fila ? null : 0),
                    suprimido: fila?.suppressed ?? false,
                    existe: fila !== undefined,
                  }
                })
                // "Sin dato" solo aparece si hay registros sin el campo.
                .filter((f) => f.clave !== 'sin_dato' || f.existe)}
            />
          </section>

          <section className="tarjeta" aria-label="Por mes">
            <div className="tarjeta-titulo">
              <h2>Cómo creció</h2>
              <span>personas sumadas por mes</span>
            </div>
            <Columnas
              filas={[...datos.porMes.rows]
                .sort((a, b) => a.key.localeCompare(b.key))
                .map((r) => ({
                  clave: r.key,
                  etiqueta: etiquetaMes(r.key),
                  valor: r.value,
                  suprimido: r.suppressed,
                }))}
            />
          </section>
        </div>
      )}
    </div>
  )
}

interface Barra {
  clave: string
  etiqueta: string
  valor: number | null
  suprimido: boolean
}

function BarrasHorizontales({ filas }: { filas: Barra[] }): JSX.Element {
  const maximo = Math.max(1, ...filas.map((f) => f.valor ?? 0))
  return (
    <ul className="barras-h">
      {filas.map((f) => (
        <li key={f.clave}>
          <span className="barras-h-etiqueta">{f.etiqueta}</span>
          <span className="barras-h-carril">
            <i
              className={f.suprimido ? 'suprimida' : undefined}
              // Un suprimido lleva ancho fijo y trama: muestra que el grupo
              // EXISTE sin fingir una medida.
              style={{ width: f.suprimido ? '12%' : `${((f.valor ?? 0) / maximo) * 100}%` }}
            />
          </span>
          <span className="barras-h-valor cifra">{f.suprimido ? 'n/d' : formato.format(f.valor ?? 0)}</span>
        </li>
      ))}
    </ul>
  )
}

function Columnas({ filas }: { filas: Barra[] }): JSX.Element {
  if (filas.length === 0) return <p className="mas-tenue">Sin datos para este recorte.</p>
  const maximo = Math.max(1, ...filas.map((f) => f.valor ?? 0))
  return (
    <ol className="columnas">
      {filas.map((f) => (
        <li key={f.clave} title={`${f.etiqueta}: ${f.suprimido ? 'n/d' : f.valor}`}>
          <span className="columnas-valor cifra">{f.suprimido ? 'n/d' : formato.format(f.valor ?? 0)}</span>
          <span className="columnas-carril">
            <i
              className={f.suprimido ? 'suprimida' : undefined}
              style={{ height: f.suprimido ? '14%' : `${Math.max(3, ((f.valor ?? 0) / maximo) * 100)}%` }}
            />
          </span>
          <span className="columnas-etiqueta">{f.etiqueta}</span>
        </li>
      ))}
    </ol>
  )
}

function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number)
  if (!anio || !mes) return clave
  // Se compone con partes LOCALES: `new Date('2026-09')` se interpreta como
  // medianoche UTC y en Colombia cae en el mes anterior.
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
}
