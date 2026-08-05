import { PolActividad, PolAvance, PolTipoMeta, PolIndicador, PolIndicadorMeta } from '@prisma/client'

export interface AvanceResumen {
    cumplimientoPct: number // 0 a 100
    metaTexto: string
    avanceTexto: string
    presupuestoPlaneado: number
    presupuestoEjecutado: number
    totalAvances: number
}

export interface IndicadorCumplimiento {
    indicadorId: string
    codigo: string
    nombre: string
    cumplimientoPorAnio: Record<number, number | null> // anio -> %
    cumplimientoPromedio: number | null
}

/**
 * Calcula el % de avance de una actividad individual dada su meta y sus avances registrados.
 */
export function calcularCumplimientoActividad(
    actividad: Pick<PolActividad, 'tipoMeta' | 'metaNumero' | 'metaBooleana' | 'presupuestoPlaneado'>,
    avances: Pick<PolAvance, 'valorNumero' | 'valorBooleano' | 'valorRaw' | 'presupuestoEjecutado'>[]
): AvanceResumen {
    let presupuestoEjecutado = 0
    let totalAvances = avances.length

    for (const a of avances) {
        if (a.presupuestoEjecutado) {
            presupuestoEjecutado += Number(a.presupuestoEjecutado)
        }
    }

    const presupuestoPlaneado = actividad.presupuestoPlaneado ? Number(actividad.presupuestoPlaneado) : 0

    if (actividad.tipoMeta === PolTipoMeta.BOOLEANO) {
        const algunRealizado = avances.some(
            (a) =>
                a.valorBooleano === true ||
                a.valorRaw?.toLowerCase() === 'realizado' ||
                a.valorRaw === '1' ||
                a.valorRaw?.toLowerCase() === 'sí' ||
                a.valorRaw?.toLowerCase() === 'si'
        )
        const pct = algunRealizado ? 100 : 0
        return {
            cumplimientoPct: pct,
            metaTexto: actividad.metaBooleana ? 'Realizar' : 'Pendiente',
            avanceTexto: algunRealizado ? 'Realizado' : 'Pendiente',
            presupuestoPlaneado,
            presupuestoEjecutado,
            totalAvances,
        }
    }

    if (actividad.tipoMeta === PolTipoMeta.NUMERO && actividad.metaNumero != null) {
        const meta = Number(actividad.metaNumero)
        let sumaAvances = 0

        for (const a of avances) {
            if (a.valorNumero != null) {
                sumaAvances += Number(a.valorNumero)
            } else if (a.valorRaw) {
                const parsed = parseFloat(a.valorRaw.replace(',', '.'))
                if (!isNaN(parsed)) {
                    sumaAvances += parsed
                }
            }
        }

        let pct = 0
        if (meta > 0) {
            pct = Math.min(100, Math.max(0, (sumaAvances / meta) * 100))
        }

        return {
            cumplimientoPct: Math.round(pct * 10) / 10,
            metaTexto: meta.toLocaleString('es-CO'),
            avanceTexto: sumaAvances.toLocaleString('es-CO'),
            presupuestoPlaneado,
            presupuestoEjecutado,
            totalAvances,
        }
    }

    // SIN_DEFINIR o Meta 0 / Sin datos
    return {
        cumplimientoPct: 0,
        metaTexto: 'N/A',
        avanceTexto: '0',
        presupuestoPlaneado,
        presupuestoEjecutado,
        totalAvances,
    }
}

/**
 * Calcula el cumplimiento de un indicador por año y su promedio.
 */
export function calcularCumplimientoIndicador(
    indicador: Pick<PolIndicador, 'id' | 'codigo' | 'nombre' | 'menorEsMejor'>,
    metas: Pick<PolIndicadorMeta, 'anio' | 'meta' | 'real'>[]
): IndicadorCumplimiento {
    const cumplimientoPorAnio: Record<number, number | null> = {}
    let sumaPcts = 0
    let conteo = 0

    for (const m of metas) {
        const metaVal = m.meta != null ? Number(m.meta) : null
        const realVal = m.real != null ? Number(m.real) : null

        if (metaVal != null && realVal != null && metaVal > 0) {
            let pct = 0
            if (indicador.menorEsMejor) {
                pct = Math.min(100, (metaVal / realVal) * 100)
            } else {
                pct = Math.min(100, (realVal / metaVal) * 100)
            }
            pct = Math.round(pct * 10) / 10
            cumplimientoPorAnio[m.anio] = pct
            sumaPcts += pct
            conteo++
        } else {
            cumplimientoPorAnio[m.anio] = null
        }
    }

    const cumplimientoPromedio = conteo > 0 ? Math.round((sumaPcts / conteo) * 10) / 10 : null

    return {
        indicadorId: indicador.id,
        codigo: indicador.codigo,
        nombre: indicador.nombre,
        cumplimientoPorAnio,
        cumplimientoPromedio,
    }
}

/**
 * Rollup: Promedio simple de una lista de porcentajes.
 * NOTA: Para cambiar a promedio ponderado en el futuro, modificar esta función.
 */
export function promedioSimple(porcentajes: number[]): number {
    if (!porcentajes.length) return 0
    const suma = porcentajes.reduce((acc, curr) => acc + curr, 0)
    return Math.round((suma / porcentajes.length) * 10) / 10
}
