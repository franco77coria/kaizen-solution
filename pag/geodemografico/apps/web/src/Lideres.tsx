import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, type Lider, type Scope } from './api'

/**
 * Líderes: quién suma.
 *
 * Se carga el email de Google de cada líder. Cuando esa cuenta entra por
 * primera vez, el sistema la reconoce; desde ahí todo lo que suma queda a su
 * nombre. Un líder puede sumar personas y ver el panorama; no ve SUMA.
 *
 * Revocar no borra lo que sumó: esas personas siguen contando. Lo que se
 * corta es su acceso, en el siguiente pedido que haga.
 */
const formato = new Intl.NumberFormat('es-CO')

export function Lideres({ scope }: { scope: Scope }): JSX.Element {
  const [lideres, setLideres] = useState<Lider[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [revocando, setRevocando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setLideres((await api.lideres(scope)).lideres)
      setError(null)
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'FORBIDDEN'
          ? 'Solo quien administra el espacio puede ver y cargar líderes.'
          : 'No se pudo cargar la lista de líderes.',
      )
    }
  }, [scope])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const emailValido = /^[^\s@]+@kaizensolutionscol\.com$/i.test(email.trim())
  const puedeCargar = nombre.trim().length >= 2 && emailValido && !cargando

  async function alta(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!puedeCargar) return
    setCargando(true)
    setError(null)
    setAviso(null)
    try {
      await api.cargarLider(scope, email.trim(), nombre.trim())
      setAviso(
        `Listo: ${nombre.trim()} ya está en la lista. Cuando entre con ${email.trim().toLowerCase()}, su cuenta queda reconocida.`,
      )
      setNombre('')
      setEmail('')
      await cargar()
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'CONFLICT'
          ? 'Ese email ya está cargado como líder.'
          : e instanceof ApiError && e.code === 'VALIDATION_FAILED'
            ? 'Revisá el nombre y usá una cuenta @kaizensolutionscol.com.'
            : 'No se pudo cargar al líder.',
      )
    } finally {
      setCargando(false)
    }
  }

  async function revocar(l: Lider): Promise<void> {
    setError(null)
    setAviso(null)
    try {
      await api.revocarLider(scope, l.id)
      setRevocando(null)
      setAviso(`${l.nombre} ya no tiene acceso. Las personas que sumó siguen contando.`)
      await cargar()
    } catch {
      setError('No se pudo revocar el acceso.')
    }
  }

  const activos = lideres?.filter((l) => l.estado === 'active').length ?? 0
  const pendientes = lideres?.filter((l) => l.estado === 'pending').length ?? 0

  return (
    <div className="pagina-angosta">
      <header className="pagina-cabecera">
        <h1 className="pagina-titulo">Líderes</h1>
        <p className="tenue">
          Cargá el email de Kaizen de cada líder. Cuando entra por primera vez lo reconocemos, y
          todo lo que suma queda a su nombre. Los líderes suman personas y ven el panorama; no ven
          SUMA.
        </p>
      </header>

      <form className="alta-lider" onSubmit={alta}>
        <fieldset className="bloque">
          <legend>Cargar un líder</legend>
          <div className="campos">
            <label className="campo">
              <span>Nombre</span>
              <input
                className="entrada"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="campo">
              <span>Email de Kaizen</span>
              <input
                className="entrada"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@kaizensolutionscol.com"
                autoComplete="off"
              />
            </label>
          </div>
          <div className="formulario-pie">
            <button type="submit" className="boton primario" disabled={!puedeCargar}>
              {cargando ? 'Cargando…' : 'Cargar líder'}
            </button>
          </div>
        </fieldset>
      </form>

      {aviso && (
        <p className="aviso ok" role="status">
          {aviso}
        </p>
      )}
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      {lideres && lideres.length === 0 && (
        <div className="vacio">
          <strong>Todavía no hay líderes cargados.</strong>
          <span>El primero que cargues aparece acá, con cuántas personas va sumando.</span>
        </div>
      )}

      {lideres && lideres.length > 0 && (
        <section className="lista-lideres" aria-label="Líderes">
          <div className="lista-lideres-titulo">
            <span>
              {activos} activo{activos === 1 ? '' : 's'}
              {pendientes > 0 && ` · ${pendientes} sin entrar todavía`}
            </span>
            <span>personas sumadas</span>
          </div>
          <ol>
            {lideres.map((l, i) => (
              <li key={l.id} className="fila-lider">
                <span className="puesto cifra">{i + 1}</span>
                <div className="fila-lider-datos">
                  <strong>{l.nombre}</strong>
                  <span className="mas-tenue">
                    {l.email}
                    {l.estado === 'pending' ? ' · todavía no entró' : ''}
                  </span>
                </div>
                <div className="fila-lider-cifra">
                  <strong className="cifra">{formato.format(l.sumadas)}</strong>
                  {l.sumadas > 0 && (
                    <span className="mas-tenue">
                      en {l.municipios} municipio{l.municipios === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {revocando === l.id ? (
                  <div className="fila-lider-confirmar">
                    <button
                      type="button"
                      className="boton fantasma"
                      onClick={() => setRevocando(null)}
                    >
                      Cancelar
                    </button>
                    <button type="button" className="boton peligro" onClick={() => void revocar(l)}>
                      Quitar acceso
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="boton fantasma fila-lider-accion"
                    onClick={() => setRevocando(l.id)}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
