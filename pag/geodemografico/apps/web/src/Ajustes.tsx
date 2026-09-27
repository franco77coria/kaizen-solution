import { useEffect, useState } from 'react'
import { api, type EstadoFuentes, type Scope } from './api'
import { ConexionGoogle } from './ConexionGoogle'
import { Candidatos } from './Candidatos'

/**
 * Ajustes del espacio: de dónde lee SUMA las notas de reunión.
 *
 * Antes esto estaba en la pantalla principal y era lo primero que veía
 * cualquiera que entraba. Es configuración que se hace una vez; vive acá.
 */
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
        <ConexionGoogle scope={scope} fuentes={fuentes} onCambio={refrescar} />
        <Candidatos key={`candidatos-${refresco}`} scope={scope} onCambio={refrescar} />
      </div>
    </div>
  )
}
