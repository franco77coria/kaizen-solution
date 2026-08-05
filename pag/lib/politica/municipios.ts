/**
 * Registro de municipios del tablero de políticas públicas.
 *
 * Sumar un municipio nuevo es agregar una entrada acá y correr el importador.
 * No hay componentes ni rutas por municipio: el color lo inyecta el layout como
 * custom properties de CSS, y todo lo demás sale de la base.
 */

export interface MunicipioTema {
    /** Acento institucional. Sobre él se construyen fondos, bordes y barras. */
    primary: string
    primaryDark: string
    primaryLight: string
    /** Acento sobre fondo claro para TEXTO. El primary suele no dar contraste AA. */
    primaryInk: string
}

export interface Municipio {
    slug: string
    nombre: string
    departamento: string
    /** Lema de la administración. Va en el login y en el encabezado. */
    lema: string
    /** Nombre del instrumento de planeación, tal como se lo cita oficialmente. */
    plan: string
    periodoInicio: number
    periodoFin: number
    /** Ruta pública del escudo. Si el archivo no existe se cae al monograma. */
    escudo?: string
    tema: MunicipioTema
}

export const MUNICIPIOS: Record<string, Municipio> = {
    anapoima: {
        slug: 'anapoima',
        nombre: 'Anapoima',
        departamento: 'Cundinamarca',
        lema: 'Renovación en Marcha',
        plan: 'Plan de Desarrollo 2024-2027',
        periodoInicio: 2024,
        periodoFin: 2027,
        tema: {
            primary: '#D4520C',
            primaryDark: '#B8440A',
            primaryLight: '#FF7A2F',
            // #D4520C da 4.9:1 sobre blanco — justo por debajo de AA para texto
            // normal. Este tono más profundo llega a 6.4:1 sin cambiar el color.
            primaryInk: '#A63D06',
        },
    },
}

export function getMunicipio(slug: string): Municipio | null {
    return MUNICIPIOS[slug?.toLowerCase()] ?? null
}

export function listarMunicipios(): Municipio[] {
    return Object.values(MUNICIPIOS)
}

/**
 * Variables CSS del municipio, para pasar como `style` al contenedor raíz.
 * Los componentes usan var(--pol-primary) y no saben de qué municipio se trata.
 */
export function temaCssVars(m: Municipio): React.CSSProperties {
    return {
        '--pol-primary': m.tema.primary,
        '--pol-primary-dark': m.tema.primaryDark,
        '--pol-primary-light': m.tema.primaryLight,
        '--pol-primary-ink': m.tema.primaryInk,
    } as React.CSSProperties
}

/** Iniciales para el monograma cuando no hay escudo cargado. */
export function monograma(m: Municipio): string {
    return m.nombre.slice(0, 2).toUpperCase()
}
