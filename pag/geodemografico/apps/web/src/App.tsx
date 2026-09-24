import { useEffect, useRef, useState } from 'react'
import { ApiError, api, type Me, type Scope } from './api'
import { Ajustes } from './Ajustes'
import { Chat, useConversacion } from './Chat'
import { Entrar } from './Entrar'
import { Lideres } from './Lideres'
import { Icono, SimboloGeo, SimboloSuma } from './Marca'
import { Panorama } from './Panorama'
import { Revision } from './Revision'
import { Sumar } from './Sumar'
import { Enlace, conBase, navegar, useRuta } from './rutas'

/**
 * Shell de la aplicación: sesión, espacio activo, barra, rutas y SUMA.
 *
 * La pantalla principal es el panorama. Lo técnico (Drive, sincronización)
 * vive en Ajustes, al que se llega desde el menú de la cuenta: quien entra a
 * probar la herramienta no tiene por qué ver configuración.
 */

const CLAVE_ESPACIO = 'geodemografico:espacio'

function permisos(scope: Scope | null) {
  const p = scope?.permissions ?? []
  return {
    sumar: p.includes('records.capture'),
    revisar: p.includes('records.review'),
    notas: p.includes('notes.read'),
    administrar: p.includes('sources.manage') || p.includes('tenant.admin'),
    lideres: p.includes('tenant.admin'),
  }
}

export function App(): JSX.Element {
  const ruta = useRuta()
  const [me, setMe] = useState<Me | null>(null)
  const [scope, setScope] = useState<Scope | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-sesion' | 'error'>('cargando')
  const [error, setError] = useState<string | null>(null)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [pendientes, setPendientes] = useState(0)

  const conversacion = useConversacion(scope)
  const puede = permisos(scope)

  useEffect(() => {
    void (async () => {
      try {
        await api.csrf().catch(() => null)
        const datos = await api.me()
        setMe(datos)

        // Solo cuentan los espacios donde la cuenta puede hacer algo: una
        // finalidad sin permisos no se ofrece, ni siquiera deshabilitada.
        const usables = datos.scopes.filter((s) => s.permissions.length > 0)
        let recordado: string | null = null
        try {
          recordado = localStorage.getItem(CLAVE_ESPACIO)
        } catch {
          // Almacenamiento bloqueado: se usa el primero.
        }
        setScope(
          usables.find((s) => `${s.tenantId}|${s.purposeId}` === recordado) ?? usables[0] ?? null,
        )
        setEstado('listo')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setEstado('sin-sesion')
          return
        }
        setError(e instanceof Error ? e.message : 'No se pudo cargar la sesión.')
        setEstado('error')
      }
    })()
  }, [])

  // Contador de la cola de revisión, para la insignia de la navegación.
  useEffect(() => {
    if (!scope || !puede.revisar) {
      setPendientes(0)
      return
    }
    void api
      .pendientes(scope)
      .then((r) => setPendientes(r.pendientes.filter((p) => p.puedeRevisar).length))
      .catch(() => setPendientes(0))
  }, [scope, puede.revisar, ruta])

  function elegirEspacio(s: Scope): void {
    setScope(s)
    setChatAbierto(false)
    try {
      localStorage.setItem(CLAVE_ESPACIO, `${s.tenantId}|${s.purposeId}`)
    } catch {
      // Sin almacenamiento solo se pierde recordar la elección.
    }
  }

  if (estado === 'cargando') return <div className="cargando">Cargando…</div>
  if (estado === 'sin-sesion') return <Entrar />
  if (estado === 'error') return <Entrar error={error} />

  const usables = me?.scopes.filter((s) => s.permissions.length > 0) ?? []

  if (!scope) {
    return (
      <Entrar error="Tu cuenta entró, pero todavía no tiene permisos en ningún espacio. Pedile a quien administra que te los asigne." />
    )
  }

  // SUMA a pantalla completa ocupa todo debajo de la barra.
  const enSuma = ruta === 'suma' && puede.notas
  const rutaRestringida =
    (ruta === 'revision' && !puede.revisar) ||
    (ruta === 'lideres' && !puede.lideres) ||
    (ruta === 'ajustes' && !puede.administrar)

  return (
    <>
      <header className="barra">
        <div className="barra-interior">
          <Enlace a="panorama" className="marca" aria-label="Geodemográfico, ir al panorama">
            <SimboloGeo />
            <span className="marca-nombre">
              Geodemográfico <span>· {scope.tenantName}</span>
            </span>
          </Enlace>

          <nav className="navegacion" aria-label="Secciones">
            <Enlace a="panorama" aria-current={ruta === 'panorama' ? 'page' : undefined}>
              Panorama
            </Enlace>
            {puede.revisar && (
              <Enlace a="revision" aria-current={ruta === 'revision' ? 'page' : undefined}>
                Revisión
                {pendientes > 0 && <span className="insignia">{pendientes}</span>}
              </Enlace>
            )}
            {puede.lideres && (
              <Enlace a="lideres" aria-current={ruta === 'lideres' ? 'page' : undefined}>
                Líderes
              </Enlace>
            )}
            {puede.notas && (
              <Enlace a="suma" aria-current={ruta === 'suma' ? 'page' : undefined}>
                SUMA
              </Enlace>
            )}
          </nav>

          <div className="barra-acciones">
            {puede.sumar && ruta !== 'sumar' && (
              <Enlace a="sumar" className="boton primario">
                <Icono nombre="mas" />
                Sumar persona
              </Enlace>
            )}
            <MenuCuenta
              email={me?.user.emailDisplay ?? ''}
              espacios={usables}
              actual={scope}
              onElegir={elegirEspacio}
              puedeAdministrar={puede.administrar}
              puedeLideres={puede.lideres}
              puedeRevisar={puede.revisar}
              pendientes={pendientes}
            />
          </div>
        </div>
      </header>

      {enSuma ? (
        <Chat
          scope={scope}
          conversacion={conversacion}
          modo="completa"
          onExpandir={() => {
            // Volver al panel: se abre el flotante sobre el panorama con la
            // misma conversación.
            navegar('panorama')
            setChatAbierto(true)
          }}
        />
      ) : (
        <main className="contenido">
          {ruta === 'panorama' && <Panorama scope={scope} />}
          {ruta === 'sumar' && <Sumar scope={scope} />}
          {ruta === 'suma' && !puede.notas && (
            <div className="vacio">
              <strong>Tu cuenta no tiene acceso a SUMA en este espacio.</strong>
            </div>
          )}
          {rutaRestringida && (
            <div className="vacio">
              <strong>Tu cuenta no tiene acceso a esta sección en este espacio.</strong>
            </div>
          )}
          {ruta === 'revision' && puede.revisar && <Revision scope={scope} />}
          {ruta === 'lideres' && puede.lideres && <Lideres scope={scope} />}
          {ruta === 'ajustes' && puede.administrar && <Ajustes scope={scope} />}
        </main>
      )}

      {/* Teléfono: la acción principal donde llega el pulgar. */}
      {!enSuma && (puede.sumar || puede.notas) && (
        <div className="barra-inferior">
          {puede.sumar && ruta !== 'sumar' && (
            <Enlace a="sumar" className="boton primario">
              <Icono nombre="mas" />
              Sumar persona
            </Enlace>
          )}
          {puede.notas && (
            <button
              type="button"
              className="lanzador-movil"
              onClick={() => setChatAbierto(true)}
              aria-label="Abrir SUMA"
            >
              <span className="suma-sello" aria-hidden="true">
                <SimboloSuma />
              </span>
              SUMA
            </button>
          )}
        </div>
      )}

      {/* Escritorio: SUMA flotante abajo a la derecha. */}
      {!enSuma && puede.notas && (
        <button
          type="button"
          className="lanzador"
          onClick={() => setChatAbierto(true)}
          aria-expanded={chatAbierto}
          aria-controls="panel-suma"
        >
          <span className="suma-sello" aria-hidden="true">
            <SimboloSuma />
          </span>
          SUMA
        </button>
      )}

      {!enSuma && chatAbierto && puede.notas && (
        <Chat
          scope={scope}
          conversacion={conversacion}
          modo="panel"
          onCerrar={() => setChatAbierto(false)}
          onExpandir={() => {
            setChatAbierto(false)
            navegar('suma')
          }}
        />
      )}
    </>
  )
}

function MenuCuenta({
  email,
  espacios,
  actual,
  onElegir,
  puedeAdministrar,
  puedeLideres,
  puedeRevisar,
  pendientes,
}: {
  email: string
  espacios: Scope[]
  actual: Scope
  onElegir: (s: Scope) => void
  puedeAdministrar: boolean
  puedeLideres: boolean
  puedeRevisar: boolean
  pendientes: number
}): JSX.Element {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic afuera o con Escape.
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const clave = (s: Scope): string => `${s.tenantId}|${s.purposeId}`

  return (
    <div className="cuenta" ref={ref}>
      <button
        type="button"
        className="cuenta-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Cuenta"
        onClick={() => setAbierto((a) => !a)}
      >
        {email.slice(0, 1) || '·'}
      </button>

      {abierto && (
        <div className="cuenta-menu" role="menu">
          <div className="quien">{email}</div>

          {/* El selector de espacio aparece solo si hay más de uno usable. */}
          {espacios.length > 1 && (
            <label>
              <span className="etiqueta">Espacio</span>
              <select
                className="entrada"
                value={clave(actual)}
                onChange={(e) => {
                  const elegido = espacios.find((s) => clave(s) === e.target.value)
                  if (elegido) onElegir(elegido)
                }}
              >
                {espacios.map((s) => (
                  <option key={clave(s)} value={clave(s)}>
                    {s.tenantName}
                  </option>
                ))}
              </select>
            </label>
          )}

          {puedeRevisar && (
            <Enlace a="revision" role="menuitem" onClick={() => setAbierto(false)} className="solo-movil">
              Revisión{pendientes > 0 ? ` (${pendientes})` : ''}
            </Enlace>
          )}
          {puedeLideres && (
            <Enlace a="lideres" role="menuitem" onClick={() => setAbierto(false)} className="solo-movil">
              Líderes
            </Enlace>
          )}
          {puedeAdministrar && (
            <Enlace a="ajustes" role="menuitem" onClick={() => setAbierto(false)}>
              Ajustes
            </Enlace>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void api.logout().finally(() => {
                window.location.href = conBase('/')
              })
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  )
}
