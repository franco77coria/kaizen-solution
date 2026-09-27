/**
 * Reciprocal Rank Fusion. Combina varias listas ordenadas sin necesidad de
 * que sus puntajes sean comparables entre si, que es justamente el problema
 * de mezclar similitud coseno con ranking textual de Postgres.
 *
 * k=60 es el valor habitual de la literatura; amortigua el peso de los
 * primeros puestos para que una sola estrategia no domine la fusion.
 */
const K = 60

export interface RankedList<T> {
  items: T[]
  peso: number
}

export function reciprocalRankFusion<T>(
  listas: Array<RankedList<T>>,
  clave: (item: T) => string,
): Array<{ item: T; score: number; ranks: Map<number, number> }> {
  const acumulado = new Map<string, { item: T; score: number; ranks: Map<number, number> }>()

  listas.forEach((lista, indiceLista) => {
    lista.items.forEach((item, posicion) => {
      const id = clave(item)
      const rank = posicion + 1
      const aporte = lista.peso / (K + rank)

      const previo = acumulado.get(id)
      if (previo) {
        previo.score += aporte
        previo.ranks.set(indiceLista, rank)
      } else {
        acumulado.set(id, {
          item,
          score: aporte,
          ranks: new Map([[indiceLista, rank]]),
        })
      }
    })
  })

  return [...acumulado.values()].sort((a, b) => b.score - a.score)
}
