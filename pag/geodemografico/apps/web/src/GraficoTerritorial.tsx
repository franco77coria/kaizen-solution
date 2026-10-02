import { memo, useMemo } from 'react'
import type { ResumenTerritorial } from './api'
import { compararTerritorios } from './comparacionTerritorial'

const nf = new Intl.NumberFormat('es-CO')
const nombre = (s: string) => s.toLocaleLowerCase('es').replace(/(^|\s)\S/g, c => c.toLocaleUpperCase('es'))

export const GraficoTerritorial = memo(function GraficoTerritorial({ registros, referidos, medida, unidad, seleccionado, onSeleccionar, error, onReintentar }: {
  registros: ResumenTerritorial | null; referidos: ResumenTerritorial | null; medida: 'records' | 'referrals'; unidad: string
  seleccionado: string; onSeleccionar: (id: string) => void
  error: string; onReintentar: () => void
}): JSX.Element {
  const grafico = useMemo(() => compararTerritorios(registros?.rows ?? [], referidos?.rows ?? [], medida), [registros, referidos, medida])
  return <section className="territorio-grafico" aria-labelledby="grafico-territorial-titulo" aria-busy={!error && (!registros || !referidos)}>
    <div className="territorio-grafico-cabecera"><h2 id="grafico-territorial-titulo">Tu red, en perspectiva</h2><p>Compara las cifras visibles por {unidad}.</p></div>
    <div className="territorio-grafico-leyenda"><span><i />Registradas</span><span><i />Referidas</span></div>
    {error ? <div className="territorio-grafico-vacio"><p role="status">La comparación no está disponible. Reintenta la consulta de cifras.</p><button className="boton" onClick={onReintentar}>Reintentar comparación</button></div> : !registros || !referidos ? <p className="territorio-grafico-vacio" role="status">Consultando comparación…</p> : !grafico.filas.length ? <p className="territorio-grafico-vacio">No hay registros para comparar con estos filtros.</p> : <>
      <div className="territorio-grafico-escala" aria-hidden="true"><span>0</span><span>{nf.format(grafico.maximo)}</span></div>
      <div className="territorio-grafico-filas">{grafico.filas.map(r => <button key={r.key} className="territorio-grafico-fila" aria-pressed={r.key === seleccionado} onClick={() => onSeleccionar(r.key)}
        aria-label={`Consultar ${nombre(r.label)}: ${r.registros === null ? 'registradas protegidas o no disponibles' : `${nf.format(r.registros)} registradas`}; ${r.referidos === null ? 'referidas protegidas o no disponibles' : `${nf.format(r.referidos)} referidas`}`}>
        <span className="territorio-grafico-nombre">{nombre(r.label)}</span>
        <span className="territorio-grafico-par">{(['registros', 'referidos'] as const).map(campo => <span className={`territorio-grafico-serie serie-${campo}`} key={campo}>
          <span className="territorio-grafico-carril" aria-hidden="true">{r[campo] !== null && <i style={{ transform: `scaleX(${r[campo]! / grafico.maximo})` }} />}</span>
          <strong>{r[campo] === null ? 'Protegido' : nf.format(r[campo]!)}</strong>
        </span>)}</span>
      </button>)}</div>
      <p className="territorio-grafico-nota">Hasta seis territorios, ordenados por {medida === 'records' ? 'registradas' : 'referidas'}. Selecciona una fila para consultar su ficha. La tabla incluye todos.</p>
    </>}
  </section>
})
