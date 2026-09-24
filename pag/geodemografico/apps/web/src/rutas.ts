import { createElement, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * Rutas de la aplicacion.
 *
 * La app vive bajo una ruta base (`/geodemografico`) porque comparte dominio
 * con la landing. TODA direccion -fetch, enlaces, redirecciones- pasa por
 * `conBase`: una sola barra inicial olvidada manda al usuario a la landing.
 *
 * Router propio sobre la History API. Son cinco pantallas sin parametros:
 * una dependencia de ruteo agregaria mas codigo del que reemplaza.
 */

/** '/geodemografico' en produccion y desarrollo; '' si se sirviera en la raiz. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function conBase(camino: string): string {
  return `${BASE}${camino.startsWith('/') ? camino : `/${camino}`}`
}

export type Ruta = 'panorama' | 'sumar' | 'suma' | 'revision' | 'lideres' | 'ajustes' | 'entrar-local'

const CAMINOS: Record<Ruta, string> = {
  panorama: '/',
  sumar: '/sumar',
  suma: '/suma',
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
  const encontrada = (Object.entries(CAMINOS) as Array<[Ruta, string]>).find(
    ([, c]) => c === camino,
  )
  // Una ruta desconocida cae en el panorama en vez de una pantalla en blanco.
  return encontrada?.[0] ?? 'panorama'
}

const EVENTO = 'geodemografico:navegacion'

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
