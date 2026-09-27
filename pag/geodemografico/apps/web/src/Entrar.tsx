import { SimboloGeo } from './Marca'
import { conBase } from './rutas'

/**
 * Pantalla de entrada. Es lo primero que ve quien prueba la herramienta, así
 * que dice qué es en una línea y tiene una sola acción.
 *
 * El botón lleva al inicio del flujo de identidad del servidor. En producción
 * es Google; en desarrollo el servidor redirige a la pantalla de cuentas de
 * prueba (`LoginLocal`). La pantalla no sabe cuál: lo decide el servidor.
 */
export function Entrar({ error }: { error?: string | null }): JSX.Element {
  return (
    <main className="entrar">
      <div className="entrar-tarjeta">
        <SimboloGeo className="entrar-simbolo" />
        <h1>Geodemográfico</h1>
        <p className="tenue">
          Las personas que se suman, en cada uno de los 116 municipios de Cundinamarca.
        </p>

        {error && <p className="aviso error">{error}</p>}

        <a className="boton primario grande entrar-boton" href={conBase('/auth/start')}>
          Entrar con Google
        </a>
        <p className="mas-tenue entrar-nota">
          Solo pueden entrar las cuentas habilitadas para un espacio.
        </p>
      </div>
      <p className="entrar-pie mas-tenue">Kaizen Solutions</p>
    </main>
  )
}
