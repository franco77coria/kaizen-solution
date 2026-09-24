/**
 * Verificacion de la configuracion de Google Drive.
 *
 *   node --env-file=.env scripts/verify-drive.mjs
 *
 * Comprueba lo que se puede comprobar SIN abrir un navegador: que las tres
 * credenciales esten completas, que los redirect URIs sean coherentes, y que
 * la URL de autorizacion se construya bien.
 *
 * Lo que NO puede comprobar: si Google acepta esos clientes. Eso se sabe
 * recien al pasar por la pantalla de consentimiento desde la interfaz.
 */
import {
  SCOPES_REQUERIDOS,
  estaConfigurado,
  iniciarVinculacion,
} from '../packages/connectors/google-drive/dist/index.js'

function linea(etiqueta, valor) {
  console.log(`  ${etiqueta.padEnd(26)} ${valor}`)
}

console.log('\nConfiguracion de Google Drive\n')

let problemas = 0

// El login es un cliente OAuth aparte del lector y del ingestor.
console.log('Identidad (login)')
const oidcListo = Boolean(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET)
linea('OIDC_CLIENT_ID', process.env.OIDC_CLIENT_ID ? 'configurado' : 'FALTA')
linea('OIDC_CLIENT_SECRET', process.env.OIDC_CLIENT_SECRET ? 'configurado' : 'FALTA')
linea('OIDC_REDIRECT_URI', process.env.OIDC_REDIRECT_URI ?? 'FALTA')
linea('OIDC_ALLOWED_HD', process.env.OIDC_ALLOWED_HD ?? 'FALTA (cualquier dominio entraria)')
if (!oidcListo) problemas++
if (!process.env.OIDC_ALLOWED_HD) problemas++

const roles = [
  ['reader', 'Lector (comprueba acceso del consultante)'],
  ['ingestor', 'Ingestor (lee los archivos del espacio)'],
]

const clientIds = new Map()

for (const [rol, descripcion] of roles) {
  console.log(`\n${descripcion}`)
  if (!estaConfigurado(rol)) {
    linea('estado', 'FALTA configuracion')
    problemas++
    continue
  }

  const prefijo = rol === 'reader' ? 'GOOGLE_READER' : 'GOOGLE_INGESTOR'
  const clientId = process.env[`${prefijo}_CLIENT_ID`]
  clientIds.set(rol, clientId)

  try {
    const inicio = iniciarVinculacion(rol)
    const url = new URL(inicio.url)
    linea('estado', 'configurado')
    linea('redirect_uri', url.searchParams.get('redirect_uri'))
    linea(
      'scopes',
      SCOPES_REQUERIDOS.map((s) => s.replace('https://www.googleapis.com/auth/', '')).join(' + '),
    )
    linea('PKCE', url.searchParams.get('code_challenge_method') ?? 'NO')
    linea('refresh token', url.searchParams.get('access_type') === 'offline' ? 'si' : 'NO')
  } catch (error) {
    linea('estado', `ERROR: ${error.message}`)
    problemas++
  }
}

console.log('')

// El error mas caro de diagnosticar: reutilizar el mismo cliente OAuth.
if (clientIds.size === 2 && clientIds.get('reader') === clientIds.get('ingestor')) {
  console.log(
    'PROBLEMA: lector e ingestor usan el MISMO client_id.\n' +
      '  Tienen que ser clientes OAuth distintos. Si son el mismo, un token de\n' +
      '  ingesta sirve para responderle a cualquiera y la comprobacion de\n' +
      '  "este usuario todavia puede ver esta nota" deja de existir.\n',
  )
  problemas++
}

if (problemas === 0) {
  console.log('Configuracion completa.')
  console.log('Falta lo unico que no se puede comprobar desde aca: pasar por la')
  console.log('pantalla de consentimiento. Entra a la interfaz y usa "Conectar mi cuenta".\n')
  process.exit(0)
}

console.log(`${problemas} punto(s) pendiente(s). Ver docs/runbooks/configuracion-externa.md\n`)
process.exit(1)
