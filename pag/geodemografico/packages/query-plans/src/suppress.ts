import { LIMITS, type AnalyticsCell } from '@kaizen/contracts'

/**
 * Supresion por umbral de anonimato.
 *
 * Regla que el plan exige explicitamente: un grupo suprimido NO aparece como
 * cero. Aparece como suprimido, con `value: null` y `suppressed: true`, para
 * que nadie lea "0 personas en este municipio" cuando en realidad hay 3.
 *
 * Tambien se suprime el complemento cuando queda un solo grupo por debajo del
 * umbral: si se publican todos menos uno, y el total es conocido, el grupo
 * suprimido se reconstruye por resta.
 */
export interface SuppressionOutcome {
  rows: AnalyticsCell[]
  totalGroups: number
  suppressedGroups: number
  threshold: number
}

export function aplicarSupresion(
  filas: Array<{ grupo: string; cantidad: number }>,
  etiquetar: (grupo: string) => string = (g) => g,
  umbral: number = LIMITS.SUPPRESSION_THRESHOLD,
): SuppressionOutcome {
  const bajoUmbral = filas.filter((f) => f.cantidad > 0 && f.cantidad < umbral)

  const aSuprimir = new Set(bajoUmbral.map((f) => f.grupo))

  // Si queda exactamente UN grupo suprimido, el resto mas el total lo revelan.
  // Se suprime ademas el grupo publicado mas chico para romper la resta.
  if (aSuprimir.size === 1 && filas.length > 1) {
    const publicados = filas
      .filter((f) => !aSuprimir.has(f.grupo))
      .sort((a, b) => a.cantidad - b.cantidad)
    const victima = publicados[0]
    if (victima) aSuprimir.add(victima.grupo)
  }

  const rows: AnalyticsCell[] = filas.map((f) => ({
    key: f.grupo,
    label: etiquetar(f.grupo),
    value: aSuprimir.has(f.grupo) ? null : f.cantidad,
    suppressed: aSuprimir.has(f.grupo),
  }))

  return {
    rows,
    totalGroups: filas.length,
    suppressedGroups: aSuprimir.size,
    threshold: umbral,
  }
}
