import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, type DashboardCompleto, type Scope, type Visibilidad } from './api'
import { diasRestantes } from './Chat'
import { DatosRespuesta } from './DatosRespuesta'
import { Icono } from './Marca'
import { caminoDashboard, navegar } from './rutas'
import { TextoSuma } from './TextoSuma'

/**
 * Un dashboard publicado desde SUMA (/app/suma/<id>).
 *
 * Es la foto que se guardo al crearlo: no se recalcula al abrirlo. Los datos
 * son resultados de consultas cerradas con supresion; el resumen es texto de
 * SUMA validado contra las notas que cita. Siempre con sesion; privado por
 * defecto; vence a los 5 dias.
 */
const fecha = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

const numero = new Intl.NumberFormat('es-CO')

export function Dashboard({ scope, id }: { scope: Scope; id: string }): JSX.Element {
  const [dash, setDash] = useState<DashboardCompleto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setDash(await api.dashboard(scope, id))
      setError(null)
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'NOT_FOUND'
          ? 'Este dashboard no existe, venció o no está compartido con vos.'
          : 'No se pudo cargar el dashboard.',
      )
    }
  }, [scope, id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function cambiarVisibilidad(visibilidad: Visibilidad): Promise<void> {
    try {
      await api.cambiarVisibilidad(scope, id, visibilidad)
      setAviso(
        visibilidad === 'espacio'
          ? 'Ahora lo ven los miembros de este espacio que tienen acceso a SUMA.'
          : 'Ahora es privado: solo lo ves vos.',
      )
      await cargar()
    } catch {
      setAviso('No se pudo cambiar la visibilidad.')
    }
  }

  async function borrar(): Promise<void> {
    try {
      await api.borrarDashboard(scope, id)
      navegar('suma')
    } catch {
      setAviso('No se pudo borrar el dashboard.')
    }
  }

  async function copiarEnlace(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${caminoDashboard(id)}`)
      setAviso(
        dash?.visibilidad === 'espacio'
          ? 'Enlace copiado.'
          : 'Enlace copiado. Es privado: para que otros lo abran, compartilo con el espacio.',
      )
    } catch {
      setAviso('No se pudo copiar el enlace.')
    }
  }

  if (error) {
    return (
      <div className="pagina-angosta">
        <div className="vacio">
          <strong>{error}</strong>
          <button type="button" className="boton" onClick={() => navegar('suma')}>
            Ir a SUMA
          </button>
        </div>
      </div>
    )
  }

  if (!dash) {
    return (
      <div className="dash">
        <div className="esqueleto dash-esqueleto-titulo" />
        <div className="esqueleto dash-esqueleto-bloque" />
      </div>
    )
  }

  const { documento } = dash
  const totales = documento.datos.filter((d) => d.resultado.template === 'records.total')
  const graficos = documento.datos.filter((d) => d.resultado.template !== 'records.total')

  return (
    <article className="dash">
      <header className="dash-cabecera">
        <div className="dash-miga">
          <button type="button" className="dash-volver" onClick={() => navegar('suma')}>
            <Icono nombre="atras" />
            SUMA
          </button>
          <span>Dashboard</span>
        </div>

        <h1 className="dash-titulo">{dash.titulo}</h1>
        <p className="dash-meta">
          {dash.esMio ? 'Creado por vos' : `Creado por ${dash.autor}`} · {fecha(dash.creadoEn)} ·{' '}
          {diasRestantes(dash.venceEn)}
          <span className={dash.visibilidad === 'espacio' ? 'dash-sello compartido' : 'dash-sello'}>
            {dash.visibilidad === 'espacio' ? 'Compartido con el espacio' : 'Privado'}
          </span>
        </p>

        <div className="dash-acciones">
          {dash.esMio && (
            <button
              type="button"
              className="boton"
              onClick={() => void cambiarVisibilidad(dash.visibilidad === 'espacio' ? 'privado' : 'espacio')}
            >
              {dash.visibilidad === 'espacio' ? 'Hacer privado' : 'Compartir con el espacio'}
            </button>
          )}
          <button type="button" className="boton fantasma" onClick={() => void copiarEnlace()}>
            <Icono nombre="enlace" />
            Copiar enlace
          </button>
          <button type="button" className="boton fantasma" onClick={() => window.print()}>
            <Icono nombre="imprimir" />
            Imprimir
          </button>
          {dash.esMio &&
            (confirmarBorrado ? (
              <span className="dash-confirmar">
                <button type="button" className="boton peligro" onClick={() => void borrar()}>
                  Borrar
                </button>
                <button type="button" className="boton fantasma" onClick={() => setConfirmarBorrado(false)}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" className="boton fantasma" onClick={() => setConfirmarBorrado(true)}>
                Borrar
              </button>
            ))}
        </div>

        {aviso && (
          <p className="aviso ok" role="status">
            {aviso}
          </p>
        )}
        {dash.desactualizado && (
          <p className="aviso" role="status">
            Alguien retiró su consentimiento después de crear este dashboard: sus números pueden no
            reflejar el estado actual. Generá uno nuevo desde SUMA.
          </p>
        )}
      </header>

      {/* El titulo ya es la pregunta; solo se repite si se recorto. */}
      {documento.pregunta.trim() !== dash.titulo && (
        <p className="dash-pregunta">
          <span>Pregunta</span>
          {documento.pregunta}
        </p>
      )}

      {totales.length > 0 && (
        <section className="dash-kpis" aria-label="Indicadores">
          {totales.map((d) => {
            const celda = d.resultado.rows[0]
            const suprimido = celda !== undefined && (celda.suppressed || celda.value === null)
            return (
              <div className="dash-kpi" key={d.runId}>
                <span className="dash-kpi-etiqueta">{d.titulo}</span>
                <strong className="cifra">
                  {!celda ? '0' : suprimido ? `< ${d.resultado.suppressionThreshold}` : numero.format(celda.value ?? 0)}
                </strong>
                {d.filtros.length > 0 && <span className="dash-kpi-filtro">{d.filtros.join(' · ')}</span>}
              </div>
            )
          })}
        </section>
      )}

      {documento.resumen && (
        <section className="dash-resumen" aria-label="Resumen">
          <h2>Resumen</h2>
          <TextoSuma texto={documento.resumen.texto} />
          {documento.resumen.fuentes.length > 0 && (
            <ol className="dash-fuentes">
              {documento.resumen.fuentes.map((f) => (
                <li key={f.chunkId}>
                  <span className="nombre">{f.title}</span>
                  <blockquote>{f.quote}</blockquote>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {graficos.length > 0 && (
        <section className="dash-graficos" aria-label="Datos">
          {graficos.map((d) => (
            <DatosRespuesta key={d.runId} datos={d} />
          ))}
        </section>
      )}

      <footer className="dash-pie">
        Generado por SUMA. Los números salen de consultas cerradas sobre la base, con los grupos de
        menos de 5 personas como n/d.
        {documento.resumen &&
          (documento.resumen.generado
            ? ' El resumen fue validado contra las notas que cita.'
            : ' El resumen es la respuesta original de SUMA.')}
      </footer>
    </article>
  )
}
