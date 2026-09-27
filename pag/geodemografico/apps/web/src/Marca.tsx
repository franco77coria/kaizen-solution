/**
 * Símbolos en SVG, con `currentColor` para que sigan el tema.
 *
 * El del producto repite la idea central del dashboard: un mosaico de celdas
 * que se van llenando. El de SUMA es un "+", que es literalmente lo que hace
 * la herramienta: sumar personas al territorio.
 */

export function SimboloGeo({ className = 'marca-simbolo' }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="currentColor" />
      <rect x="13" y="2" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.55" />
      <rect x="2" y="13" width="9" height="9" rx="2.5" fill="currentColor" opacity="0.3" />
      <rect
        x="13.75"
        y="13.75"
        width="7.5"
        height="7.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
    </svg>
  )
}

export function SimboloSuma({ className = '' }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Icono({
  nombre,
}: {
  nombre:
    | 'cerrar'
    | 'expandir'
    | 'contraer'
    | 'enviar'
    | 'mas'
    | 'atras'
    | 'buscar'
    | 'copiar'
    | 'tablero'
    | 'enlace'
    | 'imprimir'
    | 'listo'
}): JSX.Element {
  const trazos: Record<typeof nombre, string> = {
    cerrar: 'M6 6l12 12M18 6L6 18',
    expandir: 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7',
    contraer: 'M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7',
    enviar: 'M12 19V5M5 12l7-7 7 7',
    mas: 'M12 5v14M5 12h14',
    atras: 'M15 18l-6-6 6-6',
    buscar: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4',
    copiar: 'M9 9h10v10H9zM5 15V5h10',
    tablero: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
    enlace:
      'M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1',
    imprimir: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z',
    listo: 'M5 12l5 5 9-10',
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={trazos[nombre]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
