/**
 * Los campos `features` (Service) y `tags` (Project) guardan un array JSON
 * dentro de una columna String. Si el contenido quedó mal (edición manual,
 * import viejo), un JSON.parse pelado tira y se lleva puesta la página entera
 * porque corre durante el render del server component.
 *
 * Esto degrada a array vacío en vez de romper.
 */
export function parseJsonArray(raw: string | null | undefined): string[] {
    if (!raw) return []

    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((item): item is string => typeof item === 'string')
    } catch {
        console.warn('[json-array] valor no parseable, se ignora:', raw.slice(0, 80))
        return []
    }
}
