import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AppError, conflict, notFound, unauthenticated, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { secretsEqual } from '@kaizen/authz'
import {
  SCOPES_REQUERIDOS,
  canjearCodigo,
  estaConfigurado,
  evaluarScopes,
  iniciarVinculacion,
  revocarEnProveedor,
  type RolConexion,
} from '@kaizen/connector-google-drive'
import { requireCsrf, resolveCorpusScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { registrarAuditoria } from '../services/audit.js'
import { guardarSecreto, leerSecreto } from '../services/vault.js'
import { rutaCookies, type AppConfig } from '../config.js'

const COOKIE_FLUJO = 'kaizen_drive_oauth'

/**
 * El callback lo construye GOOGLE, no nosotros. Ademas de `code` y `state`
 * agrega `scope`, `authuser`, `hd` y `prompt` segun el caso, y puede sumar
 * otros sin avisar.
 *
 * Por eso este schema NO es estricto: exigir exactitud sobre una carga util
 * que define un tercero rechazaria todos los logins reales. Se extrae lo que
 * se necesita y se ignora el resto; lo que importa de verdad -que la respuesta
 * corresponda a este pedido- lo garantiza la comparacion del `state`.
 */
const callbackSchema = z.object({
  code: z.string().min(1).max(2_000),
  state: z.string().min(1).max(500),
})

/**
 * Vinculacion de cuentas de Google Drive.
 *
 * Dos flujos con el mismo mecanismo pero DISTINTO cliente OAuth, distinto
 * permiso y distinta tabla:
 *
 *   - LECTOR (`/v1/google/*`): lo conecta cada usuario para si mismo. Sirve
 *     para comprobar que sigue teniendo acceso a la fuente en el proveedor.
 *   - INGESTOR (`/v1/source-connections/*`): lo conecta un administrador de
 *     la fuente. Es la identidad que usa el worker para leer los archivos.
 *
 * El estado del flujo (state, verifier, rol) viaja en una cookie de corta
 * vida, no en memoria del proceso: guardarlo en memoria rompe en cuanto hay
 * mas de una instancia, que es el despliegue previsto.
 */
export async function googleRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  interface EstadoFlujo {
    state: string
    verifier: string
    rol: RolConexion
    tenantId: string
    purposeId: string
  }

  function guardarFlujo(reply: FastifyReply, datos: EstadoFlujo): void {
    reply.setCookie(COOKIE_FLUJO, JSON.stringify(datos), {
      httpOnly: true,
      secure: config.isProduction,
      // `lax` y no `strict`: con strict el navegador no manda la cookie al
      // volver de Google y el flujo se rompe siempre.
      sameSite: 'lax',
      path: rutaCookies(),
      maxAge: 600,
    })
  }

  async function completar(request: FastifyRequest, rolEsperado: RolConexion) {
    const crudo = request.cookies[COOKIE_FLUJO]
    if (!crudo) throw unauthenticated('no hay una vinculacion en curso')

    let flujo: EstadoFlujo
    try {
      flujo = JSON.parse(crudo)
    } catch {
      throw unauthenticated('flujo de vinculacion corrupto')
    }

    const parsed = callbackSchema.safeParse(request.query)
    if (!parsed.success) throw validationFailed('parametros de callback invalidos')

    // El `state` es lo que ata esta respuesta al pedido que la origino.
    if (!secretsEqual(flujo.state, parsed.data.state)) {
      throw unauthenticated('state no coincide')
    }

    // Un callback de lector no puede completar una vinculacion de ingestor:
    // son permisos distintos.
    if (flujo.rol !== rolEsperado) throw unauthenticated('el rol del flujo no corresponde')

    const tokens = await canjearCodigo(rolEsperado, parsed.data.code, flujo.verifier)

    // Los scopes CONCEDIDOS pueden ser menos que los pedidos: el usuario puede
    // desmarcar permisos en la pantalla de Google.
    //
    // Se comprueban DESCUBRIMIENTO y CONTENIDO por separado. Con solo el de
    // descubrimiento la conexion parece sana -lista archivos y guarda
    // metadata- y falla recien al leer, archivo por archivo, con un 403 que no
    // explica que falto un permiso. Mejor rechazarla ahora y decir cual falta.
    const scopes = evaluarScopes(tokens.grantedScopes)
    if (!scopes.suficientes) {
      const nombresCortos = scopes.faltantes.map((s) =>
        s.replace('https://www.googleapis.com/auth/', ''),
      )
      throw new AppError(
        'FORBIDDEN',
        `faltan permisos de Google: ${nombresCortos.join(' y ')}. ` +
          (scopes.puedeDescubrir && !scopes.puedeLeerContenido
            ? 'Se pueden listar las notas pero no leerlas.'
            : 'Hay que volver a autorizar aceptando todos los permisos.'),
      )
    }

    return { flujo, tokens }
  }

  // --- LECTOR: cada usuario conecta su propia cuenta ------------------------

  app.post('/v1/google/connect', async (request, reply) => {
    requireCsrf(request)
    const ambito = leerAmbito(request)
    const session = await resolveCorpusScope(request, ambito, ['notes.read'])

    if (!estaConfigurado('reader')) {
      throw new AppError('PROVIDER_UNAVAILABLE', 'OAuth de lector sin configurar')
    }

    const inicio = iniciarVinculacion('reader')
    guardarFlujo(reply, {
      state: inicio.state,
      verifier: inicio.codeVerifier,
      rol: 'reader',
      tenantId: session.tenantId,
      purposeId: session.purposeId,
    })

    // Se devuelve la URL en vez de redirigir: quien llama es la interfaz por
    // fetch, y un 302 en una peticion XHR no abre la pantalla de Google.
    return { authorizationUrl: inicio.url, scopes: SCOPES_REQUERIDOS }
  })

  app.get('/v1/google/callback', async (request, reply) => {
    const { flujo, tokens } = await completar(request, 'reader')
    const session = await resolveCorpusScope(
      request,
      { tenantId: flujo.tenantId, purposeId: flujo.purposeId },
      ['notes.read'],
    )

    await withAuthorizedTransaction('app', txContext(session), async (client) => {
      const existente = await client.query<{ id: string; token_ref: string | null }>(
        `select id, token_ref from reader_connections
          where user_id = $1 and provider = 'google_drive'`,
        [session.userId],
      )

      const tokenRef = await guardarSecreto(
        client,
        session.tenantId,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        },
        existente.rows[0]?.token_ref ?? null,
      )

      await client.query(
        `insert into reader_connections
           (tenant_id, user_id, provider, provider_subject, token_ref, granted_scopes, status)
         values ($1,$2,'google_drive',$3,$4,$5,'active')
         on conflict (tenant_id, user_id, provider) do update
           set provider_subject = excluded.provider_subject,
               token_ref = excluded.token_ref,
               granted_scopes = excluded.granted_scopes,
               status = 'active'`,
        [
          session.tenantId,
          session.userId,
          tokens.providerSubject,
          tokenRef,
          tokens.grantedScopes,
        ],
      )
    })

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.connect',
      resourceRef: 'reader',
      result: 'allowed',
      requestId: request.requestId,
      // Se registra CUANTOS scopes, no el email ni el subject de Google.
      detail: { rol: 'reader', scopes: tokens.grantedScopes.length },
    })

    reply.clearCookie(COOKIE_FLUJO, { path: rutaCookies() })
    return reply.redirect(`${config.webBase}/ajustes?google=conectado`)
  })

  app.delete('/v1/google/connection', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['notes.read'])

    const secreto = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        const { rows } = await client.query<{ id: string; token_ref: string | null }>(
          `select id, token_ref from reader_connections
            where user_id = $1 and provider = 'google_drive' and status <> 'revoked'`,
          [session.userId],
        )
        const conexion = rows[0]
        if (!conexion) throw notFound('no hay una conexion de lectura activa')

        const guardado = conexion.token_ref
          ? await leerSecreto(client, conexion.token_ref)
          : null

        await client.query(
          `update reader_connections set status = 'revoked', token_ref = null where id = $1`,
          [conexion.id],
        )

        return guardado
      },
    )

    // Se revoca tambien EN GOOGLE. Borrar la fila sin revocar dejaria una
    // autorizacion viva en la cuenta del usuario.
    const revocado = secreto?.refreshToken
      ? await revocarEnProveedor(secreto.refreshToken)
      : false

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.disconnect',
      resourceRef: 'reader',
      result: 'allowed',
      requestId: request.requestId,
      detail: { revocado_en_proveedor: revocado },
    })

    return { ok: true, revocadoEnProveedor: revocado }
  })

  // --- INGESTOR: la conecta un administrador de la fuente -------------------

  app.post('/v1/source-connections/connect', async (request, reply) => {
    requireCsrf(request)
    const ambito = leerAmbito(request)
    // Permiso ADMINISTRATIVO sobre la fuente compartida, no propiedad personal
    // del corpus: quien conecta la ingesta habilita lectura para todo el
    // espacio, no solo para si mismo.
    const session = await resolveCorpusScope(request, ambito, ['sources.manage'])

    if (!estaConfigurado('ingestor')) {
      throw new AppError('PROVIDER_UNAVAILABLE', 'OAuth de ingestor sin configurar')
    }

    const inicio = iniciarVinculacion('ingestor')
    guardarFlujo(reply, {
      state: inicio.state,
      verifier: inicio.codeVerifier,
      rol: 'ingestor',
      tenantId: session.tenantId,
      purposeId: session.purposeId,
    })

    return { authorizationUrl: inicio.url, scopes: SCOPES_REQUERIDOS }
  })

  app.get('/v1/source-connections/callback', async (request, reply) => {
    const { flujo, tokens } = await completar(request, 'ingestor')
    const session = await resolveCorpusScope(
      request,
      { tenantId: flujo.tenantId, purposeId: flujo.purposeId },
      ['sources.manage'],
    )

    const resultado = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        // La generacion se calcula sobre TODO el historial del corpus, no solo
        // sobre las conexiones activas.
        //
        // Mirar solo las activas la reiniciaba: al reconectar despues de un
        // `needs_reauth` volvia a 1, y entonces un trabajo encolado con la
        // generacion 1 vieja pasaba a considerarse vigente. Justo lo contrario
        // de lo que la generacion existe para impedir.
        const previa = await client.query<{ maxima: number | null }>(
          `select max(generation) as maxima from source_connections where corpus_id = $1`,
          [session.corpusId],
        )
        const generacion = (previa.rows[0]?.maxima ?? 0) + 1

        // Se revocan TODAS las anteriores, no solo la activa: una en
        // `needs_reauth` conserva su token y seguiria siendo utilizable.
        const revocadas = await client.query(
          `update source_connections
              set status = 'revoked', token_ref = null
            where corpus_id = $1 and status <> 'revoked'`,
          [session.corpusId],
        )
        const anterior = (revocadas.rowCount ?? 0) > 0

        const tokenRef = await guardarSecreto(client, session.tenantId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        })

        const creada = await client.query<{ id: string }>(
          `insert into source_connections
             (tenant_id, corpus_id, provider, provider_subject, token_ref,
              granted_scopes, status, generation)
           values ($1,$2,'google_drive',$3,$4,$5,'active',$6)
           returning id`,
          [
            session.tenantId,
            session.corpusId,
            tokens.providerSubject,
            tokenRef,
            tokens.grantedScopes,
            generacion,
          ],
        )

        const conexionId = creada.rows[0]?.id
        if (!conexionId) throw conflict('no se pudo registrar la conexion')

        // La coleccion pertenece al CORPUS, no a la conexion: es la curaduria
        // del espacio -que archivos puede leer el asistente- y sobrevive a un
        // cambio de credencial.
        //
        // Por eso al reconectar se REAPUNTA la coleccion existente en vez de
        // crear otra. Crear una nueva dejaba las decisiones de admision
        // colgadas de la conexion vieja, y obligaba a volver a elegir los
        // archivos uno por uno cada vez. Eso se hace UNA vez.
        //
        // El filtro es por CORPUS y alcanza exactamente una fila, porque desde
        // la migracion 0019 hay un indice unico sobre `corpus_id`. La version
        // anterior filtraba por "cualquier conexion vieja de este corpus" y
        // ponia el mismo `connection_id` en todas las que encontrara: con dos
        // colecciones en el corpus, reconectar reventaba con una violacion de
        // unicidad y un 500.
        const reapuntada = await client.query(
          `update source_collections
              set connection_id = $2
            where tenant_id = $1 and corpus_id = $3`,
          [session.tenantId, conexionId, session.corpusId],
        )

        if ((reapuntada.rowCount ?? 0) === 0) {
          // Primera conexion de este espacio: la coleccion todavia no existe.
          // La pertenencia es por ID de archivo, no por carpeta: mover un
          // archivo de carpeta no lo saca de la coleccion.
          await client.query(
            `insert into source_collections
               (tenant_id, corpus_id, connection_id, mode, allowed_mime_types, admission_rule)
             values ($1,$3,$2,'virtual_manifest','{application/vnd.google-apps.document}',null)`,
            [session.tenantId, conexionId, session.corpusId],
          )
        }

        // Reconectar NO reindexa desde cero: se encola una reconciliacion, que
        // compara el manifiesto y respeta el hash de contenido. Por eso volver
        // a conectar no duplica el indice.
        await client.query(
          `insert into ingestion_jobs
             (tenant_id, corpus_id, connection_id, connection_generation, provider_file_id,
              job_kind, pipeline_version, dedupe_key)
           values ($1,$2,$3,$4,'','reconcile','connect-1',$5)
           on conflict (tenant_id, dedupe_key) do nothing`,
          [
            session.tenantId,
            session.corpusId,
            conexionId,
            generacion,
            `connect:${conexionId}:${generacion}`,
          ],
        )

        return { conexionId, generacion, reconecto: anterior }
      },
    )

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.connect',
      resourceRef: resultado.conexionId,
      result: 'allowed',
      requestId: request.requestId,
      detail: {
        rol: 'ingestor',
        generacion: resultado.generacion,
        reconexion: resultado.reconecto,
        scopes: tokens.grantedScopes.length,
      },
    })

    reply.clearCookie(COOKIE_FLUJO, { path: rutaCookies() })
    return reply.redirect(`${config.webBase}/ajustes?fuente=conectada`)
  })

  app.delete('/v1/source-connections/:id', async (request) => {
    requireCsrf(request)
    const session = await resolveCorpusScope(request, leerAmbito(request), ['sources.manage'])

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params)
    if (!params.success) throw validationFailed('id invalido')

    const secreto = await withAuthorizedTransaction(
      'app',
      txContext(session),
      async (client) => {
        const { rows } = await client.query<{ token_ref: string | null }>(
          `select token_ref from source_connections
            where id = $1 and corpus_id = $2 and status = 'active'`,
          [params.data.id, session.corpusId],
        )
        const conexion = rows[0]
        if (!conexion) throw notFound('conexion inexistente o ya revocada')

        const guardado = conexion.token_ref
          ? await leerSecreto(client, conexion.token_ref)
          : null

        await client.query(
          `update source_connections set status = 'revoked', token_ref = null where id = $1`,
          [params.data.id],
        )

        // Desconectar una fuente COMPARTIDA retira sus documentos para todo el
        // espacio. El historial que dependia de esas versiones deja de
        // servirse por la comprobacion de vigencia, sin reescribir mensajes.
        await client.query(
          `update documents set status = 'withdrawn'
            where connection_id = $1 and status = 'active'`,
          [params.data.id],
        )
        await client.query(
          `update document_versions v set status = 'withdrawn'
             from documents d
            where d.tenant_id = v.tenant_id
              and d.id = v.document_id
              and d.connection_id = $1
              and v.status <> 'withdrawn'`,
          [params.data.id],
        )
        await client.query(
          `insert into deletion_tombstones
             (tenant_id, corpus_id, resource_kind, resource_ref, reason, scope)
           values ($1,$2,'source_connection',$3,'access_revoked','document')`,
          [session.tenantId, session.corpusId, params.data.id],
        )

        return guardado
      },
    )

    const revocado = secreto?.refreshToken
      ? await revocarEnProveedor(secreto.refreshToken)
      : false

    await registrarAuditoria({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      purposeId: session.purposeId,
      action: 'source.revoked',
      resourceRef: params.data.id,
      result: 'allowed',
      requestId: request.requestId,
      detail: { revocado_en_proveedor: revocado },
    })

    return { ok: true, revocadoEnProveedor: revocado }
  })
}
