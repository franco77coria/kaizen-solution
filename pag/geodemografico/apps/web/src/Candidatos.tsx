import { useEffect, useState } from 'react'
import { api, type Candidato, type Scope } from './api'

/**
 * Seleccion de la coleccion inicial.
 *
 * Solo entran solos los archivos que el proveedor confirma como artefactos de
 * reunion. El resto se muestra aca con el motivo por el que se propuso, para
 * que la decision sea informada y quede claro que fue una PISTA, no una
 * certeza.
 *
 * Lo que se lista es metadata: el contenido de un archivo no admitido nunca se
 * descargo.
 */
export function Candidatos({ scope, onCambio }: { scope: Scope; onCambio: () => void }): JSX.Element | null {
  const [datos, setDatos] = useState<{
    candidatos: Candidato[]
    admitidos: Candidato[]
    descartados: number
  } | null>(null)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setDatos(await api.candidatos(scope))
      } catch {
        setDatos(null)
      }
    })()
  }, [scope])

  if (!datos) return null
  if (datos.candidatos.length === 0 && datos.admitidos.length === 0) return null

  function alternar(id: string): void {
    setElegidos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  async function decidir(decision: 'admitir' | 'descartar'): Promise<void> {
    if (elegidos.size === 0) return
    setOcupado(true)
    setAviso(null)
    try {
      const r = await api.decidirCandidatos(scope, [...elegidos], decision)
      setAviso(
        decision === 'admitir'
          ? `${r.afectados} archivo(s) admitido(s). La lectura quedó encolada.`
          : `${r.afectados} archivo(s) descartado(s).`,
      )
      setElegidos(new Set())
      setDatos(await api.candidatos(scope))
      onCambio()
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo aplicar la decisión.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="tarjeta" style={{ gridColumn: '1 / -1' }}>
      <h2>Archivos encontrados en Drive</h2>

      {aviso && <div className="aviso">{aviso}</div>}

      {datos.candidatos.length > 0 ? (
        <>
          <p className="metrica-etiqueta">
            Estos archivos <strong>no</strong> los confirmó Google como notas de reunión, así que no
            entran solos. Elegí cuáles querés que el asistente pueda leer.
          </p>

          <div style={{ display: 'grid', gap: 6, margin: '12px 0' }}>
            {datos.candidatos.map((c) => (
              <label
                key={c.targetFileId}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  border: '1px solid var(--borde)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: elegidos.has(c.targetFileId) ? 'var(--acento-suave)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={elegidos.has(c.targetFileId)}
                  onChange={() => alternar(c.targetFileId)}
                  style={{ marginTop: 4 }}
                />
                <span>
                  <strong>{c.nombre}</strong>
                  <span className="metrica-etiqueta" style={{ display: 'block' }}>
                    {c.modificado ? new Date(c.modificado).toLocaleDateString('es-CO') : 'sin fecha'}
                    {c.motivo ? ` · ${c.motivo}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="boton primario"
              onClick={() => void decidir('admitir')}
              disabled={ocupado || elegidos.size === 0}
            >
              Admitir {elegidos.size > 0 ? `(${elegidos.size})` : ''}
            </button>
            <button
              type="button"
              className="boton"
              onClick={() => void decidir('descartar')}
              disabled={ocupado || elegidos.size === 0}
            >
              Descartar
            </button>
          </div>
        </>
      ) : (
        <p className="metrica-etiqueta">No quedan archivos pendientes de decisión.</p>
      )}

      {datos.admitidos.length > 0 && (
        <p className="metrica-etiqueta" style={{ marginTop: 14 }}>
          {datos.admitidos.length} archivo(s) admitido(s)
          {datos.descartados > 0 ? ` · ${datos.descartados} descartado(s)` : ''}.
        </p>
      )}
    </section>
  )
}
