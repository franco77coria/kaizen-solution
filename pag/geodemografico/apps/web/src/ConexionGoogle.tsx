import { useState } from 'react'
import { ApiError, api, type EstadoFuentes, type Scope } from './api'

/**
 * Tarjeta de conexion con Google Drive.
 *
 * Muestra el estado REAL, con sus limitaciones: cuantos documentos hay, cuantos
 * quedaron sin reunion identificada y cuantas extracciones estan incompletas.
 * Nunca dice "listo" si el inventario quedo a medias.
 */
export function ConexionGoogle({
  scope,
  fuentes,
  onCambio,
}: {
  scope: Scope
  fuentes: EstadoFuentes | null
  onCambio: () => void
}): JSX.Element {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const puedeGestionar = scope.permissions.includes('sources.manage')

  async function vincular(rol: 'lector' | 'fuente'): Promise<void> {
    setOcupado(rol)
    setAviso(null)
    try {
      const { authorizationUrl } = await api.conectarGoogle(scope, rol)
      // Navegacion completa: la pantalla de consentimiento de Google no puede
      // abrirse dentro de un iframe ni resolverse por fetch.
      window.location.href = authorizationUrl
    } catch (error) {
      setAviso(
        error instanceof ApiError && error.code === 'PROVIDER_UNAVAILABLE'
          ? 'La conexión con Google todavía no está configurada en el servidor.'
          : error instanceof Error
            ? error.message
            : 'No se pudo iniciar la vinculación.',
      )
      setOcupado(null)
    }
  }

  async function sincronizar(): Promise<void> {
    setOcupado('sync')
    setAviso(null)
    try {
      await api.sincronizar(scope)
      setAviso('Sincronización encolada. El estado se actualiza cuando termine.')
      onCambio()
    } catch (error) {
      setAviso(
        error instanceof ApiError && error.code === 'RATE_LIMITED'
          ? 'Ya hay una sincronización reciente. Esperá unos minutos.'
          : 'No se pudo encolar la sincronización.',
      )
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo">
        <h2>Google Drive</h2>
        <span className={fuentes?.connected ? 'estado ok' : 'estado'}>
          {fuentes?.connected ? 'Conectado' : 'Sin conectar'}
        </span>
      </div>

      {fuentes?.needsReauth && (
        <p className="aviso error">Google pidió volver a autorizar. Reconectá para que SUMA siga leyendo.</p>
      )}

      {aviso && <p className="aviso">{aviso}</p>}

      <p className="tenue">
        {fuentes?.connected
          ? `SUMA lee ${fuentes.documentos} documento${fuentes.documentos === 1 ? '' : 's'} de notas de reunión.`
          : 'Conectá el Drive donde quedan las notas de reunión para que SUMA pueda responder sobre ellas.'}
      </p>

      <div className="acciones-fila">
        {puedeGestionar && (
          <>
            <button
              type="button"
              className="boton primario"
              onClick={() => void vincular('fuente')}
              disabled={ocupado !== null}
            >
              {ocupado === 'fuente'
                ? 'Abriendo Google…'
                : fuentes?.connected
                  ? 'Reconectar Drive'
                  : 'Conectar Drive'}
            </button>
            <button
              type="button"
              className="boton"
              onClick={() => void sincronizar()}
              disabled={ocupado !== null || !fuentes?.connected}
            >
              {ocupado === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
          </>
        )}
        <button
          type="button"
          className="boton fantasma"
          onClick={() => void vincular('lector')}
          disabled={ocupado !== null}
        >
          {ocupado === 'lector' ? 'Abriendo Google…' : 'Vincular mi cuenta'}
        </button>
      </div>

      {!puedeGestionar && (
        <p className="mas-tenue pista">
          Conectar el Drive del espacio lo hace quien administra las fuentes.
        </p>
      )}
    </section>
  )
}
