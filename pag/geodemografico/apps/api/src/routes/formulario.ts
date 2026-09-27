import type { FastifyInstance } from 'fastify'
import { notFound } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { CUNDINAMARCA_MUNICIPALITIES } from '@kaizen/geography'
import { resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'

/** Formas de dar el consentimiento. Una sola lista para el formulario y la cola. */
const EVIDENCIAS = [
  { valor: 'firma_digital', etiqueta: 'Firma digital' },
  { valor: 'formulario_papel', etiqueta: 'Formulario en papel' },
  { valor: 'registro_verbal', etiqueta: 'Registro verbal' },
] as const

/**
 * Lo que el formulario de captura necesita ANTES de poder mostrarse.
 *
 * Hay una razon de fondo para que esto sea un endpoint y no constantes en el
 * cliente: el texto de consentimiento es versionado y el registro guarda cual
 * se mostro. Si el cliente trajera su propia copia, podria mostrar un texto y
 * guardar la version de otro, y nadie lo notaria hasta una auditoria.
 *
 * Si no hay aviso vigente, el formulario NO se habilita. Capturar datos de
 * personas sin un texto publicado no es una limitacion tecnica que convenga
 * sortear: es el requisito.
 */
export async function formularioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/capture/form', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['records.capture'])

    const consentimiento = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        const { rows } = await client.query<{
          version: string
          body: string
          controller_name: string
        }>(
          `select version, body, controller_name
             from consent_texts
            where purpose_id = $1 and status = 'active'
            order by effective_from desc
            limit 1`,
          [session.purposeId],
        )
        return rows[0] ?? null
      },
    )

    if (!consentimiento) {
      throw notFound('no hay un aviso de privacidad vigente para esta finalidad')
    }

    return {
      consentimiento: {
        version: consentimiento.version,
        texto: consentimiento.body,
        responsable: consentimiento.controller_name,
      },
      municipios: CUNDINAMARCA_MUNICIPALITIES.map((m) => ({ code: m.code, name: m.name })),
      evidencias: EVIDENCIAS,
    }
  })

  /** Cola de revisión: lo enviado y pendiente de decisión. */
  app.get('/v1/capture/pending', async (request) => {
    const session = await resolveScope(request, leerAmbito(request), ['records.review'])

    return withAuthorizedTransaction('app', txContext(session), async (client) => {
      const { rows } = await client.query<{
        id: string
        full_name: string
        document_number: string
        municipality_code: string
        birth_year: number | null
        captured_by: string
        version: number
        created_at: Date
        evidencia: string | null
        consentimiento_vigente: boolean
      }>(
        `select r.id, r.full_name, r.document_number, r.municipality_code, r.birth_year,
                r.captured_by, r.version, r.created_at,
                c.evidence_kind as evidencia,
                (c.withdrawn_at is null) as consentimiento_vigente
           from person_records r
           left join consent_records c
                  on c.tenant_id = r.tenant_id and c.record_id = r.id
          where r.purpose_id = $1 and r.status = 'submitted'
          order by r.created_at asc
          limit 50`,
        [session.purposeId],
      )

      return {
        pendientes: rows.map((r) => ({
          id: r.id,
          nombre: r.full_name,
          documento: r.document_number,
          municipio: r.municipality_code,
          anioNacimiento: r.birth_year,
          version: r.version,
          creado: r.created_at,
          // Se manda la etiqueta, no el codigo interno: la lista vive aca y
          // copiarla al cliente seria una segunda lista que termina divergiendo.
          evidencia: r.evidencia
            ? (EVIDENCIAS.find((e) => e.valor === r.evidencia)?.etiqueta ?? r.evidencia)
            : null,
          consentimientoVigente: r.consentimiento_vigente,
          // El revisor no puede ser el capturador: el trigger lo impide, pero
          // la interfaz lo dice antes para no ofrecer una acción que va a fallar.
          puedeRevisar: r.captured_by !== session.userId,
        })),
      }
    })
  })
}
