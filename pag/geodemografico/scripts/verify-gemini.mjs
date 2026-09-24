/**
 * Verificacion de la credencial y el modelo (seccion 2.1 del plan).
 *
 * Hace UNA llamada minima con texto sintetico y clasifica el resultado. No
 * carga notas, no toca Drive y no imprime la clave ni ningun fragmento de
 * ella: si falta, dice que falta.
 *
 *   node --env-file=.env scripts/verify-gemini.mjs
 */
import { createLlmAdapter, createEmbeddingAdapter } from '../packages/llm/dist/index.js'

const modelo = process.env.GEMINI_MODEL ?? 'gemini-3.7-flash'

function linea(etiqueta, valor) {
  console.log(`${etiqueta.padEnd(28)} ${valor}`)
}

console.log('\nVerificacion del proveedor de modelo\n')
linea('LLM_PROVIDER', process.env.LLM_PROVIDER ?? '(sin configurar, usa fake)')
linea('GEMINI_MODEL', modelo)
linea('thinking', process.env.GEMINI_THINKING_LEVEL ?? 'low')

const llm = createLlmAdapter()
const estado = llm.status()

linea('adaptador', llm.name)
linea('habilitado', estado.enabled ? 'si' : `no — ${estado.reason}`)

if (!estado.enabled) {
  console.log(
    '\nNo hay credencial configurada, asi que no se hizo ninguna llamada.\n' +
      'Para verificar de verdad: configurar GEMINI_API_KEY (o GEMINI_API_KEY_FILE)\n' +
      'y LLM_PROVIDER=gemini_developer, y volver a correr este script.\n',
  )
  process.exit(0)
}

if (llm.name === 'fake') {
  console.log(
    '\nEl adaptador activo es el DETERMINISTA local. No prueba nada del proveedor real.\n' +
      'Para verificar el acceso real: LLM_PROVIDER=gemini_developer.\n',
  )
  process.exit(0)
}

const inicio = Date.now()
try {
  const salida = await llm.generateAnswer({
    question: 'Segun el fragmento, cual es el color indicado?',
    evidence: [
      {
        chunkId: '00000000-0000-4000-8000-000000000001',
        documentId: '00000000-0000-4000-8000-000000000002',
        documentVersionId: '00000000-0000-4000-8000-000000000003',
        title: 'Texto sintetico de verificacion',
        section: null,
        meetingAt: null,
        artifactType: 'manual_document',
        // Texto sintetico: no se manda contenido real de nadie.
        content: 'El color indicado para la prueba es verde.',
      },
    ],
    locale: 'es',
    deadlineMs: 20_000,
  })

  const ms = Date.now() - inicio
  console.log('\nResultado')
  linea('llamada', 'OK')
  linea('latencia', `${ms} ms`)
  linea('modelo devuelto', salida.modelVersion)
  linea('JSON valido', typeof salida.answer === 'object' ? 'si' : 'no')
  linea('tokens entrada/salida', `${salida.usage.inputTokens}/${salida.usage.outputTokens}`)
  console.log('')
} catch (error) {
  // El mensaje del adaptador ya viene clasificado y sin cabeceras ni URL.
  console.log('\nResultado')
  linea('llamada', 'FALLO')
  linea('motivo', error?.message ?? 'desconocido')
  console.log(
    '\n401/403 => credencial rechazada o sin permiso sobre el modelo' +
      '\n404      => el modelo no existe o no esta disponible para este proyecto' +
      '\n429      => cuota agotada o limite de tasa' +
      '\nNinguno de estos se corrige cargando mas datos: son de configuracion.\n',
  )
  process.exitCode = 1
}

const emb = createEmbeddingAdapter()
const estadoEmb = emb.status()
console.log('Embeddings')
linea('adaptador', emb.name)
linea('modelo', emb.model)
linea('dimension', String(emb.dimension))
linea('habilitado', estadoEmb.enabled ? 'si' : `no — ${estadoEmb.reason}`)
console.log('')
