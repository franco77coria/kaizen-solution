import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * La app vive bajo `/app`, igual en desarrollo que en produccion
 * (www.kaizensolutionscol.com/app, compartiendo dominio con la
 * landing). Servirla en la raiz en local y bajo una ruta en produccion es la
 * forma de que un link roto aparezca recien frente a quien la prueba.
 */
const BASE = '/app'

/**
 * El proxy manda la peticion CON el prefijo: la API lo quita al entrar
 * (`rewriteUrl` en `apps/api/src/app.ts`). Es el mismo camino que hace Vercel en
 * produccion, asi que lo que funciona aca funciona alla.
 *
 * `/auth/local` es la pantalla de seleccion de cuenta del proveedor de
 * identidad de desarrollo: es una ruta del FRONTEND, no de la API, asi que se
 * excluye del proxy.
 */
const alBackend = { target: 'http://127.0.0.1:3001', changeOrigin: false }

export default defineConfig({
  base: `${BASE}/`,
  plugins: [react()],
  // Los archivos quedan en `dist/app/`: Vercel publica `dist` y la app se
  // sirve en `/app/...`, que es donde el HTML busca sus recursos.
  build: { outDir: `dist${BASE}`, emptyOutDir: true },
  server: {
    // Puerto propio y fijo. Con el 5173 por defecto, cualquier otro proyecto
    // del workspace que este corriendo se lo queda primero y Vite se mueve al
    // siguiente libre: la URL cambia de una sesion a otra y uno termina
    // mirando la app equivocada creyendo que esta es la suya.
    //
    // `strictPort` hace que, si el puerto esta ocupado, FALLE en vez de
    // moverse en silencio.
    port: 5273,
    strictPort: true,
    proxy: {
      [`${BASE}/v1`]: alBackend,
      [`${BASE}/health`]: alBackend,
      [`${BASE}/auth`]: {
        ...alBackend,
        bypass: (req) =>
          req.url?.startsWith(`${BASE}/auth/local`) ? `${BASE}/index.html` : undefined,
      },
    },
  },
})
