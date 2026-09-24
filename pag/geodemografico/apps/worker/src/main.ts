import { hostname } from 'node:os'
import { closeAllPools, withAuthorizedTransaction } from '@kaizen/db'
import { logger } from '@kaizen/observability'
import {
  AccesoDenegadoError,
  FixtureSourceProvider,
  GoogleDriveProvider,
} from '@kaizen/connector-google-drive'
import type { SourceProvider } from '@kaizen/connector-google-drive'
import {
  cerrarTrabajo,
  ingerirArchivo,
  inventariar,
  tomarTrabajo,
  type IngestContext,
} from './ingest.js'
import { ConexionIngestor } from './tokens.js'

/**
 * Worker de ingesta. Corre como identidad de servicio propia (`kaizen_worker`),
 * que NO tiene acceso a conversaciones ni a registros de personas.
 *
 * El proveedor se elige por configuracion. Por defecto `fixture`, que no hace
 * red: en desarrollo no hay forma de tocar Drive por accidente.
 */
const HOLDER = `${hostname()}:${process.pid}`
const INTERVALO_MS = Number(process.env['WORKER_POLL_MS'] ?? 2_000)

/**
 * Un proveedor POR ESPACIO, elegido segun el proveedor que registro SU
 * conexion, no una variable global.
 *
 * Dos razones: un espacio con Drive real y otro con fixtures conviven sin
 * pisarse, y no se puede compartir una instancia entre espacios, porque cada
 * uno tiene su propio token y reusarla mezclaria autorizaciones entre
 * alcaldias.
 */
async function crearProveedor(espacio: Espacio): Promise<SourceProvider> {
  if (espacio.provider === 'fixture') {
    const ruta = process.env['FIXTURE_DRIVE_FILE'] ?? 'evals/fixtures/drive/gerencia.json'
    return FixtureSourceProvider.fromFile(ruta)
  }

  if (espacio.provider === 'google_drive') {
    // El token del ingestor sale del VAULT cifrado, nunca del entorno en claro,
    // y se renueva solo cuando hace falta.
    return new GoogleDriveProvider(
      new ConexionIngestor(espacio.tenantId, espacio.corpusId, espacio.connectionId),
    )
  }

  throw new Error(`proveedor desconocido en la conexion: ${espacio.provider}`)
}

interface Espacio {
  tenantId: string
  corpusId: string
  purposeId: string
  connectionId: string
  generation: number
  provider: string
}

async function listarEspacios(): Promise<Espacio[]> {
  // Se usa la identidad de migracion solo para descubrir espacios activos; el
  // trabajo real de cada uno corre con el contexto de ese espacio.
  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env['DATABASE_URL'] })
  await client.connect()
  try {
    const { rows } = await client.query<Espacio>(
      `select c.tenant_id as "tenantId",
              c.id as "corpusId",
              c.purpose_id as "purposeId",
              sc.id as "connectionId",
              sc.generation,
              sc.provider
         from corpora c
         join source_connections sc on sc.tenant_id = c.tenant_id and sc.corpus_id = c.id
        where c.status = 'active' and sc.status = 'active'`,
    )
    return rows
  } finally {
    await client.end().catch(() => {})
  }
}

async function procesarEspacio(espacio: Espacio, provider: SourceProvider): Promise<number> {
  let procesados = 0

  for (;;) {
    const trabajo = await tomarTrabajo(espacio.tenantId, espacio.corpusId, HOLDER)
    if (!trabajo) break

    const context: IngestContext = {
      tenantId: espacio.tenantId,
      corpusId: espacio.corpusId,
      purposeId: espacio.purposeId,
      connectionId: trabajo.connectionId,
      connectionGeneration: trabajo.generation,
      provider,
    }

    try {
      if (trabajo.kind === 'reconcile' || trabajo.fileId === '') {
        await reconciliar(context)
      } else {
        const resultado = await ingerirArchivo(context, trabajo.fileId)
        logger.info('worker.archivo', {
          resultado: resultado.resultado,
          motivo: resultado.motivo ?? null,
        })
      }
      await cerrarTrabajo(espacio.tenantId, espacio.corpusId, trabajo.id, 'succeeded')
      procesados++
    } catch (error) {
      logger.error('worker.trabajo_fallido', error, { jobId: trabajo.id })
      await cerrarTrabajo(
        espacio.tenantId,
        espacio.corpusId,
        trabajo.id,
        'failed',
        error instanceof Error ? error.name : 'desconocido',
      )
    }
  }

  return procesados
}

/**
 * Reconciliacion: INVENTARIA y despues recorre el manifiesto completo.
 *
 * El inventario va primero y no es opcional. Una conexion recien creada no
 * tiene ningun archivo admitido todavia: si la reconciliacion solo recorriera
 * lo ya admitido, conectar Drive terminaria "con exito" sin haber descubierto
 * ni leido nada, que es exactamente como se ve un sistema roto que no falla.
 *
 * Recorrer el manifiesto completo ademas de consumir eventos tampoco es
 * opcional: consumir solo eventos deja huecos cuando una notificacion se
 * pierde, y esos huecos no se notan hasta que alguien pregunta por una nota
 * que falta.
 */
async function reconciliar(context: IngestContext): Promise<void> {
  const coleccionId = await withAuthorizedTransaction(
    'worker',
    { tenantId: context.tenantId, corpusId: context.corpusId },
    async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `select id from source_collections where connection_id = $1 limit 1`,
        [context.connectionId],
      )
      return rows[0]?.id ?? null
    },
  )

  if (!coleccionId) {
    logger.warn('worker.sin_coleccion', { connectionId: context.connectionId })
    return
  }

  const resumen = await inventariar(context, coleccionId)
  logger.info('worker.inventario', {
    candidatos: resumen.candidatos,
    admitidos: resumen.admitidos,
    pendientes: resumen.pendientes,
    duplicados: resumen.duplicados,
  })

  const admitidos = await withAuthorizedTransaction(
    'worker',
    { tenantId: context.tenantId, corpusId: context.corpusId },
    async (client) => {
      const { rows } = await client.query<{ target_file_id: string }>(
        `select cm.target_file_id
           from collection_members cm
           join source_collections col
             on col.tenant_id = cm.tenant_id and col.id = cm.collection_id
          where col.connection_id = $1 and cm.status = 'admitted'`,
        [context.connectionId],
      )
      return rows.map((r) => r.target_file_id)
    },
  )

  logger.info('worker.reconciliando', { archivos: admitidos.length })

  let denegados = 0

  for (const fileId of admitidos) {
    try {
      await ingerirArchivo(context, fileId)
    } catch (error) {
      if (error instanceof AccesoDenegadoError) {
        denegados++
        // Se corta al primero: si falta el scope de contenido, va a fallar con
        // TODOS. Seguir intentando gasta cuota y llena el log de ruido que
        // oculta la causa real.
        break
      }
      logger.error('worker.reconciliacion_archivo', error, { fileId })
    }
  }

  if (denegados > 0) {
    // Marcar la conexion es lo que hace que la interfaz diga "necesitamos
    // reconectar Google" en vez de mostrar cero notas sin explicar por que.
    logger.warn('worker.falta_scope_de_contenido', {
      connectionId: context.connectionId,
      archivos: admitidos.length,
    })

    await withAuthorizedTransaction(
      'worker',
      { tenantId: context.tenantId, corpusId: context.corpusId },
      async (client) => {
        await client.query(
          `update source_connections set status = 'needs_reauth' where id = $1`,
          [context.connectionId],
        )
      },
    )
    return
  }

  await withAuthorizedTransaction(
    'worker',
    { tenantId: context.tenantId, corpusId: context.corpusId },
    async (client) => {
      await client.query(
        `update source_connections set last_sync_at = now() where id = $1`,
        [context.connectionId],
      )
    },
  )
}

async function bucle(): Promise<void> {
  logger.info('worker.iniciado', { holder: HOLDER })

  let corriendo = true
  const detener = async (senal: string) => {
    logger.info('worker.deteniendo', { senal })
    corriendo = false
  }
  process.on('SIGINT', () => void detener('SIGINT'))
  process.on('SIGTERM', () => void detener('SIGTERM'))

  while (corriendo) {
    try {
      const espacios = await listarEspacios()
      let total = 0
      for (const espacio of espacios) {
        try {
          const provider = await crearProveedor(espacio)
          total += await procesarEspacio(espacio, provider)
        } catch (error) {
          // Un espacio con la credencial vencida no puede frenar a los demas.
          logger.error('worker.espacio_no_disponible', error, {
            tenantId: espacio.tenantId,
          })
        }
      }
      if (total === 0) {
        await new Promise((r) => setTimeout(r, INTERVALO_MS))
      }
    } catch (error) {
      logger.error('worker.ciclo_fallido', error)
      await new Promise((r) => setTimeout(r, INTERVALO_MS * 3))
    }
  }

  await closeAllPools()
  process.exit(0)
}

await bucle()
