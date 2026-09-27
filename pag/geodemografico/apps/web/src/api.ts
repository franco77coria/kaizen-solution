import { conBase } from './rutas'
/**
 * Cliente HTTP. Todo pasa por aqui para que el token CSRF y el ambito se
 * adjunten siempre: si cada componente armara su propio fetch, tarde o
 * temprano uno se olvidaria.
 *
 * El cliente NO decide permisos. Manda el ambito que el usuario eligio y el
 * servidor lo verifica; un 403 es una respuesta esperada, no un error a
 * ocultar.
 */
export interface Scope {
  tenantId: string
  tenantName: string
  tenantKind: string
  municipalityCode: string | null
  role: string
  purposeId: string
  purposeCode: string
  permissions: string[]
}

export interface Me {
  user: { id: string; emailDisplay: string }
  scopes: Scope[]
}

export interface Source {
  documentId: string
  documentVersionId: string
  chunkId: string
  title: string
  meetingAt: string | null
  dateOrigin: string
  artifactType: string
  section: string | null
  quote: string
}

export interface ChatAnswer {
  abstained: boolean
  answer: string
  abstentionReason: string
  sources: Source[]
  summaryOnly: boolean
  modelVersion: string
  promptVersion: string
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function leerCookie(nombre: string): string | null {
  const partes = document.cookie.split('; ')
  for (const parte of partes) {
    const [clave, ...resto] = parte.split('=')
    if (clave === nombre) return decodeURIComponent(resto.join('='))
  }
  return null
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; scope?: Scope } = {},
): Promise<T> {
  const headers: Record<string, string> = {}

  if (options.body !== undefined) headers['content-type'] = 'application/json'

  const csrf = leerCookie('kaizen_csrf')
  if (csrf) headers['x-csrf-token'] = csrf

  if (options.scope) {
    headers['x-tenant-id'] = options.scope.tenantId
    headers['x-purpose-id'] = options.scope.purposeId
  }

  const response = await fetch(conBase(path), {
    method: options.method ?? 'GET',
    headers,
    // Imprescindible: sin esto la cookie de sesion no viaja.
    credentials: 'same-origin',
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!response.ok) {
    let code = 'INTERNAL'
    let message = 'Ocurrio un error inesperado.'
    try {
      const payload = (await response.json()) as { error?: { code: string; message: string } }
      code = payload.error?.code ?? code
      message = payload.error?.message ?? message
    } catch {
      // Respuesta sin cuerpo JSON: se usa el mensaje por defecto.
    }
    throw new ApiError(code, message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export interface EstadoFuentes {
  connected: boolean
  needsReauth: boolean
  lastSyncAt: string | null
  documentos: number
  reuniones: number
  documentosSinReunionIdentificada: number
  extraccionesIncompletas: number
}

export interface Candidato {
  targetFileId: string
  nombre: string
  tipo: string | null
  modificado: string | null
  ubicacion: string | null
  motivo: string | null
  confirmadoPorProveedor: boolean
}

export type EventoProgreso =
  | { etapa: 'enrutando' }
  | { etapa: 'buscando' }
  | { etapa: 'encontrado'; fragmentos: number; documentos: number }
  | { etapa: 'sin_evidencia' }
  | { etapa: 'redactando' }

/**
 * Consulta con progreso en vivo por SSE.
 *
 * Se usa `fetch` con lectura del cuerpo en streaming y no `EventSource`,
 * porque `EventSource` solo hace GET: no puede mandar el cuerpo, ni la
 * cabecera CSRF, ni el ámbito.
 */
export async function preguntarEnVivo(
  scope: Scope,
  conversationId: string,
  content: string,
  manejadores: {
    onProgreso: (evento: EventoProgreso) => void
    onRespuesta: (respuesta: ChatAnswer) => void
    onError: (mensaje: string, codigo: string) => void
  },
  signal?: AbortSignal,
): Promise<void> {
  const csrf = leerCookie('kaizen_csrf')

  const response = await fetch(conBase(`/v1/conversations/${conversationId}/messages/stream`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      'x-tenant-id': scope.tenantId,
      'x-purpose-id': scope.purposeId,
    },
    credentials: 'same-origin',
    body: JSON.stringify({ content, idempotencyKey: crypto.randomUUID() }),
    ...(signal ? { signal } : {}),
  })

  if (!response.ok || !response.body) {
    let codigo = 'INTERNAL'
    let mensaje = 'No se pudo completar la consulta.'
    try {
      const payload = (await response.json()) as { error?: { code: string; message: string } }
      codigo = payload.error?.code ?? codigo
      mensaje = payload.error?.message ?? mensaje
    } catch {
      // Sin cuerpo JSON: queda el mensaje por defecto.
    }
    manejadores.onError(mensaje, codigo)
    return
  }

  const lector = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let resto = ''

  for (;;) {
    const { done, value } = await lector.read()
    if (done) break

    resto += value
    // Los eventos SSE se separan por línea en blanco. Un chunk de red puede
    // partir un evento al medio, así que lo incompleto se guarda para el
    // siguiente ciclo en vez de parsearse a medias.
    const bloques = resto.split('\n\n')
    resto = bloques.pop() ?? ''

    for (const bloque of bloques) {
      const lineaEvento = bloque.split('\n').find((l) => l.startsWith('event: '))
      const lineaDatos = bloque.split('\n').find((l) => l.startsWith('data: '))
      if (!lineaEvento || !lineaDatos) continue

      const tipo = lineaEvento.slice(7).trim()
      let datos: unknown
      try {
        datos = JSON.parse(lineaDatos.slice(6))
      } catch {
        continue
      }

      if (tipo === 'progreso') manejadores.onProgreso(datos as EventoProgreso)
      else if (tipo === 'respuesta') manejadores.onRespuesta(datos as ChatAnswer)
      else if (tipo === 'error') {
        const e = datos as { code: string; message: string }
        manejadores.onError(e.message, e.code)
      }
    }
  }
}

export interface DatosFormulario {
  consentimiento: { version: string; texto: string; responsable: string }
  municipios: Array<{ code: string; name: string }>
  evidencias: Array<{ valor: string; etiqueta: string }>
}

export interface Pendiente {
  id: string
  nombre: string
  documento: string
  municipio: string
  anioNacimiento: number | null
  version: number
  creado: string
  evidencia: string | null
  consentimientoVigente: boolean
  puedeRevisar: boolean
}

export interface Lider {
  id: string
  email: string
  nombre: string
  /** 'pending' = cargado pero todavía no entró nunca. */
  estado: 'pending' | 'active' | 'revoked'
  activo: string | null
  creado: string
  sumadas: number
  municipios: number
}

export interface CeldaAnalitica {
  key: string
  label: string
  value: number | null
  suppressed: boolean
}

/**
 * Filtro analitico. El servidor solo acepta estos campos (lista blanca) y
 * enlaza los valores como parametros: no hay texto libre que pueda llegar al
 * SQL. El cliente respeta la misma lista para no ofrecer lo que va a rebotar.
 */
export interface FiltroAnalitico {
  field: 'municipality_code' | 'status' | 'age_band' | 'capture_month' | 'consent_state' | 'gender'
  op: 'eq' | 'in'
  values: string[]
}

export interface ResultadoAnalitico {
  template: string
  rows: CeldaAnalitica[]
  totalGroups: number
  suppressedGroups: number
  suppressionThreshold: number
  executedAt: string
}

export const api = {
  me: () => request<Me>('/v1/me'),
  csrf: () => request<{ csrfToken: string }>('/auth/csrf'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  sourcesStatus: (scope: Scope) => request<EstadoFuentes>('/v1/sources/status', { scope }),

  /**
   * Inicia la vinculacion con Google. Devuelve la URL de autorizacion en vez
   * de redirigir, porque un 302 en una peticion fetch no abre la pantalla de
   * consentimiento: hay que navegar desde el cliente.
   */
  conectarGoogle: (scope: Scope, rol: 'lector' | 'fuente') =>
    request<{ authorizationUrl: string; scope: string }>(
      rol === 'lector' ? '/v1/google/connect' : '/v1/source-connections/connect',
      { method: 'POST', body: {}, scope },
    ),

  desconectarLector: (scope: Scope) =>
    request<{ ok: boolean; revocadoEnProveedor: boolean }>('/v1/google/connection', {
      method: 'DELETE',
      scope,
    }),

  candidatos: (scope: Scope) =>
    request<{ candidatos: Candidato[]; admitidos: Candidato[]; descartados: number }>(
      '/v1/sources/candidates',
      { scope },
    ),

  decidirCandidatos: (scope: Scope, targetFileIds: string[], decision: 'admitir' | 'descartar') =>
    request<{ afectados: number; decision: string }>('/v1/sources/candidates/decide', {
      method: 'POST',
      body: { targetFileIds, decision },
      scope,
    }),

  formulario: (scope: Scope) => request<DatosFormulario>('/v1/capture/form', { scope }),

  capturar: (
    scope: Scope,
    datos: {
      fullName: string
      documentNumber: string
      municipalityCode: string
      birthYear?: number
      phone?: string
      gender: string
      relationship: string
      usesWhatsapp: boolean
      occupation?: string
      consentTextVersion: string
      evidenceKind: string
      evidenceRef: string
    },
  ) =>
    request<{ id: string; status: string }>('/v1/capture/records', {
      method: 'POST',
      // El consentimiento va explícito y el servidor exige que sea exactamente
      // true: no hay forma de que un formulario lo mande premarcado desde el
      // cliente sin que la persona lo haya marcado.
      body: { ...datos, consentGiven: true, idempotencyKey: crypto.randomUUID() },
      scope,
    }),

  enviarARevision: (scope: Scope, id: string) =>
    request<{ ok: boolean }>(`/v1/capture/records/${id}/submit`, { method: 'POST', scope }),

  pendientes: (scope: Scope) =>
    request<{ pendientes: Pendiente[] }>('/v1/capture/pending', { scope }),

  revisar: (
    scope: Scope,
    id: string,
    decision: 'approve' | 'reject',
    reason: string,
    expectedVersion: number,
  ) =>
    request<{ status: string; aplicada: boolean }>(`/v1/capture/records/${id}/review`, {
      method: 'POST',
      body: { decision, reason, expectedVersion, idempotencyKey: crypto.randomUUID() },
      scope,
    }),

  analitica: (scope: Scope, template: string, filtros: FiltroAnalitico[] = []) =>
    request<{ runId: string; result: ResultadoAnalitico }>('/v1/analytics/runs', {
      method: 'POST',
      body: {
        // El limite cubre los 116 municipios: con el default de la pantalla
        // anterior, un municipio quedaba afuera sin que nada lo dijera.
        plan: { template, filters: filtros, limit: 200 },
        idempotencyKey: crypto.randomUUID(),
      },
      scope,
    }),

  /** Lo que sumó la cuenta que pregunta: su propio trabajo, sin supresión. */
  mias: (scope: Scope) =>
    request<{ total: number; municipios: number; hoy: number }>('/v1/capture/mias', { scope }),

  lideres: (scope: Scope) => request<{ lideres: Lider[] }>('/v1/lideres', { scope }),

  cargarLider: (scope: Scope, email: string, nombre: string) =>
    request<{ id: string }>('/v1/lideres', { method: 'POST', body: { email, nombre }, scope }),

  revocarLider: (scope: Scope, id: string) =>
    request<{ ok: boolean }>(`/v1/lideres/${id}/revocar`, { method: 'POST', scope }),

  sincronizar: (scope: Scope) =>
    request<{ jobId: string; status: string }>('/v1/sources/sync', {
      method: 'POST',
      body: { mode: 'incremental', idempotencyKey: crypto.randomUUID() },
      scope,
    }),

  crearConversacion: (scope: Scope) =>
    request<{ id: string }>('/v1/conversations', { method: 'POST', body: {}, scope }),

  preguntar: (scope: Scope, conversationId: string, content: string) =>
    request<ChatAnswer>(`/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      // La clave de idempotencia la genera el cliente: dos clics seguidos
      // comparten clave y el servidor devuelve la misma respuesta en vez de
      // generar dos veces.
      body: { content, idempotencyKey: crypto.randomUUID() },
      scope,
    }),
}
