/** Limites validados en servidor. El frontend no puede ampliarlos. */
export const LIMITS = {
  /** Mensaje inicial maximo, en caracteres. */
  MESSAGE_MAX_CHARS: 8_000,
  /** Cuerpo HTTP maximo, en bytes. */
  BODY_MAX_BYTES: 32 * 1024,
  /** Paginacion maxima por pagina. */
  PAGE_SIZE_MAX: 100,
  PAGE_SIZE_DEFAULT: 25,
  /** Fragmentos entregados al modelo en una respuesta. */
  RETRIEVAL_TOP_K: 12,
  /** Umbral de supresion para agregados: grupos con menos de esto no se publican. */
  SUPPRESSION_THRESHOLD: 5,
  /** Filas maximas devueltas por una consulta analitica. */
  ANALYTICS_MAX_ROWS: 1_000,
  /** Timeout de una consulta analitica, en milisegundos. */
  ANALYTICS_TIMEOUT_MS: 10_000,
  /** Deadline total de una peticion de chat, en milisegundos. */
  CHAT_DEADLINE_MS: 45_000,
  /** Vigencia de un lease de trabajo de ingesta, en milisegundos. */
  JOB_LEASE_MS: 60_000,
  /** Intentos maximos de un trabajo antes de pasar a fallidos. */
  JOB_MAX_ATTEMPTS: 5,
} as const
