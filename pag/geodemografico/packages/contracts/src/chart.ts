import { z } from 'zod'

/**
 * ChartSpec cerrado. El endpoint de visualizacion NO acepta URLs, SQL,
 * HTML ni valores libres: solo una referencia a una ejecucion analitica
 * propia y autorizada, mas opciones de presentacion de una lista blanca.
 * El render es determinista y ocurre en el servidor.
 */
export const CHART_KINDS = ['bar', 'line', 'table', 'choropleth'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export const PALETTES = ['sequential_blue', 'sequential_warm', 'neutral'] as const

export const chartSpecSchema = z
  .object({
    kind: z.enum(CHART_KINDS),
    /** Ejecucion analitica de la que salen los numeros. Debe ser del solicitante. */
    runId: z.string().uuid(),
    title: z.string().min(1).max(120),
    /** Subtitulo opcional. Texto plano, se escapa al renderizar. */
    subtitle: z.string().max(200).default(''),
    palette: z.enum(PALETTES).default('sequential_blue'),
    /** Mostrar el numero sobre cada elemento. Requerido por el plan en mapas. */
    showValues: z.boolean().default(true),
    /** Solo para choropleth: nivel territorial del catalogo versionado. */
    areaLevel: z.enum(['municipality']).optional(),
    /** Solo para choropleth: version del catalogo de geometrias. */
    geographyVersion: z.string().max(40).optional(),
  })
  .strict()

export type ChartSpec = z.infer<typeof chartSpecSchema>

/** Tabla accesible que acompana SIEMPRE a la imagen. La imagen no es la unica via al dato. */
export interface AccessibleTable {
  caption: string
  columns: string[]
  rows: Array<Array<string>>
  /** Nota al pie que declara supresiones. No se omite cuando hay grupos suprimidos. */
  footnote: string
}
