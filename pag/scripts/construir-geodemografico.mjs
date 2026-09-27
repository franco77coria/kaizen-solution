/**
 * Construye el geodemografico (carpeta `geodemografico/`) DENTRO de la app de
 * Kaizen. Corre antes de `next build` (script `build` de package.json).
 *
 *   1. Instala y compila el monorepo del geodemografico (pnpm, su propio lockfile).
 *   2. Empaqueta su API en un solo modulo: `.geo/entrada.mjs`. Lo carga la
 *      ruta `pages/api/geo/[...ruta].ts` y la de ingesta.
 *   3. Copia la interfaz compilada a `public/app/`: Next la sirve como
 *      archivos estaticos en /app.
 *
 * Por que un bundle y no importar el codigo directo desde Next: el
 * geodemografico es un monorepo pnpm con sus propias dependencias. Webpack
 * tendria que resolverlas desde otra raiz, y el trazado de archivos de Vercel
 * arrastraria su node_modules entero (herramientas de desarrollo incluidas).
 * Un solo archivo sin dependencias externas es predecible.
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const geo = join(raiz, 'geodemografico')

function correr(comando, cwd) {
    console.log(`[geodemografico] ${comando}`)
    execSync(comando, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } })
}

// Version fija de pnpm: la misma que declara el monorepo (packageManager).
const pnpm = 'npx --yes pnpm@9.15.9'
correr(`${pnpm} install --frozen-lockfile`, geo)
correr(`${pnpm} build`, geo)

const salida = join(raiz, '.geo')
rmSync(salida, { recursive: true, force: true })
mkdirSync(salida, { recursive: true })

await build({
    entryPoints: [join(geo, 'embebido', 'entrada.ts')],
    outfile: join(salida, 'entrada.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    // Dependencias en CommonJS dentro de un bundle ESM necesitan `require`.
    banner: {
        js: "import { createRequire as __crearRequire } from 'node:module'; const require = __crearRequire(import.meta.url);",
    },
    // `@resvg/resvg-js` trae un binario nativo: se resuelve en runtime desde
    // node_modules de la app (dependencia de package.json) y solo se usa al
    // exportar graficos a PNG. `pg-native` es opcional y no se instala.
    external: ['@resvg/resvg-js', 'pg-native'],
    logLevel: 'info',
})

const web = join(geo, 'apps', 'web', 'dist', 'app')
if (!existsSync(join(web, 'index.html'))) throw new Error('no se encontro la interfaz compilada en ' + web)
const publico = join(raiz, 'public', 'app')
rmSync(publico, { recursive: true, force: true })
cpSync(web, publico, { recursive: true })
console.log('[geodemografico] interfaz copiada a public/app')
