/**
 * Etiquetas de los valores que valida el servidor (`GENDERS` y
 * `RELATIONSHIPS` en @kaizen/contracts, con el mismo `check` en la base).
 * Si se agrega un valor allá y no acá, el formulario simplemente no lo ofrece;
 * si se agrega acá y no allá, el servidor lo rechaza con 400.
 */

export const GENEROS: Array<[string, string]> = [
  ['femenino', 'Femenino'],
  ['masculino', 'Masculino'],
  ['no_binario', 'No binario'],
  ['otro', 'Otro'],
  ['prefiere_no_decir', 'Prefiere no decirlo'],
]

export const RELACIONES: Array<[string, string]> = [
  ['familia', 'Familia'],
  ['amistad', 'Amistad'],
  ['vecindad', 'Vecindad'],
  ['trabajo', 'Trabajo'],
  ['comunidad', 'Comunidad'],
  ['otra', 'Otra'],
]

/** Incluye 'sin_dato': los registros anteriores al campo se agrupan así. */
export function etiquetaGenero(valor: string): string {
  if (valor === 'sin_dato') return 'Sin dato'
  return GENEROS.find(([v]) => v === valor)?.[1] ?? valor
}
