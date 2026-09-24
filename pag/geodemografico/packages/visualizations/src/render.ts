import { createHash } from 'node:crypto'
import type { AccessibleTable, AnalyticsCell, ChartSpec } from '@kaizen/contracts'
import { renderChartSvg, type ChartData } from './charts.js'

/**
 * Render de SVG a PNG en el SERVIDOR.
 *
 * No se ejecuta codigo generado por el modelo: el modelo, cuando participa,
 * solo produce un ChartSpec cerrado y validado. Este modulo recibe datos ya
 * autorizados y dibuja.
 *
 * Sobre determinismo: la geometria y los valores son deterministas. El
 * rasterizado de glifos depende de la fuente disponible; por eso conviene
 * fijar CHART_FONT_FILE con una fuente versionada en despliegue. Sin ella se
 * usan las del sistema y el PNG puede diferir entre maquinas, aunque el dato
 * representado sea identico.
 */
export interface RenderedChart {
  svg: string
  png: Buffer
  sha256: string
  table: AccessibleTable
}

export async function renderChart(data: ChartData): Promise<RenderedChart> {
  const svg = renderChartSvg(data)

  const { Resvg } = await import('@resvg/resvg-js')
  const fontFile = process.env['CHART_FONT_FILE']

  const resvg = new Resvg(svg, {
    background: 'white',
    font: fontFile
      ? { fontFiles: [fontFile], loadSystemFonts: false, defaultFontFamily: 'sans-serif' }
      : { loadSystemFonts: true, defaultFontFamily: 'sans-serif' },
  })

  const png = Buffer.from(resvg.render().asPng())

  return {
    svg,
    png,
    sha256: createHash('sha256').update(png).digest('hex'),
    table: buildAccessibleTable(data.spec, data.rows),
  }
}

/**
 * Tabla accesible que SIEMPRE acompana a la imagen.
 *
 * No es un extra de accesibilidad opcional: es la unica forma de que el dato
 * siga estando disponible para lectores de pantalla, para quien no puede
 * cargar la imagen, y para copiar y pegar en un informe.
 */
export function buildAccessibleTable(spec: ChartSpec, rows: AnalyticsCell[]): AccessibleTable {
  const suprimidos = rows.filter((r) => r.suppressed).length

  const notas: string[] = []
  if (suprimidos > 0) {
    notas.push(
      `${suprimidos} grupo(s) figuran como "n/d" porque quedaron por debajo del umbral de anonimato. "n/d" NO significa cero.`,
    )
  }
  if (spec.kind === 'choropleth') {
    notas.push('El mapa muestra unidades territoriales, nunca ubicaciones de personas.')
  }

  return {
    caption: spec.title,
    columns: ['Grupo', 'Cantidad'],
    rows: rows.map((r) => [r.label, r.suppressed ? 'n/d' : String(r.value)]),
    footnote: notas.join(' '),
  }
}

/**
 * Markdown protegido para el chat. La imagen se referencia por una ruta
 * AUTENTICADA de la propia API: no hay URL publica, no hay CDN y no hay
 * `data:` con el PNG incrustado (que se reenviaria fuera del control de ACL).
 *
 * La tabla accesible va incluida en el mismo mensaje, no como alternativa
 * escondida.
 */
export function toProtectedMarkdown(
  visualizationId: string,
  table: AccessibleTable,
): string {
  const alt = table.caption.replace(/[[\]()]/g, '')
  const encabezado = `| ${table.columns.join(' | ')} |`
  const separador = `| ${table.columns.map(() => '---').join(' | ')} |`
  const filas = table.rows.map((fila) => `| ${fila.map(escaparCelda).join(' | ')} |`)

  const partes = [
    `![${alt}](/v1/visualizations/${visualizationId}/image.png)`,
    '',
    encabezado,
    separador,
    ...filas,
  ]

  if (table.footnote) partes.push('', `> ${table.footnote}`)

  return partes.join('\n')
}

/**
 * Escapa el contenido de una celda de la tabla Markdown.
 *
 * El pipe termina la celda y permite inyectar columnas; el backtick abre un
 * bloque de codigo que se come el resto de la fila; un salto de linea rompe la
 * tabla entera. Los tres vienen de datos, asi que ninguno puede pasar crudo.
 */
function escaparCelda(valor: string): string {
  return valor
    .replace(/[|]/g, '\\|')
    .replace(/[`]/g, '\\`')
    .replace(/[\r\n]+/g, ' ')
}
