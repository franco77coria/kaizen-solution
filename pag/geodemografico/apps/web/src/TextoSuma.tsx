import type { ReactNode } from 'react'

/**
 * Formato liviano para las respuestas de SUMA: parrafos, listas y **negrita**.
 *
 * NO interpreta HTML ni markdown completo: arma elementos de React a partir
 * del texto, asi que un acta que contenga "<script>" se muestra como texto.
 * Es la misma regla que el resto de la app (nada de dangerouslySetInnerHTML).
 */
const VINETA = /^\s*(?:[-*•]|\d+[.)])\s+/

function enLinea(texto: string, clave: string): ReactNode[] {
  // **negrita**: se parte por los delimitadores y se alternan los tramos.
  return texto.split(/(\*\*[^*]+\*\*)/g).map((tramo, i) =>
    tramo.startsWith('**') && tramo.endsWith('**') && tramo.length > 4 ? (
      <strong key={`${clave}-${i}`}>{tramo.slice(2, -2)}</strong>
    ) : (
      tramo
    ),
  )
}

export function TextoSuma({ texto }: { texto: string }): JSX.Element {
  const bloques = texto
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .filter((b) => b.trim())

  return (
    <div className="suma-texto">
      {bloques.map((bloque, i) => {
        const lineas = bloque.split('\n').filter((l) => l.trim())
        if (lineas.length > 0 && lineas.every((l) => VINETA.test(l))) {
          return (
            <ul key={i}>
              {lineas.map((l, j) => (
                <li key={j}>{enLinea(l.replace(VINETA, ''), `${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{enLinea(lineas.join(' '), String(i))}</p>
      })}
    </div>
  )
}
