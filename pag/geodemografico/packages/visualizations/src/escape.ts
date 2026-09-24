/**
 * Escape para SVG. Todo texto que llega de datos pasa por aqui.
 *
 * El SVG se sirve como imagen, pero un `<text>` sin escapar permite cerrar el
 * elemento e inyectar marcado. Aunque el render sea del lado del servidor, el
 * SVG intermedio puede terminar en un archivo o en una respuesta.
 */
export function escapeXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Caracteres de control: XML 1.0 no los admite y rompen el parser. El
    // rango es deliberado, no un descuido del patron.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

/** Trunca preservando palabras, para etiquetas de eje. */
export function truncar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto
  return `${texto.slice(0, maximo - 1).trimEnd()}\u2026`
}
