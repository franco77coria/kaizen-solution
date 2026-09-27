import { useCallback, useEffect, useRef, useState } from 'react'
import { displayName } from '@kaizen/geography'
import { ApiError, api, type Pendiente, type Scope } from './api'

/**
 * Cola de revisión.
 *
 * El invariante es que NADIE aprueba lo que cargó. Se cumple en tres lugares y
 * los tres hacen falta: un trigger en Postgres (el único control real), el
 * endpoint (403) y esta pantalla (no ofrece los botones). La pantalla es la
 * capa más débil, así que no se confía en ella: los registros propios se
 * MUESTRAN con el motivo en vez de esconderse, porque una fila que desaparece
 * se lee como "ya lo revisaron".
 *
 * El motivo de la decisión es obligatorio y queda en la auditoría. Se pide en
 * la misma fila, no con `window.prompt()`: un diálogo del navegador corta el
 * flujo y no se puede diseñar ni leer bien en el teléfono.
 */

type Decision = 'approve' | 'reject'

export function Revision({ scope }: { scope: Scope }): JSX.Element {
  const [filas, setFilas] = useState<Pendiente[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [decidiendo, setDecidiendo] = useState<{ id: string; decision: Decision } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await api.pendientes(scope)
      setFilas(r.pendientes)
      setError(null)
    } catch (e) {
      setFilas(null)
      setError(
        e instanceof ApiError && e.code === 'FORBIDDEN'
          ? 'Tu cuenta no revisa en este espacio. Es a propósito: quien suma personas no aprueba.'
          : 'No se pudo cargar la cola.',
      )
    } finally {
      setCargando(false)
    }
  }, [scope])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function confirmar(fila: Pendiente, decision: Decision, motivo: string): Promise<void> {
    setTrabajando(fila.id)
    setError(null)
    try {
      await api.revisar(scope, fila.id, decision, motivo, fila.version)
      setDecidiendo(null)
      await cargar()
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'CONFLICT'
          ? 'Alguien más cambió este registro mientras lo mirabas. Se recargó la cola.'
          : e instanceof Error
            ? e.message
            : 'No se pudo aplicar la decisión.',
      )
      await cargar()
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <div className="pagina-angosta">
      <header className="pagina-cabecera con-accion">
        <div>
          <h1 className="pagina-titulo">Revisión</h1>
          <p className="tenue">
            Una persona cuenta en el panorama cuando la aprueba alguien distinto de quien la cargó.
          </p>
        </div>
        <button className="boton" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      {filas && filas.length === 0 && (
        <div className="vacio">
          <strong>No hay nadie esperando revisión.</strong>
          <span>Cuando alguien sume una persona, aparece acá.</span>
        </div>
      )}

      {filas && filas.length > 0 && (
        <ul className="lista-revision">
          {filas.map((f) => (
            <li key={f.id} className="fila-revision">
              <div className="fila-principal">
                <div className="fila-datos">
                  <strong>{f.nombre}</strong>
                  <span className="tenue">
                    {displayName(f.municipio)} · doc. <span className="cifra">{f.documento}</span>
                    {f.anioNacimiento ? ` · nació en ${f.anioNacimiento}` : ''}
                  </span>
                  <span className="mas-tenue">
                    Registro del{' '}
                    {new Date(f.creado).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {f.evidencia ? ` · ${f.evidencia}` : ''}
                  </span>
                  {!f.consentimientoVigente && (
                    <span className="aviso error">El consentimiento de este registro ya no está vigente.</span>
                  )}
                </div>

                <div className="fila-acciones">
                  {f.puedeRevisar ? (
                    decidiendo?.id !== f.id && (
                      <>
                        <button
                          className="boton peligro"
                          disabled={trabajando !== null}
                          onClick={() => setDecidiendo({ id: f.id, decision: 'reject' })}
                        >
                          Rechazar
                        </button>
                        <button
                          className="boton primario"
                          disabled={trabajando !== null}
                          onClick={() => setDecidiendo({ id: f.id, decision: 'approve' })}
                        >
                          Aprobar
                        </button>
                      </>
                    )
                  ) : (
                    <span className="mas-tenue">Este registro lo cargaste vos: lo aprueba otra persona.</span>
                  )}
                </div>
              </div>

              {decidiendo?.id === f.id && (
                <Motivo
                  decision={decidiendo.decision}
                  ocupado={trabajando === f.id}
                  onCancelar={() => setDecidiendo(null)}
                  onConfirmar={(motivo) => void confirmar(f, decidiendo.decision, motivo)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Motivo({
  decision,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  decision: Decision
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: (motivo: string) => void
}): JSX.Element {
  const [motivo, setMotivo] = useState('')
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    campo.current?.focus()
  }, [])

  const valido = motivo.trim().length >= 3
  const aprobar = decision === 'approve'

  return (
    <form
      className="motivo"
      onSubmit={(e) => {
        e.preventDefault()
        if (valido && !ocupado) onConfirmar(motivo.trim())
      }}
    >
      <label className="campo">
        <span>{aprobar ? 'Motivo de la aprobación' : 'Motivo del rechazo'} · queda en la auditoría</span>
        <input
          ref={campo}
          className="entrada"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancelar()
          }}
          placeholder={aprobar ? 'Ej.: datos verificados con el acta' : 'Ej.: el documento no coincide'}
        />
      </label>
      <div className="motivo-acciones">
        <button type="button" className="boton fantasma" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        <button type="submit" className={aprobar ? 'boton primario' : 'boton peligro'} disabled={!valido || ocupado}>
          {ocupado ? 'Guardando…' : aprobar ? 'Aprobar' : 'Rechazar'}
        </button>
      </div>
    </form>
  )
}
