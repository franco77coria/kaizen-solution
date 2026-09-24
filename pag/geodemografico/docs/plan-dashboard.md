# Plan: dashboard geodemográfico y captura por formulario

Fecha: 2026-09-21. Basado en `geodemografico/`, `Formulario ahora/` y
`formulario dash rojo/`.

El chat es el frente; esto es el trasfondo. La decisión de fondo: **no migrar
el código viejo, sí migrar lo que aprendió.** Apps Script sobre Sheets no
aguanta 1000 personas simultáneas, y el modelo de datos de la planilla no
distingue consentimiento de apoyo.

## Lo que ya está construido y sirve tal cual

Más de la mitad del trasfondo existe y está probado:

| Pieza | Estado |
|---|---|
| Modelo de personas con consentimiento versionado | `person_records`, `consent_texts`, `consent_records` |
| Captura con revisión por rol distinto | `POST /v1/capture/records` + `/submit` + `/review` |
| Retiro de consentimiento que prevalece | trigger en la base, 7 pruebas |
| Analítica agregada por municipio, edad, mes, estado | 6 plantillas, `POST /v1/analytics/runs` |
| Supresión por umbral de anonimato | grupos chicos salen `n/d`, nunca 0 |
| Gráficas de barras, líneas, tabla | PNG autenticado + tabla accesible |
| Mapa coroplético | implementado; espera geometrías oficiales |
| Catálogo de 116 municipios | cargado, pendiente de cotejo con DIVIPOLA |

**Lo que falta es la pantalla, no el motor.**

## Diferencias con el sistema viejo que no son negociables

Estas no son mejoras opcionales: son la razón de rehacerlo.

1. **Contraseñas en una columna de la planilla** (`ADMINISTRADORES.CONTRASEÑA`).
   Cualquiera con acceso a la hoja las ve. El nuevo sistema usa Google OIDC:
   no hay contraseñas que custodiar.

2. **Teléfono y email sin consentimiento registrado.** La planilla guarda datos
   de contacto sin rastro de qué se le dijo a la persona ni cuándo aceptó. El
   nuevo modelo exige texto de consentimiento versionado y guarda cuál se
   mostró. Sin eso, la captura no se habilita.

3. **Cifras exactas de grupos chicos.** Un municipio con 2 personas las expone.
   La supresión ya está implementada y no se puede desactivar desde la interfaz.

4. **Sin separación entre espacios.** La planilla es una sola. El nuevo sistema
   aísla por alcaldía con RLS forzada.

## Lo que hay que construir

### Fase 1 — Formulario de captura (1 pantalla)

Lo que el backend ya espera: nombre, documento, municipio, año de nacimiento,
teléfono, y **consentimiento explícito con su versión y evidencia**.

- Check **no premarcado**. El schema exige `literal(true)`: mandarlo en false
  o no mandarlo es un error de validación, no un silencio.
- Selector de municipio contra el catálogo de 116, no texto libre.
- Evidencia: firma digital, formulario en papel o registro verbal.
- Funciona en móvil: la captura se hace en la calle, no en un escritorio.
- Del proyecto viejo se rescata la captura de fotos como evidencia
  (`fotoCam`, `fotoSen` en `Formulariomesas.html`).

### Fase 2 — Dashboard (1 pantalla)

- Tarjetas de totales y una grilla de gráficas.
- Filtros por municipio, franja etaria, mes y estado — los que las plantillas
  ya admiten. **Nada de filtros libres.**
- Mapa coroplético de Cundinamarca cuando haya geometrías.
- Cada gráfica con su tabla accesible al lado, no escondida.

### Fase 3 — Revisión

Cola de registros enviados, con el detalle y los botones de aprobar/rechazar.
El backend ya impide que quien capturó revise lo suyo.

### Fase 4 — Jerarquía territorial

El sistema viejo maneja `DEPARTAMENTO / PROVINCIA / MUNICIPIO`. Hoy el catálogo
solo tiene municipio. Hay que agregar la provincia (el `getProvinciaMap()` del
código viejo tiene el mapeo) para poder agrupar como ellos ya lo hacen.

## Escala: 1000+ personas simultáneas

Lo que hay que hacer, en orden de impacto:

1. **PostgreSQL real.** PGlite tiene un solo backend. Es el techo duro.
2. **Índices de agregación**: `(tenant_id, purpose_id, municipality_code, status)`.
   Sin eso, cada gráfica recorre la tabla entera.
3. **Cachear las ejecuciones analíticas.** Ya se guardan en `analytics_runs`
   con su `privacy_epoch`: mil personas mirando el mismo dashboard pueden
   compartir una ejecución, y el epoch garantiza que nadie vea datos
   invalidados por un retiro de consentimiento.
4. **Redis** para el limitador distribuido. Sin él, el local es más estricto —
   correcto, pero pesimista con muchas instancias.
5. **La captura escribe, el dashboard lee.** Son perfiles de carga opuestos;
   conviene medirlos por separado antes de dimensionar.

**Lo que NO hay que hacer:** optimizar antes de medir. La prueba de 126
consultas simultáneas del plan original sigue pendiente y es el primer dato
real que va a existir.

## Diseño

El sistema viejo es rojo `#DC2626` saturado, con acentos verdes y azules
mezclados. Lee como alarma permanente.

Dirección propuesta:

- **Una sola familia cromática** de acento, con grises cálidos de base. El
  color se reserva para el dato, no para el marco.
- El rojo **solo** para errores y destructivo. Si todo es rojo, nada urge.
- Escalas de color de las gráficas con corrección de contraste: un valor sobre
  un tono oscuro necesita texto claro, y al revés. El paquete de
  visualizaciones ya tiene el par `scale`/`ink` para esto.
- Transiciones de 120–180 ms en lo que aparece y desaparece; nada que se mueva
  solo. Respetar `prefers-reduced-motion`.
- Densidad: el dashboard es para mirar de un vistazo en una reunión. Menos
  tarjetas, más grandes.

## Orden sugerido

1. Formulario (Fase 1). Es lo que genera los datos; sin datos el dashboard no
   tiene qué mostrar.
2. Provincia en el catálogo (Fase 4). Barato y desbloquea el agrupamiento que
   ya usan.
3. Dashboard (Fase 2).
4. Revisión (Fase 3).
5. Cartografía y mapa, cuando estén las geometrías oficiales.

## Lo que no se migra

- El backend de Apps Script. No escala y mezcla lectura, autenticación y
  presentación en el mismo archivo.
- El esquema de la planilla. Los campos se conservan; la estructura no.
- La autenticación por contraseña en hoja de cálculo.
