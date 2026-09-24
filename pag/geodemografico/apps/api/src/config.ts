/**
 * Configuracion del proceso. Se valida AL ARRANCAR: un despliegue con una
 * variable faltante debe fallar al iniciar, no la primera vez que un usuario
 * toca la funcion afectada.
 */
export interface AppConfig {
  nodeEnv: string
  appEnv: 'local' | 'staging' | 'production'
  port: number
  /**
   * Solo esquema + host. Es lo que el navegador manda en la cabecera `Origin`,
   * asi que es contra esto que se compara en CORS: una ruta aca haria que
   * ninguna peticion coincida.
   */
  webOrigin: string
  /**
   * Ruta bajo la que vive la aplicacion (`/geodemografico`), o '' en la raiz.
   * En produccion la app comparte dominio con la landing, asi que todo lo que
   * sea direccion -redirecciones, rutas de cookie- tiene que llevarla.
   */
  basePath: string
  /** Origen + ruta base: a donde se redirige al usuario. */
  webBase: string
  /** Las cookies no salen de la ruta base: la landing no tiene por que verlas. */
  cookiePath: string
  isProduction: boolean
}

/** '/geodemografico/' -> '/geodemografico'; '' o '/' -> ''. */
export function normalizarBasePath(valor: string | undefined): string {
  const limpio = (valor ?? '').trim().replace(/\/+$/, '')
  if (limpio === '') return ''
  return limpio.startsWith('/') ? limpio : `/${limpio}`
}

export function loadConfig(): AppConfig {
  const appEnv = (process.env['APP_ENV'] ?? 'local') as AppConfig['appEnv']
  const isProduction = appEnv === 'production'

  const requeridas = ['DATABASE_URL', 'SESSION_SECRET']
  if (isProduction) requeridas.push('TOKEN_VAULT_KEY', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_ALLOWED_HD')

  const faltantes = requeridas.filter((k) => !process.env[k])
  if (faltantes.length > 0) {
    throw new Error(`faltan variables de entorno: ${faltantes.join(', ')}`)
  }

  // Falla cerrada: un proveedor de identidad de desarrollo en produccion
  // aceptaria cualquier identidad. Se comprueba aqui, no solo en el proveedor.
  if (isProduction && (process.env['OIDC_PROVIDER'] ?? 'google') === 'fake') {
    throw new Error('OIDC_PROVIDER=fake no puede usarse en produccion')
  }

  if (isProduction && process.env['OIDC_ALLOWED_HD'] !== 'kaizensolutionscol.com') {
    throw new Error('OIDC_ALLOWED_HD debe ser kaizensolutionscol.com en produccion')
  }

  const webOrigin = new URL(process.env['PUBLIC_WEB_ORIGIN'] ?? 'http://localhost:5273').origin
  const basePath = normalizarBasePath(process.env['BASE_PATH'])

  return {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    appEnv,
    port: Number(process.env['PORT'] ?? 3001),
    webOrigin,
    basePath,
    webBase: `${webOrigin}${basePath}`,
    cookiePath: basePath || '/',
    isProduction,
  }
}

/**
 * Ruta de las cookies. Se lee en un solo lugar para que sesion, CSRF y los
 * flujos de OAuth no puedan quedar con rutas distintas: si una cookie se
 * setea con `/geodemografico` y se borra con `/`, el borrado no la alcanza y la
 * sesion sobrevive al "Salir".
 */
export function rutaCookies(): string {
  return normalizarBasePath(process.env['BASE_PATH']) || '/'
}
