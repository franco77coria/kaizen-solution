import { useEffect, useState } from 'react'
import { api, type EstadoFuentes, type Scope } from './api'
import { ConexionGoogle } from './ConexionGoogle'
import { Candidatos } from './Candidatos'

/**
 * Ajustes del espacio: de dónde lee SUMA las notas de reunión.
 *
 * Antes esto estaba en la pantalla principal y era lo primero que veía
 * cualquiera que entraba. Es configuración que se hace una vez; vive aquí.
 */
/** Cuantas consultas de 5 segundos se espera la sincronizacion: 2 minutos. */
const ESPERA_MAXIMA = 24

export function Ajustes({ scope }: { scope: Scope }): JSX.Element {
  const [fuentes, setFuentes] = useState<EstadoFuentes | null>(null)
  const [refresco, setRefresco] = useState(0)

  // Resultado del regreso desde Google. Sin leerlo, una vinculación exitosa
  // se ve igual que no haber hecho nada.
  const [regreso] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    const valor = p.get('fuente') ?? p.get('google')
    if (valor) window.history.replaceState(null, '', window.location.pathname)
    return valor
  })

  useEffect(() => {
    void (async () => {
      try {
        setFuentes(await api.sourcesStatus(scope))
      } catch {
        setFuentes(null)
      }
    })()
  }, [scope, refresco])

  const refrescar = (): void => setRefresco((n) => n + 1)

  // La sincronizacion corre en segundo plano (tarda de segundos a un par de
  // minutos). Sin esperarla, la lista de candidatos se carga ANTES de que
  // termine y queda vacia, como si Drive no tuviera nada. Se consulta el
  // estado hasta que cambia la fecha de la ultima sincronizacion.
  // `undefined` = no se espera nada; si no, la fecha que habia al empezar.
  const [esperandoDesde, setEsperandoDesde] = useState<string | null | undefined>(
    regreso === 'conectada' ? null : undefined,
  )

  useEffect(() => {
    if (esperandoDesde === undefined) return
    let intentos = 0
    const reloj = setInterval(() => {
      intentos++
      void api
        .sourcesStatus(scope)
        .then((estado) => {
          setFuentes(estado)
          const termino = estado.lastSyncAt !== null && estado.lastSyncAt !== esperandoDesde
          if (termino || intentos >= ESPERA_MAXIMA) {
            setEsperandoDesde(undefined)
            refrescar()
          }
        })
        .catch(() => {
          if (intentos >= ESPERA_MAXIMA) setEsperandoDesde(undefined)
        })
    }, 5_000)
    return () => clearInterval(reloj)
  }, [esperandoDesde, scope])

  return (
    <div className="pagina-angosta">
      <header className="pagina-cabecera">
        <h1 className="pagina-titulo">Ajustes</h1>
        <p className="tenue">De dónde lee SUMA las notas de reunión de {scope.tenantName}.</p>
      </header>

      {regreso && (
        <p className="aviso ok" role="status">
          {regreso === 'conectada'
            ? 'Google Drive quedó conectado. La primera sincronización está en curso.'
            : 'Tu cuenta de Google quedó vinculada.'}
        </p>
      )}

      {fuentes && fuentes.extraccionesIncompletas > 0 && (
        <p className="aviso">
          {fuentes.extraccionesIncompletas} documento(s) no se pudieron leer completos: las
          respuestas pueden no cubrir todo su contenido.
        </p>
      )}

      <div className="ajustes">
        <ConexionGoogle
          scope={scope}
          fuentes={fuentes}
          onCambio={() => {
            setEsperandoDesde(fuentes?.lastSyncAt ?? null)
            refrescar()
          }}
        />
        {esperandoDesde !== undefined && (
          <p className="tenue" role="status">
            Buscando notas de reunión en Drive…
          </p>
        )}
        <Candidatos key={`candidatos-${refresco}`} scope={scope} onCambio={refrescar} />
      </div>
    </div>
  )
}
