import type { CeldaAnalitica } from './api'

export function valorVisible(celda: CeldaAnalitica | undefined): number | null {
  return celda && !celda.suppressed && celda.value !== null ? celda.value : null
}

export function compararTerritorios(registros: CeldaAnalitica[], referidos: CeldaAnalitica[], medida: 'records' | 'referrals') {
  const referencias = new Map(referidos.map(r => [r.key, r]))
  const filas = registros.map(r => ({ key: r.key, label: r.label, registros: valorVisible(r), referidos: valorVisible(referencias.get(r.key)) }))
  const campo = medida === 'records' ? 'registros' : 'referidos'
  const seleccion = filas.filter(r => r.registros !== 0 || r.referidos !== 0)
    .sort((a, b) => (a[campo] === null && b[campo] === null ? 0 : a[campo] === null ? 1 : b[campo] === null ? -1 : b[campo]! - a[campo]!) || a.label.localeCompare(b.label, 'es'))
    .slice(0, 6)
  const maximo = Math.max(1, ...seleccion.flatMap(r => [r.registros ?? 0, r.referidos ?? 0]))
  return { filas: seleccion, maximo }
}
