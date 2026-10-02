import { createElement, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * Rutas de la aplicacion.
 *
 * La app vive bajo una ruta base (`/app`) porque comparte dominio
 * con la landing. TODA direccion -fetch, enlaces, redirecciones- pasa por
 * `conBase`: una sola barra inicial olvidada manda al usuario a la landing.
 *
 * Router propio sobre la History API. Son cinco pantallas sin parametros:
 * una dependencia de ruteo agregaria mas codigo del que reemplaza.
 */

/** '/app' en produccion y desarrollo; '' si se sirviera en la raiz. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function conBase(camino: string): string {
  return `${BASE}${camino.startsWith('/') ? camino : `/${camino}`}`
}

export type Ruta =
  | 'panorama'
  | 'mapa'
  | 'sumar'
  | 'suma'
  | 'dashboard'
  | 'revision'
  | 'lideres'
  | 'ajustes'
  | 'entrar-local'

const CAMINOS: Record<Ruta, string> = {
  panorama: '/',
  mapa: '/mapa',
  sumar: '/persona',
  suma: '/suma',
  // Con parametro: /suma/<id>. Se reconoce aparte (RE_DASHBOARD).
  dashboard: '/suma/:id',
  revision: '/revision',
  lideres: '/lideres',
  ajustes: '/ajustes',
  'entrar-local': '/auth/local',
}

export function caminoDe(ruta: Ruta): string {
  return CAMINOS[ruta]
}

function rutaDeUbicacion(): Ruta {
  let camino = window.location.pathname
  if (BASE && camino.startsWith(BASE)) camino = camino.slice(BASE.length)
  camino = camino.replace(/\/+$/, '') || '/'
  if (RE_DASHBOARD.test(camino)) return 'dashboard'
  const encontrada = (Object.entries(CAMINOS) as Array<[Ruta, string]>).find(
    ([, c]) => c === camino,
  )
  // Una ruta desconocida cae en el panorama en vez de una pantalla en blanco.
  return encontrada?.[0] ?? 'panorama'
}

const EVENTO = 'geodemografico:navegacion'

/** Un dashboard publicado: /suma/<uuid>. */
const RE_DASHBOARD = /^\/suma\/([0-9a-f-]{36})$/i

function idDeUbicacion(): string | null {
  let camino = window.location.pathname
  if (BASE && camino.startsWith(BASE)) camino = camino.slice(BASE.length)
  return RE_DASHBOARD.exec(camino.replace(/\/+$/, ''))?.[1] ?? null
}

/** Direccion completa de un dashboard, para abrirlo o copiar su enlace. */
export function caminoDashboard(id: string): string {
  return conBase(`/suma/${id}`)
}

export function navegarADashboard(id: string): void {
  window.history.pushState(null, '', caminoDashboard(id))
  window.dispatchEvent(new Event(EVENTO))
  window.scrollTo({ top: 0 })
}

function suscribir(avisar: () => void): () => void {
  window.addEventListener('popstate', avisar)
  window.addEventListener(EVENTO, avisar)
  return () => {
    window.removeEventListener('popstate', avisar)
    window.removeEventListener(EVENTO, avisar)
  }
}

export function useRuta(): Ruta {
  return useSyncExternalStore(suscribir, rutaDeUbicacion)
}

/** Id del dashboard abierto (en /suma/<id>), o null. */
export function useIdDashboard(): string | null {
  return useSyncExternalStore(suscribir, idDeUbicacion)
}

export function navegar(ruta: Ruta, opciones: { reemplazar?: boolean } = {}): void {
  const destino = conBase(CAMINOS[ruta])
  if (opciones.reemplazar) window.history.replaceState(null, '', destino)
  else window.history.pushState(null, '', destino)
  window.dispatchEvent(new Event(EVENTO))
  window.scrollTo({ top: 0 })
}

/**
 * Enlace interno. Es un `<a href>` de verdad: ctrl/cmd+clic y el boton del
 * medio abren en otra pestaña, y el lector de pantalla lo anuncia como enlace.
 * Solo el clic simple se intercepta para no recargar la pagina.
 */
export function Enlace({
  a,
  onClick,
  ...props
}: { a: Ruta } & AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element {
  return createElement('a', {
    ...props,
    href: conBase(CAMINOS[a]),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      navegar(a)
    },
  })
}
