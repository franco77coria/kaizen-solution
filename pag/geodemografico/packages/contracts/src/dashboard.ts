import { z } from 'zod'
import type { AnswerSource, RespuestaDatos } from './answer.js'

/**
 * Dashboards publicados desde SUMA (/app/suma/<id>).
 *
 * Es un DOCUMENTO estructurado, no HTML: la app lo dibuja con su propio
 * diseno. Asi el modelo no puede inyectar nada en la pagina, y ningun numero
 * lo escribe el modelo: los datos son resultados analiticos ya suprimidos.
 */
export const DASHBOARD_DIAS_VIGENCIA = 5

export const VISIBILIDADES = ['privado', 'espacio'] as const
export type Visibilidad = (typeof VISIBILIDADES)[number]

export interface DashboardDocumento {
  version: 1
  /** La pregunta que lo origino. */
  pregunta: string
  /**
   * Resumen ejecutivo con sus fuentes. `generado` = lo redacto el modelo y
   * paso la validacion de citas; si no, es la respuesta original de SUMA.
   */
  resumen: { texto: string; fuentes: AnswerSource[]; generado: boolean } | null
  /** Resultados analiticos (fotos), el primero es el de la respuesta si lo hubo. */
  datos: RespuestaDatos[]
}

export interface DashboardEnLista {
  id: string
  titulo: string
  visibilidad: Visibilidad
  esMio: boolean
  autor: string
  creadoEn: string
  venceEn: string
}

export interface DashboardCompleto extends DashboardEnLista {
  documento: DashboardDocumento
  /** Alguien retiro su consentimiento despues de crearlo: los datos quedaron viejos. */
  desactualizado: boolean
}

export const crearDashboardSchema = z.object({ messageId: z.string().uuid() }).strict()
export const cambiarVisibilidadSchema = z.object({ visibilidad: z.enum(VISIBILIDADES) }).strict()
