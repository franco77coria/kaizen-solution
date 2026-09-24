import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import { LIMITS } from '@kaizen/contracts'
import { loadConfig, type AppConfig } from './config.js'
import { registerRequestContext } from './plugins/request-context.js'
import { registerSessionLoader } from './plugins/session.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { sourceRoutes } from './routes/sources.js'
import { conversationRoutes } from './routes/conversations.js'
import { analyticsRoutes } from './routes/analytics.js'
import { visualizationRoutes } from './routes/visualizations.js'
import { analysisRoutes } from './routes/analyses.js'
import { captureRoutes } from './routes/capture.js'
import { geographyRoutes } from './routes/geography.js'
import { privacyRoutes } from './routes/privacy.js'
import { webhookRoutes } from './routes/webhooks.js'
import { googleRoutes } from './routes/google.js'
import { candidateRoutes } from './routes/candidates.js'
import { streamRoutes } from './routes/stream.js'
import { formularioRoutes } from './routes/formulario.js'
import { liderRoutes } from './routes/lideres.js'

export async function buildApp(config: AppConfig = loadConfig()): Promise<FastifyInstance> {
  const app = Fastify({
    // El logger propio de Fastify registra la URL completa y las cabeceras.
    // Se desactiva y se usa el logger con redaccion de PII.
    logger: false,
    trustProxy: true,
    // Limite de cuerpo aplicado en el SERVIDOR. El cliente no puede ampliarlo.
    bodyLimit: LIMITS.BODY_MAX_BYTES,
    disableRequestLogging: true,
    // En produccion la API se sirve bajo la ruta base (`/geodemografico/v1/...`)
    // porque comparte dominio con la landing. Se quita el prefijo ANTES de
    // rutear, asi ninguna ruta registrada depende de donde este montada la app.
    // Sin prefijo la peticion pasa igual: los tests y el callback directo al
    // puerto de la API en desarrollo siguen funcionando.
    rewriteUrl: (req) => {
      const url = req.url ?? '/'
      const base = config.basePath
      if (base && (url === base || url.startsWith(`${base}/`) || url.startsWith(`${base}?`))) {
        const resto = url.slice(base.length)
        // '/geodemografico?x=1' deja '?x=1': sin la barra, Fastify no lo rutea.
        return resto.startsWith('/') ? resto : `/${resto}`
      }
      return url
    },
  })

  await registerRequestContext(app)

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Sin 'unsafe-eval': nada del bundle lo necesita.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        // La API no llama a terceros desde el navegador.
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  })

  await app.register(cookie, {
    secret: process.env['SESSION_SECRET'] ?? 'solo-desarrollo-no-usar-en-produccion',
    parseOptions: {},
  })

  // CORS explicito y acotado al origen del frontend. `credentials: true` exige
  // un origen concreto: con '*' el navegador rechaza las cookies.
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    if (origin && origin === config.webOrigin) {
      reply.header('access-control-allow-origin', origin)
      reply.header('access-control-allow-credentials', 'true')
      reply.header(
        'access-control-allow-headers',
        'content-type,x-csrf-token,x-tenant-id,x-purpose-id',
      )
      reply.header('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS')
      reply.header('vary', 'origin')
    }
    if (request.method === 'OPTIONS') {
      return reply.status(204).send()
    }
    return undefined
  })

  await registerSessionLoader(app)

  await app.register(healthRoutes)
  await app.register(async (instance) => authRoutes(instance, config))
  await app.register(meRoutes)
  await app.register(sourceRoutes)
  await app.register(conversationRoutes)
  await app.register(analyticsRoutes)
  await app.register(visualizationRoutes)
  await app.register(analysisRoutes)
  await app.register(captureRoutes)
  await app.register(geographyRoutes)
  await app.register(privacyRoutes)
  await app.register(webhookRoutes)
  await app.register(async (instance) => googleRoutes(instance, config))
  await app.register(candidateRoutes)
  await app.register(streamRoutes)
  await app.register(formularioRoutes)
  await app.register(liderRoutes)

  return app
}
