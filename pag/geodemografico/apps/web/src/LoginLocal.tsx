import { SimboloGeo } from './Marca'
import { conBase } from './rutas'

/**
 * Selección de cuenta del proveedor de identidad LOCAL.
 *
 * Existe solo para desarrollo: sustituye la pantalla de Google cuando
 * OIDC_PROVIDER=fake. No pide contraseña porque no autentica nada real, y el
 * backend rechaza este proveedor fuera de APP_ENV=local. En producción esta
 * pantalla no se alcanza nunca.
 *
 * Elegir una cuenta NO concede permisos: el usuario sigue teniendo que estar
 * invitado y tener membresía y concesiones explícitas.
 */
const CUENTAS = [
  { sub: 'sub-admin', nombre: 'Administración', descripcion: 'Suma personas, ve el panorama y configura Drive' },
  { sub: 'sub-lider', nombre: 'Líder', descripcion: 'Suma personas y ve el panorama; no ve SUMA' },
  { sub: 'sub-a2', nombre: 'Analista', descripcion: 'Ve el panorama, revisa y aprueba lo que suman otros' },
  { sub: 'sub-a3', nombre: 'Captura', descripcion: 'Suma personas y lee las notas con SUMA' },
  { sub: 'sub-a1', nombre: 'Lectura', descripcion: 'Solo lee las notas con SUMA' },
  { sub: 'sub-b1', nombre: 'Otro espacio', descripcion: 'Lectura en otra alcaldía (no ve nada de esta)' },
  { sub: 'sub-sin-inv', nombre: 'Sin invitación', descripcion: 'Tiene que quedar afuera' },
]

export function LoginLocal(): JSX.Element {
  const params = new URLSearchParams(window.location.search)
  const state = params.get('state') ?? ''
  // Se propaga para que el backend corte el bucle si, tras reiniciar, la
  // cookie del flujo sigue sin llegar (cookies bloqueadas, por ejemplo).
  const reintento = params.get('reintento') === '1'

  return (
    <main className="entrar">
      <div className="entrar-tarjeta ancha">
        <SimboloGeo className="entrar-simbolo" />
        <h1>Elegí una cuenta de prueba</h1>
        <p className="mas-tenue">Modo desarrollo: en producción acá aparece Google.</p>

        <ul className="cuentas-prueba">
          {CUENTAS.map((c) => (
            <li key={c.sub}>
              <a
                href={conBase(
                  `/auth/callback?code=${encodeURIComponent(c.sub)}&state=${encodeURIComponent(state)}${reintento ? '&reintento=1' : ''}`,
                )}
              >
                <strong>{c.nombre}</strong>
                <span className="tenue">{c.descripcion}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
