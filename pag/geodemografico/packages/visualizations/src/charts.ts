import type { AnalyticsCell, ChartSpec } from '@kaizen/contracts'
import { escapeXml, truncar } from './escape.js'
import { escalon, getPalette } from './palette.js'

/**
 * Generacion DETERMINISTA de SVG. Las mismas celdas y el mismo spec producen
 * byte por byte el mismo SVG: no hay aleatoriedad, ni fecha de generacion
 * incrustada, ni orden dependiente de un Map sin ordenar.
 *
 * Un grupo suprimido se dibuja con el color `missing` y la etiqueta "n/d",
 * NUNCA como una barra de altura cero: una barra en cero se lee como "no hay
 * nadie aca", que es exactamente lo contrario de lo que significa.
 */
const ANCHO = 900
const ALTO = 520
const MARGEN = { top: 64, right: 32, bottom: 96, left: 72 }

export interface ChartData {
  spec: ChartSpec
  rows: AnalyticsCell[]
  /** Geometrias por codigo, solo para choropleth. */
  geometrias?: Map<string, { geometry: unknown; centroid: { lon: number; lat: number } | null }>
}

export function renderChartSvg(data: ChartData): string {
  switch (data.spec.kind) {
    case 'bar':
      return barras(data)
    case 'line':
      return lineas(data)
    case 'table':
      return tabla(data)
    case 'choropleth':
      return coropletico(data)
  }
}

function encabezado(spec: ChartSpec, paleta = getPalette(spec.palette)): string {
  const titulo = `<text x="${MARGEN.left}" y="32" font-family="sans-serif" font-size="20" font-weight="600" fill="${paleta.text}">${escapeXml(spec.title)}</text>`
  const sub = spec.subtitle
    ? `<text x="${MARGEN.left}" y="52" font-family="sans-serif" font-size="13" fill="${paleta.axis}">${escapeXml(spec.subtitle)}</text>`
    : ''
  return titulo + sub
}

function marco(spec: ChartSpec, cuerpo: string, alto = ALTO): string {
  const paleta = getPalette(spec.palette)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${alto}" viewBox="0 0 ${ANCHO} ${alto}" role="img">`,
    `<title>${escapeXml(spec.title)}</title>`,
    `<rect width="${ANCHO}" height="${alto}" fill="${paleta.background}"/>`,
    encabezado(spec, paleta),
    cuerpo,
    '</svg>',
  ].join('')
}

function maximoDe(rows: AnalyticsCell[]): number {
  return rows.reduce((max, r) => (r.value !== null && r.value > max ? r.value : max), 0)
}

/**
 * Fraccion del area de dibujo que puede ocupar la barra o el punto mas alto.
 * El resto es aire para la etiqueta del valor: sin esta reserva, el numero del
 * maximo se dibuja por encima del area y se superpone al subtitulo.
 */
const RESERVA_ETIQUETA = 0.92

function leyendaSupresion(rows: AnalyticsCell[], y: number, color: string): string {
  const suprimidos = rows.filter((r) => r.suppressed).length
  if (suprimidos === 0) return ''
  return `<text x="${MARGEN.left}" y="${y}" font-family="sans-serif" font-size="12" fill="${color}">n/d: ${suprimidos} grupo(s) por debajo del umbral de anonimato; no son cero.</text>`
}

function barras(data: ChartData): string {
  const paleta = getPalette(data.spec.palette)
  const rows = data.rows
  const maximo = maximoDe(rows)
  const areaAncho = ANCHO - MARGEN.left - MARGEN.right
  const areaAlto = ALTO - MARGEN.top - MARGEN.bottom
  const paso = rows.length > 0 ? areaAncho / rows.length : areaAncho
  const anchoBarra = Math.max(4, Math.min(64, paso * 0.68))

  const partes: string[] = []

  for (let i = 0; i < 5; i++) {
    const y = MARGEN.top + (areaAlto * i) / 4
    partes.push(
      `<line x1="${MARGEN.left}" y1="${y.toFixed(1)}" x2="${MARGEN.left + areaAncho}" y2="${y.toFixed(1)}" stroke="${paleta.grid}" stroke-width="1"/>`,
    )
  }

  rows.forEach((row, i) => {
    const centro = MARGEN.left + paso * i + paso / 2
    const x = centro - anchoBarra / 2

    if (row.suppressed || row.value === null) {
      // Marca visible de "sin dato", con altura fija y patron distinto.
      const alto = 12
      const y = MARGEN.top + areaAlto - alto
      partes.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${anchoBarra.toFixed(1)}" height="${alto}" fill="${paleta.missing}" stroke="${paleta.axis}" stroke-width="1" stroke-dasharray="3 2"/>`,
      )
      partes.push(
        `<text x="${centro.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-family="sans-serif" font-size="12" fill="${paleta.axis}" text-anchor="middle">n/d</text>`,
      )
    } else {
      const altoBarra = maximo > 0 ? (row.value / maximo) * areaAlto * RESERVA_ETIQUETA : 0
      const y = MARGEN.top + areaAlto - altoBarra
      const nivel = escalon(row.value, maximo, paleta.scale.length)
      partes.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${anchoBarra.toFixed(1)}" height="${altoBarra.toFixed(1)}" fill="${paleta.scale[Math.max(2, nivel)]}"/>`,
      )
      if (data.spec.showValues) {
        partes.push(
          `<text x="${centro.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-family="sans-serif" font-size="12" fill="${paleta.text}" text-anchor="middle">${row.value}</text>`,
        )
      }
    }

    partes.push(
      `<text x="${centro.toFixed(1)}" y="${(MARGEN.top + areaAlto + 18).toFixed(1)}" font-family="sans-serif" font-size="11" fill="${paleta.axis}" text-anchor="end" transform="rotate(-40 ${centro.toFixed(1)} ${(MARGEN.top + areaAlto + 18).toFixed(1)})">${escapeXml(truncar(row.label, 22))}</text>`,
    )
  })

  partes.push(
    `<line x1="${MARGEN.left}" y1="${MARGEN.top + areaAlto}" x2="${MARGEN.left + areaAncho}" y2="${MARGEN.top + areaAlto}" stroke="${paleta.axis}" stroke-width="1.5"/>`,
  )
  partes.push(leyendaSupresion(rows, ALTO - 12, paleta.axis))

  return marco(data.spec, partes.join(''))
}

function lineas(data: ChartData): string {
  const paleta = getPalette(data.spec.palette)
  const rows = data.rows
  const maximo = maximoDe(rows)
  const areaAncho = ANCHO - MARGEN.left - MARGEN.right
  const areaAlto = ALTO - MARGEN.top - MARGEN.bottom
  const paso = rows.length > 1 ? areaAncho / (rows.length - 1) : 0

  const partes: string[] = []
  for (let i = 0; i < 5; i++) {
    const y = MARGEN.top + (areaAlto * i) / 4
    partes.push(
      `<line x1="${MARGEN.left}" y1="${y.toFixed(1)}" x2="${MARGEN.left + areaAncho}" y2="${y.toFixed(1)}" stroke="${paleta.grid}" stroke-width="1"/>`,
    )
  }

  // Los tramos con dato ausente NO se interpolan: la linea se corta. Unir los
  // extremos dibujaria una tendencia que nadie midio.
  const segmentos: string[][] = []
  let actual: string[] = []

  rows.forEach((row, i) => {
    const x = MARGEN.left + paso * i
    if (row.value === null || row.suppressed) {
      if (actual.length > 1) segmentos.push(actual)
      actual = []
      partes.push(
        `<circle cx="${x.toFixed(1)}" cy="${(MARGEN.top + areaAlto).toFixed(1)}" r="3" fill="none" stroke="${paleta.axis}" stroke-dasharray="2 2"/>`,
      )
    } else {
      const y =
        MARGEN.top + areaAlto - (maximo > 0 ? (row.value / maximo) * areaAlto * RESERVA_ETIQUETA : 0)
      actual.push(`${x.toFixed(1)},${y.toFixed(1)}`)
      partes.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${paleta.scale[4]}"/>`,
      )
      if (data.spec.showValues) {
        partes.push(
          `<text x="${x.toFixed(1)}" y="${(y - 8).toFixed(1)}" font-family="sans-serif" font-size="11" fill="${paleta.text}" text-anchor="middle">${row.value}</text>`,
        )
      }
    }

    partes.push(
      `<text x="${x.toFixed(1)}" y="${(MARGEN.top + areaAlto + 18).toFixed(1)}" font-family="sans-serif" font-size="11" fill="${paleta.axis}" text-anchor="middle">${escapeXml(truncar(row.label, 14))}</text>`,
    )
  })
  if (actual.length > 1) segmentos.push(actual)

  for (const seg of segmentos) {
    partes.push(
      `<polyline points="${seg.join(' ')}" fill="none" stroke="${paleta.scale[4]}" stroke-width="2.5" stroke-linejoin="round"/>`,
    )
  }

  partes.push(
    `<line x1="${MARGEN.left}" y1="${MARGEN.top + areaAlto}" x2="${MARGEN.left + areaAncho}" y2="${MARGEN.top + areaAlto}" stroke="${paleta.axis}" stroke-width="1.5"/>`,
  )
  partes.push(leyendaSupresion(rows, ALTO - 12, paleta.axis))

  return marco(data.spec, partes.join(''))
}

function tabla(data: ChartData): string {
  const paleta = getPalette(data.spec.palette)
  const rows = data.rows
  const filaAlto = 26
  const alto = MARGEN.top + 40 + rows.length * filaAlto + 40
  const partes: string[] = []

  partes.push(
    `<text x="${MARGEN.left}" y="${MARGEN.top + 16}" font-family="sans-serif" font-size="12" font-weight="600" fill="${paleta.axis}">Grupo</text>`,
    `<text x="${ANCHO - MARGEN.right}" y="${MARGEN.top + 16}" font-family="sans-serif" font-size="12" font-weight="600" fill="${paleta.axis}" text-anchor="end">Cantidad</text>`,
  )

  rows.forEach((row, i) => {
    const y = MARGEN.top + 40 + i * filaAlto
    if (i % 2 === 1) {
      partes.push(
        `<rect x="${MARGEN.left - 8}" y="${y - 16}" width="${ANCHO - MARGEN.left - MARGEN.right + 16}" height="${filaAlto}" fill="${paleta.scale[0]}"/>`,
      )
    }
    partes.push(
      `<text x="${MARGEN.left}" y="${y}" font-family="sans-serif" font-size="13" fill="${paleta.text}">${escapeXml(truncar(row.label, 60))}</text>`,
      `<text x="${ANCHO - MARGEN.right}" y="${y}" font-family="sans-serif" font-size="13" fill="${row.suppressed ? paleta.axis : paleta.text}" text-anchor="end">${row.suppressed ? 'n/d' : String(row.value)}</text>`,
    )
  })

  partes.push(leyendaSupresion(rows, alto - 14, paleta.axis))
  return marco(data.spec, partes.join(''), alto)
}

/**
 * Mapa coropletico. Las geometrias vienen del catalogo oficial cargado en la
 * base; este modulo SOLO las proyecta y las colorea. No dibuja fronteras
 * aproximadas, no inventa poligonos y no coloca personas en coordenadas.
 *
 * Si falta la geometria de un area, el area no se dibuja y su ausencia se
 * declara en la leyenda: un mapa con huecos honesto es mejor que un mapa
 * completo con formas inventadas.
 */
function coropletico(data: ChartData): string {
  const paleta = getPalette(data.spec.palette)
  const rows = data.rows
  const geometrias = data.geometrias ?? new Map()

  if (geometrias.size === 0) {
    return marco(
      data.spec,
      `<text x="${MARGEN.left}" y="${ALTO / 2}" font-family="sans-serif" font-size="15" fill="${paleta.axis}">No hay cartografia cargada y verificada. El mapa no se dibuja; los valores estan en la tabla adjunta.</text>`,
    )
  }

  const anillos: Array<{ code: string; puntos: Array<[number, number]>[] }> = []
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  // Orden por codigo: el recorrido de un Map depende del orden de insercion,
  // y eso haria que el SVG cambiara entre ejecuciones.
  for (const code of [...geometrias.keys()].sort()) {
    const entrada = geometrias.get(code)
    if (!entrada) continue
    const puntos = extraerAnillos(entrada.geometry)
    if (puntos.length === 0) continue
    anillos.push({ code, puntos })
    for (const anillo of puntos) {
      for (const [lon, lat] of anillo) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  const areaAncho = ANCHO - MARGEN.left - MARGEN.right
  const areaAlto = ALTO - MARGEN.top - MARGEN.bottom
  const spanLon = maxLon - minLon || 1
  const spanLat = maxLat - minLat || 1
  // Correccion de la deformacion por latitud. Sin esto, Cundinamarca sale
  // estirada horizontalmente.
  const latMedia = ((minLat + maxLat) / 2) * (Math.PI / 180)
  const anchoCorregido = spanLon * Math.cos(latMedia)
  const escala = Math.min(areaAncho / anchoCorregido, areaAlto / spanLat)
  const offsetX = MARGEN.left + (areaAncho - anchoCorregido * escala) / 2
  const offsetY = MARGEN.top + (areaAlto - spanLat * escala) / 2

  const proyectar = (lon: number, lat: number): [number, number] => [
    offsetX + (lon - minLon) * Math.cos(latMedia) * escala,
    offsetY + (maxLat - lat) * escala,
  ]

  const valorPorCodigo = new Map(rows.map((r) => [r.key, r]))
  const maximo = maximoDe(rows)
  const partes: string[] = []
  const etiquetas: Array<{ x: number; y: number; texto: string; nivel: number }> = []

  for (const { code, puntos } of anillos) {
    const celda = valorPorCodigo.get(code)
    const nivel = celda ? escalon(celda.value, maximo, paleta.scale.length) : -1
    const relleno = nivel >= 0 ? paleta.scale[nivel]! : paleta.missing

    const d = puntos
      .map(
        (anillo) =>
          `M${anillo
            .map(([lon, lat]) => {
              const [x, y] = proyectar(lon, lat)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            })
            .join('L')}Z`,
      )
      .join('')

    partes.push(
      `<path d="${d}" fill="${relleno}" stroke="${paleta.background}" stroke-width="0.6"/>`,
    )

    if (data.spec.showValues && celda) {
      const centroide = centroideDe(puntos)
      const [x, y] = proyectar(centroide[0], centroide[1])
      etiquetas.push({
        x,
        y,
        texto: celda.suppressed ? 'n/d' : String(celda.value),
        nivel,
      })
    }
  }

  // Control de colisiones: si dos etiquetas quedan a menos de 18 px, se omite
  // la segunda. Superponer numeros produce cifras ilegibles que se leen mal.
  const colocadas: Array<{ x: number; y: number }> = []
  let omitidas = 0
  for (const etiqueta of etiquetas) {
    const choca = colocadas.some(
      (c) => Math.abs(c.x - etiqueta.x) < 26 && Math.abs(c.y - etiqueta.y) < 14,
    )
    if (choca) {
      omitidas++
      continue
    }
    colocadas.push({ x: etiqueta.x, y: etiqueta.y })
    const color = etiqueta.nivel >= 0 ? paleta.ink[etiqueta.nivel]! : paleta.axis
    partes.push(
      `<text x="${etiqueta.x.toFixed(1)}" y="${etiqueta.y.toFixed(1)}" font-family="sans-serif" font-size="10" font-weight="600" fill="${color}" text-anchor="middle">${escapeXml(etiqueta.texto)}</text>`,
    )
  }

  // Leyenda de la escala.
  const leyendaY = ALTO - 52
  paleta.scale.forEach((color, i) => {
    partes.push(
      `<rect x="${MARGEN.left + i * 40}" y="${leyendaY}" width="40" height="12" fill="${color}"/>`,
    )
  })
  partes.push(
    `<text x="${MARGEN.left}" y="${leyendaY + 26}" font-family="sans-serif" font-size="11" fill="${paleta.axis}">0</text>`,
    `<text x="${MARGEN.left + paleta.scale.length * 40}" y="${leyendaY + 26}" font-family="sans-serif" font-size="11" fill="${paleta.axis}" text-anchor="end">${maximo}</text>`,
  )

  const notas: string[] = []
  const sinGeometria = rows.filter((r) => !geometrias.has(r.key)).length
  if (sinGeometria > 0) notas.push(`${sinGeometria} area(s) sin geometria cargada`)
  if (omitidas > 0) notas.push(`${omitidas} etiqueta(s) omitida(s) por superposicion`)
  const suprimidos = rows.filter((r) => r.suppressed).length
  if (suprimidos > 0) notas.push(`${suprimidos} grupo(s) suprimido(s), no son cero`)

  if (notas.length > 0) {
    partes.push(
      `<text x="${MARGEN.left}" y="${ALTO - 12}" font-family="sans-serif" font-size="11" fill="${paleta.axis}">${escapeXml(notas.join(' \u00b7 '))}. Los valores completos estan en la tabla adjunta.</text>`,
    )
  }

  return marco(data.spec, partes.join(''))
}

/** Extrae anillos exteriores de un Polygon o MultiPolygon GeoJSON. */
function extraerAnillos(geometry: unknown): Array<Array<[number, number]>> {
  const geo = geometry as { type?: string; coordinates?: unknown }
  if (!geo || typeof geo.type !== 'string') return []

  if (geo.type === 'Polygon') {
    const coords = geo.coordinates as Array<Array<[number, number]>>
    return coords.slice(0, 1)
  }

  if (geo.type === 'MultiPolygon') {
    const coords = geo.coordinates as Array<Array<Array<[number, number]>>>
    return coords.map((poligono) => poligono[0] ?? []).filter((a) => a.length > 0)
  }

  return []
}

function centroideDe(anillos: Array<Array<[number, number]>>): [number, number] {
  let sumaLon = 0
  let sumaLat = 0
  let total = 0
  for (const anillo of anillos) {
    for (const [lon, lat] of anillo) {
      sumaLon += lon
      sumaLat += lat
      total++
    }
  }
  return total > 0 ? [sumaLon / total, sumaLat / total] : [0, 0]
}
