import { useEffect, useRef, useState } from 'react'
import { CUNDINAMARCA_PROVINCES, displayName, provinceOf } from '@kaizen/geography'
import { ApiError, api, type DatosFormulario, type Scope } from './api'
import { GENEROS, RELACIONES } from './etiquetas'
import { SimboloSuma } from './Marca'
import { Enlace } from './rutas'

/**
 * Sumar una persona.
 *
 * Decisiones que no son de estilo:
 *
 * 1. El consentimiento se muestra COMPLETO y la casilla arranca vacía. Es el
 *    texto exacto de la versión vigente el que queda guardado con el registro.
 *
 * 2. El botón no se habilita sin la casilla, pero eso es comodidad: el control
 *    real es del servidor, que exige `consentGiven: true` literal.
 *
 * 3. Quien suma es la cuenta que carga: no se elige ni se tipea un líder, así
 *    que nadie puede sumar personas a nombre de otro.
 *
 * 4. El municipio se elige con el selector NATIVO agrupado por provincia, no
 *    con un buscador propio. La captura se hace en la calle, en el teléfono, y
 *    el selector del sistema es mejor que cualquier lista armada a mano; en
 *    escritorio igual permite escribir para saltar. La base además rechaza un
 *    código que no esté en el catálogo: el formulario no es el control.
 */

const ANIO_ACTUAL = new Date().getFullYear()

interface Campos {
  fullName: string
  documentNumber: string
  municipalityCode: string
  birthYear: string
  phone: string
  gender: string
  relationship: string
  /** '' hasta que se elige: no se asume ni sí ni no. */
  usesWhatsapp: '' | 'si' | 'no'
  occupation: string
  evidenceKind: string
  evidenceRef: string
}

const VACIO: Campos = {
  fullName: '',
  documentNumber: '',
  municipalityCode: '',
  birthYear: '',
  phone: '',
  gender: '',
  relationship: '',
  usesWhatsapp: '',
  occupation: '',
  evidenceKind: '',
  evidenceRef: '',
}

const PROVINCIAS = [...CUNDINAMARCA_PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'es'))

interface Resultado {
  nombre: string
  municipio: string
  enviado: boolean
}

export function Sumar({ scope }: { scope: Scope }): JSX.Element {
  const [form, setForm] = useState<DatosFormulario | null>(null)
  const [campos, setCampos] = useState<Campos>(VACIO)
  const [consiente, setConsiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const primerCampo = useRef<HTMLInputElement>(null)

  const puedeSumar = scope.permissions.includes('records.capture')

  useEffect(() => {
    if (!puedeSumar) {
      setCargando(false)
      return
    }
    void (async () => {
      setCargando(true)
      try {
        setForm(await api.formulario(scope))
        setError(null)
      } catch (e) {
        setForm(null)
        setError(
          e instanceof ApiError && e.status === 404
            ? 'Todavía no hay un texto de consentimiento vigente para este espacio. Sin él no se puede sumar a nadie: hay que cargarlo primero.'
            : 'No se pudo cargar el formulario.',
        )
      } finally {
        setCargando(false)
      }
    })()
  }, [scope, puedeSumar])

  const set = (k: keyof Campos) => (e: { target: { value: string } }) =>
    setCampos((c) => ({ ...c, [k]: e.target.value }))

  const completo =
    campos.fullName.trim().length > 2 &&
    campos.documentNumber.trim().length > 3 &&
    campos.municipalityCode !== '' &&
    campos.gender !== '' &&
    campos.relationship !== '' &&
    campos.usesWhatsapp !== '' &&
    campos.evidenceKind !== '' &&
    campos.evidenceRef.trim() !== '' &&
    consiente

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form || !completo || enviando) return

    setEnviando(true)
    setError(null)
    try {
      const anio = campos.birthYear.trim()
      const r = await api.capturar(scope, {
        fullName: campos.fullName.trim(),
        documentNumber: campos.documentNumber.trim(),
        municipalityCode: campos.municipalityCode,
        ...(anio ? { birthYear: Number(anio) } : {}),
        ...(campos.phone.trim() ? { phone: campos.phone.trim() } : {}),
        gender: campos.gender,
        relationship: campos.relationship,
        usesWhatsapp: campos.usesWhatsapp === 'si',
        ...(campos.occupation.trim() ? { occupation: campos.occupation.trim() } : {}),
        consentTextVersion: form.consentimiento.version,
        evidenceKind: campos.evidenceKind,
        evidenceRef: campos.evidenceRef.trim(),
      })

      // El alta deja el registro en `draft`, que todavía NO cuenta. Enviarlo es
      // un paso aparte del servidor porque vuelve a comprobar que el
      // consentimiento siga vigente; al enviarlo pasa a contar en el panorama.
      // La pantalla encadena los dos pasos: un borrador olvidado no suma.
      let enviado = true
      try {
        await api.enviarARevision(scope, r.id)
      } catch {
        enviado = false
      }

      setResultado({
        nombre: campos.fullName.trim().split(/\s+/)[0] ?? '',
        municipio: displayName(campos.municipalityCode),
        enviado,
      })

      // Se limpia todo, incluida la casilla: el consentimiento es de una
      // persona, no del operador. Dejarla marcada para la siguiente carga es
      // como se termina registrando un consentimiento que nadie dio.
      setCampos(VACIO)
      setConsiente(false)
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'CONFLICT'
          ? 'Esa persona ya está sumada en este espacio: hay otro registro con el mismo documento.'
          : e instanceof Error
            ? e.message
            : 'No se pudo guardar.',
      )
    } finally {
      setEnviando(false)
    }
  }

  function otra(): void {
    setResultado(null)
    requestAnimationFrame(() => primerCampo.current?.focus())
  }

  if (!puedeSumar) {
    return (
      <div className="vacio">
        <strong>Tu cuenta no puede sumar personas en este espacio.</strong>
        <span>Pedile a quien administra el espacio el permiso de captura.</span>
      </div>
    )
  }

  if (cargando) return <div className="cargando">Cargando…</div>

  if (resultado) {
    return (
      <div className="sumada" role="status">
        <span className="sumada-sello" aria-hidden="true">
          <SimboloSuma />
        </span>
        {/* Sin género: el nombre no dice cómo se identifica la persona. */}
        <h1>
          {resultado.nombre} se sumó en {resultado.municipio}
        </h1>
        <p className="tenue">
          {resultado.enviado
            ? 'Ya cuenta en el panorama, a tu nombre.'
            : 'El registro quedó como borrador y todavía no cuenta. Avisale a quien administra.'}
        </p>
        <div className="sumada-acciones">
          <button type="button" className="boton primario grande" onClick={otra}>
            Sumar otra persona
          </button>
          <Enlace a="panorama" className="boton grande">
            Ver el panorama
          </Enlace>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="pagina-angosta">
        <h1 className="pagina-titulo">Sumar persona</h1>
        <p className="aviso error">{error ?? 'El formulario no está disponible.'}</p>
      </div>
    )
  }

  const provincia = campos.municipalityCode ? provinceOf(campos.municipalityCode) : null

  return (
    <div className="pagina-angosta">
      <header className="pagina-cabecera">
        <h1 className="pagina-titulo">Sumar persona</h1>
        <p className="tenue">
          Aparece en el panorama apenas la sumás. Queda a tu nombre.
        </p>
      </header>

      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={enviar} className="formulario">
        <fieldset className="bloque">
          <legend>La persona</legend>
          <div className="campos">
            <label className="campo ancho">
              <span>Nombre completo</span>
              <input
                ref={primerCampo}
                className="entrada"
                value={campos.fullName}
                onChange={set('fullName')}
                autoComplete="off"
                required
              />
            </label>
            <label className="campo">
              <span>Documento</span>
              <input
                className="entrada"
                value={campos.documentNumber}
                onChange={set('documentNumber')}
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </label>
            <label className="campo">
              <span>
                Año de nacimiento <em>opcional</em>
              </span>
              <input
                className="entrada"
                value={campos.birthYear}
                onChange={set('birthYear')}
                inputMode="numeric"
                type="number"
                min={1900}
                max={ANIO_ACTUAL}
              />
            </label>
            <label className="campo">
              <span>Género</span>
              <select className="entrada" value={campos.gender} onChange={set('gender')} required>
                <option value="">Elegí</option>
                {GENEROS.map(([v, etiqueta]) => (
                  <option key={v} value={v}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>
                Ocupación <em>opcional</em>
              </span>
              <input
                className="entrada"
                value={campos.occupation}
                onChange={set('occupation')}
                maxLength={80}
                placeholder="¿A qué se dedica?"
                autoComplete="off"
              />
            </label>
            <label className="campo">
              <span>
                Celular <em>opcional</em>
              </span>
              <input
                className="entrada"
                value={campos.phone}
                onChange={set('phone')}
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <div className="campo">
              <span id="etiqueta-whatsapp">¿Usa WhatsApp?</span>
              <div className="segmentos" role="radiogroup" aria-labelledby="etiqueta-whatsapp">
                {(['si', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={campos.usesWhatsapp === v}
                    className={campos.usesWhatsapp === v ? 'segmento activo' : 'segmento'}
                    onClick={() => setCampos((c) => ({ ...c, usesWhatsapp: v }))}
                  >
                    {v === 'si' ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="bloque">
          <legend>Vínculo</legend>
          <label className="campo">
            <span>Relación con quien la suma</span>
            <select
              className="entrada"
              value={campos.relationship}
              onChange={set('relationship')}
              required
            >
              <option value="">Elegí</option>
              {RELACIONES.map(([v, etiqueta]) => (
                <option key={v} value={v}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="bloque">
          <legend>Dónde</legend>
          <label className="campo">
            <span>Municipio</span>
            <select
              className="entrada"
              value={campos.municipalityCode}
              onChange={set('municipalityCode')}
              required
            >
              <option value="">Elegí un municipio</option>
              {PROVINCIAS.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  {[...p.municipalityCodes]
                    .sort((a, b) => displayName(a).localeCompare(displayName(b), 'es'))
                    .map((code) => (
                      <option key={code} value={code}>
                        {displayName(code)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {provincia && <p className="mas-tenue pista">Provincia de {provincia.name}</p>}
        </fieldset>

        <fieldset className="bloque">
          <legend>Consentimiento</legend>
          <div className="consentimiento-texto" tabIndex={0}>
            {form.consentimiento.texto}
          </div>
          <p className="mas-tenue pista">
            Versión {form.consentimiento.version} · Responsable: {form.consentimiento.responsable}
          </p>

          <div className="campos">
            <label className="campo">
              <span>Cómo lo dio</span>
              <select
                className="entrada"
                value={campos.evidenceKind}
                onChange={set('evidenceKind')}
                required
              >
                <option value="">Elegí</option>
                {form.evidencias.map((ev) => (
                  <option key={ev.valor} value={ev.valor}>
                    {ev.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Referencia</span>
              <input
                className="entrada"
                value={campos.evidenceRef}
                onChange={set('evidenceRef')}
                placeholder="Acta, planilla o enlace"
                required
              />
            </label>
          </div>

          <label className="casilla">
            <input
              type="checkbox"
              checked={consiente}
              onChange={(e) => setConsiente(e.target.checked)}
            />
            <span>La persona leyó este texto y autorizó el tratamiento de sus datos.</span>
          </label>
        </fieldset>

        <div className="formulario-pie">
          <button type="submit" className="boton primario grande" disabled={!completo || enviando}>
            {enviando ? 'Sumando…' : 'Sumar persona'}
          </button>
          {!completo && (
            <span className="mas-tenue">
              {consiente ? 'Faltan datos obligatorios.' : 'Falta marcar el consentimiento.'}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
