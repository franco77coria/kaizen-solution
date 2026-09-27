# Lo que depende de vos

Todo lo que no está en esta lista ya está implementado, probado y corriendo en
local. Esto es lo único que no se puede resolver desde el código, porque son
cuentas, contratos y decisiones que te pertenecen.

Están ordenadas por lo que desbloquean. Podés hacer las de la sección 1 sin
tocar nada legal; la sección 3 es la que bloquea datos reales de personas.

---

## 1. Google Cloud: identidad y acceso a Drive

**Estado al 2026-09-20: los tres clientes OAuth ya existen y están cargados.**

Proyecto `boxwood-bee-509300-i5`, tres clientes con `client_id` distintos:

| Rol | Redirect URI | Dónde vive |
|---|---|---|
| Login | `/auth/callback` | `.env.google` |
| Lector | `/v1/google/callback` | `.env` |
| Ingestor | `/v1/source-connections/callback` | `.env` |

Lector e ingestor van en `.env` porque son **aditivos**: habilitan los botones
de conexión sin cambiar el login, así que se puede entrar con un usuario de
fixtures y vincular un Drive real. El login va aparte porque es **excluyente**:
al activarlo, los usuarios de fixtures dejan de poder entrar.

```bash
pnpm verify:drive     # comprueba los tres, y que no compartan client_id
```

Lo que queda de esta sección es la pantalla de consentimiento y las APIs.

### 1.1 Proyecto y pantalla de consentimiento

1. Usar el proyecto de Google Cloud indicado arriba.
2. Configurar la audiencia OAuth como **Interna**: por ahora solo entran
   cuentas del Workspace de `kaizensolutionscol.com`. Google limita esa
   audiencia a usuarios de la organización.
3. Habilitar las APIs **Google Drive API** y **Google Docs API**.

En el despliegue, configurar `OIDC_ALLOWED_HD=kaizensolutionscol.com`.
La API exige esa variable en producción, y el login comprueba el claim `hd`
del token de Google y el dominio del email verificado. Cargar un líder también
exige un email de Kaizen. La pertenencia al dominio por sí sola no concede
acceso: hace falta un registro
o una membresía autorizada.

Documentación de Google: [audiencia y estados OAuth](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview).

### Alta inicial para el despliegue

Aplicar las migraciones hasta `0023_registro_con_rol.sql` antes del primer
inicio de sesión. Con la conexión **de migración**, cargar el email verificado
del primer administrador en cada finalidad que vaya a administrar:

```sql
insert into leader_registry (tenant_id, purpose_id, email, display_name, rol)
values ('<TENANT_UUID>', '<PURPOSE_UUID>', '<EMAIL_EN_MINUSCULAS>', '<NOMBRE>', 'administrador');
```

La API solo puede cargar líderes. El administrador entra con esa cuenta de
Google y desde la pantalla **Líderes** registra las cuentas de Kaizen de su
equipo. Comprobar con una cuenta registrada y otra sin registrar: la primera
debe ver **Panorama** y **Sumar persona**, sin **SUMA**; la segunda no debe
entrar. Una cuenta Gmail debe quedar afuera incluso si hay un registro antiguo
para su email.

### 1.2 Tres clientes OAuth distintos

El plan exige identidades separadas. Crear **tres** IDs de cliente, no uno:

| Para qué | Redirect URI | Variables |
|---|---|---|
| Inicio de sesión | `https://TU-DOMINIO/auth/callback` | `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` |
| Lector de Drive | `https://TU-DOMINIO/v1/google/callback` | `GOOGLE_READER_CLIENT_ID`, `GOOGLE_READER_CLIENT_SECRET`, `GOOGLE_READER_REDIRECT_URI` |
| Ingestor de Drive | `https://TU-DOMINIO/v1/source-connections/callback` | `GOOGLE_INGESTOR_CLIENT_ID`, `GOOGLE_INGESTOR_CLIENT_SECRET`, `GOOGLE_INGESTOR_REDIRECT_URI` |

Para probar en local, usar `http://localhost:3001/...` en los tres.

### 1.3 Scopes

Empezar por `drive.meet.readonly`, que es el más acotado. Si las notas de
gerencia no vienen todas de Meet, el inventario lo va a mostrar y ahí se decide
si hace falta `drive.file` con selector, o `drive.readonly`.

**No amplíes el scope preventivamente.** Un scope restringido de más obliga a
un proceso de verificación que puede tardar semanas.

### 1.4 Canal de notificaciones (webhook)

Drive avisa los cambios por un canal push que hay que registrar y renovar
(caducan a la semana). El endpoint `POST /webhooks/drive` ya está implementado
y probado: valida el secreto del canal en tiempo constante y **no le cree al
cuerpo de la notificación** — solo la usa como señal para reconsultar.

Lo que falta de tu lado:

1. Un dominio con TLS accesible desde internet. Google no manda notificaciones
   a `localhost`.
2. Registrar el dominio como destino en la consola de Google Cloud.

Mientras no exista, la sincronización funciona igual por reconciliación
periódica: recorrer el manifiesto completo en vez de esperar avisos. Es más
lento pero no pierde cambios, que es la razón por la que existe de todas formas.

### 1.5 Comprobá la configuración antes de abrir el navegador

```bash
pnpm verify:drive
```

Te dice si faltan credenciales, si los redirect URIs están bien, y detecta el
error más caro de diagnosticar: **usar el mismo `client_id` para lector e
ingestor**. Si son el mismo, un token de ingesta sirve para responderle a
cualquiera y la comprobación de «este usuario todavía puede ver esta nota»
deja de existir.

Lo que ese script **no** puede comprobar es si Google acepta esos clientes.
Eso se sabe al pasar por la pantalla de consentimiento: entrá a la interfaz y
usá **«Conectar mi cuenta»** en la tarjeta de Google Drive.

### 1.6 Qué hay que verificar, no asumir

El conector de Drive está escrito **pero nunca se ejecutó contra Google**. Hay
un campo concreto que hay que comprobar con una reunión real: Drive no expone
una clave de reunión estable en `files`, así que hoy el conector la deja en
`null` y esos documentos se cuentan como «sin reunión identificada». Con una
reunión piloto se ve qué campo la trae de verdad.

---

## 2. Credencial de Gemini — VERIFICADA, pero sin facturación

**Probado contra el proveedor el 2026-09-20. La clave funciona.**

| Comprobación | Resultado |
|---|---|
| Formato del archivo | válido, una sola línea |
| Autenticación (`GET /v1beta/models`) | **HTTP 200**, 58 modelos visibles |
| `gemini-3.7-flash` disponible | **sí** |
| Generación con schema de salida | **funciona**, JSON válido |
| Chat completo con citas validadas | **funciona**, 2,3 s de extremo a extremo |

**El problema no es la credencial: es la cuota.** En pruebas repetidas, solo
**2 de cada 6** llamadas devolvían 200; el resto alternaba `429` (límite de
tasa) y `503` («high demand»). Eso es el comportamiento del nivel gratuito.

Se agregaron reintentos con espera exponencial y degradación (si la salida
estructurada está saturada, se reintenta sin schema y se parsea el texto; la
validación de citas corre igual). Con eso pasó de 2/6 a **3/3** en una tanda.
Pero los reintentos no crean cuota: bajo uso real se sigue agotando.

**Lo que falta: habilitar facturación** en el proyecto Google Cloud dueño de
esta clave. Sin eso el sistema funciona, pero se queda sin cuota con unas pocas
preguntas seguidas.

Para probarlo vos mismo:

```bash
pnpm verify:gemini
```

## 3. Tratamiento de datos personales — bloquea datos reales de personas

Esta sección no es técnica y es la que más tarda. Sin ella, la captura de
registros solo puede usarse con los fixtures sintéticos.

1. **Responsable del tratamiento** de cada organización o campaña: quién es,
   con nombre y NIT. Hoy la base dice literalmente
   `RESPONSABLE DE TRATAMIENTO PENDIENTE DE DEFINIR`.
2. **Texto del aviso de privacidad y del consentimiento**, con su versión. Se
   carga en `consent_texts`; el sistema guarda qué versión exacta se le mostró
   a cada persona.
3. **Finalidades declaradas**: para qué se van a usar los datos. El sistema
   separa finalidades y no deja mezclarlas, pero necesita que estén definidas.
4. **Región y condiciones de tratamiento** para Colombia: dónde se procesa,
   dónde se guardan los respaldos, cuánto se retiene y qué excepciones
   aplican. Esto condiciona dónde se despliega.

Hasta que esto esté, `LLM_PROVIDER` y `SOURCE_PROVIDER` pueden quedar en modo
local y todo el desarrollo sigue.

---

## 4. Cartografía de los 116 municipios

El catálogo de nombres y códigos ya está cargado, pero **transcrito**, no
verificado contra la fuente primaria. Y no hay geometrías.

1. Descargar el archivo DIVIPOLA oficial del DANE y cotejar:

```bash
pnpm geo:verify ruta/al/divipola.csv
```

Falla si hay **una sola** diferencia de código o nombre.

2. Descargar los límites municipales oficiales en GeoJSON (EPSG:4326) y
   cargarlos:

```bash
pnpm geo:load ruta/al/municipios.geojson divipola-2026 "DANE - Marco geoestadístico" "https://..."
```

Si falta la geometría de algún municipio, la versión queda en `draft` y los
mapas **declaran la ausencia** en vez de dibujar formas aproximadas. Eso es
deliberado.

**Barrios y veredas:** no hay una fuente nacional consistente. Hasta que
aparezca una verificada para los municipios que importen, no hay capa de
barrios, y el sistema no la simula.

---

## 5. Infraestructura, cuando llegue el momento de desplegar

Nada de esto hace falta para desarrollar.

- **PostgreSQL real** con pgvector (Cloud SQL o equivalente). En local se usa
  PGlite, que es PostgreSQL 18 de verdad pero con un solo backend: la prueba de
  carga de 126 consultas simultáneas **no se puede hacer en local** (ADR 0006).
- **Secretos** en un gestor, no en archivos. Generar con `node scripts/gen-secret.mjs`:
  `SESSION_SECRET` y `TOKEN_VAULT_KEY` (32 bytes cada uno).
- **Redis** para el limitador distribuido. Sin él, el limitador local sigue
  funcionando y es más estricto: nunca queda abierto.
- **TLS** y `APP_ENV=production`. Con eso la app exige `OIDC_*`,
  `TOKEN_VAULT_KEY`, cookies `secure` y rechaza el proveedor de identidad de
  desarrollo.
- **Roles de base separados**: crear `kaizen_app`, `kaizen_worker` y
  `kaizen_auth` con contraseña propia y darles LOGIN. Las migraciones corren
  con un rol distinto, dueño del esquema.
- **Una fuente tipográfica versionada** en `CHART_FONT_FILE`. Sin ella, los
  PNG usan las fuentes del sistema y salen distintos en cada máquina.
