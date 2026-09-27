# Estado de la implementación, ticket por ticket

Fecha: 2026-09-21. Plan de referencia: v1.5, sección 17.

Cómo leer la columna **Estado**:

- **Verificado** — implementado y probado con pruebas que fallarían si se rompe.
- **Implementado, sin verificar contra el proveedor** — el código existe y
  compila, pero nunca se ejecutó contra el servicio real porque falta la
  credencial. No cuenta como terminado.
- **Parcial** — falta una parte concreta, indicada.
- **Bloqueado** — depende de una entrada externa. Ver
  `runbooks/configuracion-externa.md`.

Nada de lo que sigue afirma haber probado un servicio que no se ejecutó.

## Etapa A — Base y pruebas sintéticas

| ID | Estado | Evidencia |
|---|---|---|
| 00 | Verificado | 6 ADR en `adr/`; fixtures de dos alcaldías con canarios en `evals/fixtures` |
| 01 | Verificado | Monorepo pnpm, tipos estrictos, `pnpm check` en verde, CI en `.github/workflows/ci.yml`, `.env.example` sin valores |
| 02 | Verificado | 12 migraciones; 39 tablas con RLS **forzada**; `tests/security/aislamiento.test.ts` y `roles.test.ts` (25 pruebas) |
| 03 | Parcial | Sesiones de servidor, invitación de un solo uso, logout con revocación real y suspensión: verificado. El proveedor **Google** OIDC está escrito y sin ejecutar (falta proyecto). El proveedor local sí se ejercita end to end |
| 04 | Verificado | `resolveScope` + `purpose_grants`; aislamiento A/B **y** de dos finalidades del mismo tenant, bajo 30 transacciones concurrentes |
| 05 | Verificado (salvo el canje con Google) | Flujo OAuth completo: `/v1/google/{connect,callback}`, `DELETE /v1/google/connection`, `/v1/source-connections/{connect,callback}` y su `DELETE`. Vault AES-256-GCM, PKCE, `state` en cookie, renovación automática de tokens y revocación **en Google**. 15 pruebas de control de acceso. El canje de código contra Google no se ejecutó: requiere el proyecto OAuth |
| 06 | Verificado | Deduplicación por archivo destino, clasificación con nivel de confianza, identidad canónica de reunión. `tests/integration/ingesta.test.ts` |
| 07 | Verificado (con fixtures) | Outbox, cursor, generación de conexión y **webhook** con identidad propia `kaizen_webhook` que solo traduce un canal y encola una reconciliación. 7 pruebas de seguridad. El registro del canal contra Drive real no se ejecutó |
| 08 | Verificado | Parser con pestañas y tablas, hash de contenido, extracción incompleta declarada |
| 09 | Verificado | Jobs con lease, publicación atómica, idempotencia por hash, mensajes fuera de orden descartados |
| 10 | Verificado | Segmentación estructural con solape; adaptador de embeddings con dimensión validada |
| 11 | Verificado | Búsqueda híbrida exacta + textual + vectorial con RRF. `tests/integration/recuperacion.test.ts` |
| 12 | Verificado | Comprobación de vigencia antes del modelo; una fuente revocada nunca llega al LLM |
| 13 | **Verificado contra el proveedor real** | Contrato JSON, prompt versionado y validador de citas (11 pruebas). El adaptador Gemini se ejecutó contra el modelo real y devolvió respuesta fundamentada con cita válida. Reintentos con espera y degradación sin schema. **La cuota gratuita se agota por modelo:** `gemini-3.7-flash` quedó en 429 mientras otros modelos de la misma clave respondían 200; el proyecto corre hoy con `gemini-3.8-flash`. Para producción hace falta plan pago |
| 14 | Verificado | Historial autorizado, idempotencia con reproducción fiel, `authz_version` que invalida el reuso |
| 15 | Verificado | Admisión con limitador local **siempre activo** y contingencia más estricta si falla el distribuido; cortocircuito por proveedor |
| 16 | Verificado | Navegación entre Resumen, Analítica, Captura y Revisión; chat accesible, botón Kaizen 64/56 px. XSS bloqueado, Escape devuelve el foco. Mobile-first comprobado a 375 px: sin scroll horizontal en ninguna sección |

## Etapa C y D — Analítica, captura y visualización

| ID | Estado | Evidencia |
|---|---|---|
| 17a | Verificado | Modelo de personas, consentimiento versionado con su texto, referidos. Responsable de tratamiento **pendiente de definir** (bloqueo declarado en la propia base) |
| 17a.1 | Verificado | Check no premarcado (`literal(true)`), operador ≠ titular, autoaprobación bloqueada **por trigger**, retiro concurrente prevalece. 7 pruebas contra la base |
| 17a.2 | Verificado | **Pantallas de captura y revisión.** El formulario muestra el texto de consentimiento completo con su versión y encadena alta + envío a revisión, porque un borrador que nadie envía no lo revisa nadie. La cola muestra los registros propios del revisor marcados como no decidibles en vez de ocultarlos: una fila que desaparece se lee como «ya lo revisaron». 5 pruebas en `tests/security/formulario.test.ts` |
| 17b | Verificado | Catálogo de 6 plantillas, timeout y límite de filas por consulta |
| 17b.1 | Verificado | QueryPlan cerrado → SQL estable con valores enlazados. 14 pruebas con payloads de inyección |
| 17b.3 | Verificado | **Filtros del tablero**: municipio, franja etaria, estado, consentimiento y mes. Salen de la misma lista blanca que acepta el servidor, así que la pantalla no ofrece nada que vaya a rebotar. El total también se filtra: una cifra grande sin filtrar encima de una gráfica filtrada es la que alguien cita en una reunión. 4 pruebas de que el filtro **efectivamente filtra** — un filtro ignorado devuelve el total y parece correcto |
| 17d.3 | Verificado | **Lectura territorial** de los 116 municipios en cuadrícula, con cuatro escalones de intensidad. Muestra los municipios en CERO, que una gráfica de barras no dibuja: en un sistema cuyo objetivo es cubrir los 116, el vacío es el dato. **No es un mapa a propósito**: sin geometrías oficiales, unos límites aproximados se leerían como autoridad |
| 17b.2 | Verificado | **Pantalla de analítica**: cinco vistas agregadas más el total. Un grupo suprimido se dibuja con trama y «n/d», con altura fija y no proporcional — una barra en cero afirmaría «no hay nadie» donde el dato dice «hay pocos y no se puede precisar» |
| 17c | Parcial | Supresión con complemento, epoch de privacidad y ruta nominal separada: verificado. Falta el flujo de **publicación revisada** de releases |
| 17d | Verificado | ChartSpec cerrado, PNG autenticado sin CDN, tabla accesible y Markdown protegido |
| 17d.1 | Parcial | Los 116 municipios con invariantes comprobadas al cargar el módulo. **Los códigos están transcritos, no cotejados** contra DIVIPOLA: `pnpm geo:verify` lo hace. Sin geometrías |
| 17d.2 | Implementado, sin cartografía | Proyección, colores, leyenda y control de colisiones escritos. Sin geometrías oficiales el mapa **declara la ausencia** en vez de dibujar |
| 17e | Verificado | Guardar, compartir con ACL, revocar, borrar y **refrescar**. Un destinatario de una compartición no puede refrescar: ejecutaría con permisos ajenos |
| 17f | Verificado | Enrutador **determinista** (regla, no decisión del modelo) entre notas y analítica. Un conteo nunca se contesta con una cifra sacada de un acta. Bloquea inferencia de preferencia política. 14 pruebas |

## Etapa E — Validación y ampliación

| ID | Estado | Motivo |
|---|---|---|
| 18 | Parcial | **262 pruebas en verde**, incluidas las adversariales. **La carga de 126 consultas simultáneas no se puede hacer en local** (ADR 0006): PGlite tiene un solo backend. Lo que sí se corrigió en el camino: el tamaño de pool es **por identidad de servicio**, y con cuatro identidades la suma superaba el techo del servidor — el síntoma era un `ECONNRESET` que parecía de red |
| 19 | No implementado | IaC, IAM, backups y ensayo de restore. Depende del proveedor y la región elegidos |
| 20 | No aplicable todavía | Revisión independiente y piloto con cuentas reales |
| 21 | No aplicable todavía | Rollout por lotes a los 116 municipios |

## Piloto de la sección 21

| ID | Estado |
|---|---|
| P1 | Preparado: tenant `internal_pilot` con municipio nulo, propósito propio, invitación de un solo uso para `gerencia@kaizensolutionscol.com` y permisos exactos del plan. **Falta el OAuth real** |
| P2 a P5 | Ejercitados de punta a punta con el proveedor de fixtures, incluidos accesos directos, títulos repetidos, documento multipestaña, papelera y pérdida de acceso. **Con Drive real, no** |
| P6 | Pendiente: no hay datos reales que reportar. Plantilla en `pilot/report.md` |
