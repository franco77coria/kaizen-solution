import { useCallback, useEffect, useRef, useState } from 'react'
import { preguntarEnVivo, api, type ChatAnswer, type EventoProgreso, type Scope } from './api'
import { Icono, SimboloSuma } from './Marca'

/**
 * SUMA — la conversación sobre las notas de reunión.
 *
 * El estado vive en `useConversacion`, que se instancia UNA vez en el shell.
 * El panel flotante y la vista a pantalla completa (`/geodemografico/suma`)
 * son dos pieles del mismo estado: expandir no pierde lo conversado.
 *
 * Dos decisiones que no son de estilo:
 *
 * 1. Las respuestas se renderizan como TEXTO (`{texto}`), nunca con
 *    `dangerouslySetInnerHTML`. El contenido viene de documentos que pueden
 *    incluir cualquier cosa; interpretarlo como HTML sería un vector de XSS.
 *
 * 2. El texto se revela progresivamente DESPUÉS de que la respuesta llegó
 *    validada. No se emiten los tokens del modelo en crudo: las citas se
 *    verifican al final, y mostrar texto antes significaría poder retractarlo.
 *    Lo que sí es en vivo es el progreso real de cada etapa.
 */

export interface Turno {
  id: string
  rol: 'usuario' | 'asistente' | 'error'
  texto: string
  respuesta?: ChatAnswer
  revelando?: boolean
  /** Para "Reintentar": la pregunta que produjo este error. */
  pregunta?: string
}

const ETAPAS: Record<EventoProgreso['etapa'], (e: EventoProgreso) => string> = {
  enrutando: () => 'Entendiendo la pregunta',
  buscando: () => 'Buscando en las notas',
  encontrado: (e) =>
    e.etapa === 'encontrado'
      ? `Leyendo ${e.fragmentos} fragmento${e.fragmentos === 1 ? '' : 's'} de ${e.documentos} documento${e.documentos === 1 ? '' : 's'}`
      : '',
  sin_evidencia: () => 'No encontré fuentes para esto',
  redactando: () => 'Redactando',
}

const SUGERENCIAS = [
  '¿Qué notas tenés cargadas?',
  '¿Qué se acordó en la última reunión?',
  '¿Qué compromisos quedaron pendientes?',
]

export interface Conversacion {
  turnos: Turno[]
  etapa: string | null
  enviando: boolean
  enviar: (pregunta: string) => Promise<void>
  reiniciar: () => void
}

export function useConversacion(scope: Scope | null): Conversacion {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [etapa, setEtapa] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const conversationId = useRef<string | null>(null)

  // Cambiar de espacio es cambiar de corpus: la conversación anterior no
  // puede seguir, porque sus fuentes son de otro espacio.
  useEffect(() => {
    setTurnos([])
    setEtapa(null)
    conversationId.current = null
  }, [scope?.tenantId, scope?.purposeId])

  const enviar = useCallback(
    async (contenido: string) => {
      const pregunta = contenido.trim()
      if (!pregunta || enviando || !scope) return

      setEnviando(true)
      setEtapa(null)
      setTurnos((t) => [...t, { id: crypto.randomUUID(), rol: 'usuario', texto: pregunta }])

      const fallar = (texto: string): void => {
        setEtapa(null)
        setTurnos((t) => [...t, { id: crypto.randomUUID(), rol: 'error', texto, pregunta }])
      }

      try {
        if (!conversationId.current) {
          conversationId.current = (await api.crearConversacion(scope)).id
        }

        await preguntarEnVivo(scope, conversationId.current, pregunta, {
          onProgreso: (evento) => setEtapa(ETAPAS[evento.etapa](evento)),
          onRespuesta: (respuesta) => {
            setEtapa(null)
            setTurnos((t) => [
              ...t,
              {
                id: crypto.randomUUID(),
                rol: 'asistente',
                texto: respuesta.abstained ? respuesta.abstentionReason : respuesta.answer,
                respuesta,
                revelando: true,
              },
            ])
          },
          onError: (mensaje, codigo) =>
            // Saturación: del proveedor del modelo o de nuestro propio
            // limitador, el callback no distingue cuál. El genérico
            // ("Demasiadas solicitudes") suena a que quien pregunta hizo algo
            // mal; este texto es cierto en los dos casos.
            fallar(
              codigo === 'RATE_LIMITED' || codigo === 'PROVIDER_UNAVAILABLE'
                ? 'SUMA no pudo responder ahora: hay mucha demanda. Probá de nuevo en unos segundos.'
                : mensaje,
            ),
        })
      } catch {
        fallar('Se interrumpió la conexión.')
      } finally {
        setEnviando(false)
      }
    },
    [enviando, scope],
  )

  const reiniciar = useCallback(() => {
    setTurnos([])
    setEtapa(null)
    conversationId.current = null
  }, [])

  return { turnos, etapa, enviando, enviar, reiniciar }
}

export function Chat({
  scope,
  conversacion,
  modo,
  onCerrar,
  onExpandir,
}: {
  scope: Scope
  conversacion: Conversacion
  modo: 'panel' | 'completa'
  onCerrar?: () => void
  onExpandir?: () => void
}): JSX.Element {
  const { turnos, etapa, enviando, enviar, reiniciar } = conversacion
  const [texto, setTexto] = useState('')
  const listaRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLTextAreaElement>(null)

  const puedeLeer = scope.permissions.includes('notes.read')

  // Bajar al último mensaje cuando llega algo nuevo.
  useEffect(() => {
    requestAnimationFrame(() => {
      listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [turnos.length, etapa])

  useEffect(() => {
    // El foco automático en el teléfono abre el teclado y tapa la pantalla
    // apenas se entra. Solo se enfoca en pantallas anchas.
    if (window.matchMedia('(min-width: 720px)').matches) campoRef.current?.focus()
  }, [])

  function ajustarAlto(el: HTMLTextAreaElement): void {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function mandar(contenido: string): void {
    if (!contenido.trim() || enviando) return
    setTexto('')
    if (campoRef.current) campoRef.current.style.height = 'auto'
    void enviar(contenido)
  }

  return (
    <section
      className={modo === 'panel' ? 'suma suma-panel' : 'suma suma-completa'}
      id="panel-suma"
      role={modo === 'panel' ? 'dialog' : undefined}
      aria-label="SUMA"
    >
      <header className="suma-cabecera">
        <span className="suma-sello" aria-hidden="true">
          <SimboloSuma />
        </span>
        <div className="suma-titulo">
          <strong>SUMA</strong>
          <span>Notas de reunión · {scope.tenantName}</span>
        </div>
        <div className="suma-acciones">
          {turnos.length > 0 && (
            <button type="button" className="boton fantasma" onClick={reiniciar}>
              Nueva
            </button>
          )}
          {onExpandir && (
            <button
              type="button"
              className="boton-icono"
              onClick={onExpandir}
              aria-label={modo === 'panel' ? 'Abrir en pantalla completa' : 'Volver al panel'}
              title={modo === 'panel' ? 'Pantalla completa' : 'Volver al panel'}
            >
              <Icono nombre={modo === 'panel' ? 'expandir' : 'contraer'} />
            </button>
          )}
          {onCerrar && (
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
              <Icono nombre="cerrar" />
            </button>
          )}
        </div>
      </header>

      <div className="suma-mensajes" ref={listaRef} aria-live="polite">
        <div className="suma-columna">
          {!puedeLeer && (
            <p className="aviso">Tu cuenta no tiene acceso a las notas de este espacio.</p>
          )}

          {puedeLeer && turnos.length === 0 && (
            <div className="suma-bienvenida">
              <h3>¿Qué querés saber?</h3>
              <p>
                Respondo sobre las notas de reunión y te muestro de qué documento sale cada dato.
                Si no lo encuentro, te lo digo.
              </p>
              <div className="suma-sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button key={s} type="button" onClick={() => mandar(s)} disabled={enviando}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turnos.map((turno) => (
            <Mensaje key={turno.id} turno={turno} onReintentar={mandar} enviando={enviando} />
          ))}

          {etapa && (
            <div className="suma-progreso">
              <span className="suma-pulso" aria-hidden="true" />
              <span key={etapa}>{etapa}</span>
            </div>
          )}
        </div>
      </div>

      <div className="suma-compositor">
        <div className="suma-columna">
          <div className="suma-campo">
            <textarea
              ref={campoRef}
              value={texto}
              rows={1}
              onChange={(e) => {
                setTexto(e.target.value)
                ajustarAlto(e.target)
              }}
              onKeyDown={(e) => {
                // Enter envía; Shift+Enter salta de línea. En el teléfono el
                // Enter del teclado virtual salta, no envía.
                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 720) {
                  e.preventDefault()
                  mandar(texto)
                }
              }}
              placeholder="Preguntale a SUMA…"
              aria-label="Tu pregunta"
              maxLength={8000}
              disabled={!puedeLeer || enviando}
            />
            <button
              type="button"
              className="suma-enviar"
              onClick={() => mandar(texto)}
              disabled={!puedeLeer || enviando || texto.trim().length === 0}
              aria-label="Enviar"
            >
              <Icono nombre="enviar" />
            </button>
          </div>
          <p className="suma-pie">Cada respuesta cita su fuente.</p>
        </div>
      </div>
    </section>
  )
}

/**
 * Revelado progresivo del texto ya validado. Es presentación, no streaming
 * del modelo: la respuesta completa ya llegó y sus citas ya se verificaron.
 */
function useRevelado(texto: string, activo: boolean): string {
  const [visible, setVisible] = useState(activo ? '' : texto)

  useEffect(() => {
    if (!activo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(texto)
      return undefined
    }

    let i = 0
    // Por bloques: a un carácter por cuadro, 600 caracteres tardarían 10 s.
    const paso = Math.max(2, Math.ceil(texto.length / 90))
    const id = setInterval(() => {
      i += paso
      setVisible(texto.slice(0, i))
      if (i >= texto.length) clearInterval(id)
    }, 16)

    return () => clearInterval(id)
  }, [texto, activo])

  return visible
}

function Mensaje({
  turno,
  onReintentar,
  enviando,
}: {
  turno: Turno
  onReintentar: (pregunta: string) => void
  enviando: boolean
}): JSX.Element {
  const respuesta = turno.respuesta
  const visible = useRevelado(turno.texto, turno.rol === 'asistente' && turno.revelando === true)
  const completo = visible.length >= turno.texto.length

  if (turno.rol === 'usuario') {
    return <div className="suma-usuario">{turno.texto}</div>
  }

  if (turno.rol === 'error') {
    return (
      <div className="suma-error">
        <span>{turno.texto}</span>
        {turno.pregunta && (
          <button
            type="button"
            className="boton fantasma"
            disabled={enviando}
            onClick={() => onReintentar(turno.pregunta!)}
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  // La abstención NO es un bloque de color: es texto atenuado con un filete.
  // Decir "no lo encontré" es una respuesta correcta, no una alarma.
  return (
    <div className={respuesta?.abstained ? 'suma-respuesta abstencion' : 'suma-respuesta'}>
      <p>
        {visible}
        {!completo && <span className="suma-cursor" />}
      </p>

      {/* Las fuentes aparecen recién cuando terminó el texto: si asomaran
          antes, la respuesta parecería respaldada mientras se escribe. */}
      {completo && respuesta && respuesta.sources.length > 0 && (
        <div className="suma-fuentes">
          {respuesta.sources.map((fuente) => (
            <details className="suma-fuente" key={fuente.chunkId}>
              <summary>
                <span className="nombre">{fuente.title}</span>
                <span className="fecha">
                  {/* No se inventa una fecha cuando el documento no la declara. */}
                  {fuente.meetingAt
                    ? new Date(fuente.meetingAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'sin fecha'}
                </span>
              </summary>
              <blockquote>{fuente.quote}</blockquote>
            </details>
          ))}
        </div>
      )}

      {completo && respuesta?.summaryOnly && (
        <p className="suma-nota">
          Basado en notas resumidas: no conservan necesariamente cada intervención.
        </p>
      )}
    </div>
  )
}
