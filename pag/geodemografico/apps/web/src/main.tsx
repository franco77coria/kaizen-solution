import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { LoginLocal } from './LoginLocal'
import { conBase } from './rutas'
import './tokens.css'
import './styles.css'
import './paginas.css'
import './chat.css'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('falta el contenedor raiz')

// La pantalla de cuentas de prueba es la unica que vive fuera del shell: se
// muestra antes de que exista una sesion.
const esLoginLocal = window.location.pathname.replace(/\/+$/, '') === conBase('/auth/local')

createRoot(contenedor).render(
  <StrictMode>{esLoginLocal ? <LoginLocal /> : <App />}</StrictMode>,
)
