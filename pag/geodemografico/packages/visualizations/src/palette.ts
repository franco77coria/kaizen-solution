/**
 * Paletas fijas. El ChartSpec elige una de esta lista; no acepta colores
 * arbitrarios, porque un color libre es un vector de inyeccion en SVG y
 * ademas rompe el contraste sin que nadie lo note.
 *
 * Todas las combinaciones texto/fondo de estas paletas se eligieron para
 * mantener contraste legible; los valores se dibujan en el color `ink`
 * correspondiente, no en blanco sobre cualquier tono.
 */
export interface Palette {
  /** Escala de menor a mayor intensidad. */
  scale: readonly string[]
  /** Color de texto sobre cada peldano de la escala. */
  ink: readonly string[]
  axis: string
  grid: string
  text: string
  background: string
  /** Relleno para un area sin dato o suprimida. Distinto de "cero". */
  missing: string
}

export const PALETTES: Record<string, Palette> = {
  sequential_blue: {
    scale: ['#eff6ff', '#bfdbfe', '#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a'],
    ink: ['#1e293b', '#1e293b', '#0f172a', '#ffffff', '#ffffff', '#ffffff'],
    axis: '#475569',
    grid: '#e2e8f0',
    text: '#0f172a',
    background: '#ffffff',
    missing: '#f1f5f9',
  },
  sequential_warm: {
    scale: ['#fff7ed', '#fed7aa', '#fdba74', '#f97316', '#c2410c', '#7c2d12'],
    ink: ['#1e293b', '#1e293b', '#0f172a', '#ffffff', '#ffffff', '#ffffff'],
    axis: '#57534e',
    grid: '#e7e5e4',
    text: '#1c1917',
    background: '#ffffff',
    missing: '#f5f5f4',
  },
  neutral: {
    scale: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#475569', '#1e293b'],
    ink: ['#0f172a', '#0f172a', '#0f172a', '#0f172a', '#ffffff', '#ffffff'],
    axis: '#475569',
    grid: '#e2e8f0',
    text: '#0f172a',
    background: '#ffffff',
    missing: '#f1f5f9',
  },
}

export function getPalette(name: string): Palette {
  return PALETTES[name] ?? PALETTES['sequential_blue']!
}

/** Ubica un valor en la escala. Devuelve -1 para ausente o suprimido. */
export function escalon(valor: number | null, maximo: number, pasos: number): number {
  if (valor === null || maximo <= 0) return -1
  const proporcion = valor / maximo
  return Math.min(pasos - 1, Math.floor(proporcion * pasos))
}
