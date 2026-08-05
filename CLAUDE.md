# CLAUDE.md — Instrucciones globales de trabajo

Este archivo aplica a **todos los proyectos** del workspace.
Claude debe leerlo al inicio de cada sesión y actualizarlo cuando detecte patrones nuevos.

---

## Proyectos activos

| Carpeta | Descripción | Stack |
|---|---|---|
| `Panel-Leonardo/` | Sistema de gestión para Papelera Leo | Next.js + Prisma + Supabase + Vercel |
| `whatsapp-api/` | Plataforma de campañas WhatsApp + CRM | Next.js + Supabase + Meta API |
| `TheriVerse/` | App móvil | React Native + Expo |
| `turnospro/` | Sistema de turnos | Next.js + Supabase |
| `jf-digitalstudio/` | Sitio web estudio digital | — |
| `geodemografico/` | Herramienta geodemográfica | Google Apps Script |
| `formulario dash rojo/` | Formulario dashboard | Google Apps Script |
| `renovacion-marcha/` | Sitio político | — |
| `appscript/` | Scripts de Google Apps | Google Apps Script |

---

## Flujo de trabajo obligatorio

### 1. Antes de tocar código — PLANIFICAR
- Para cualquier tarea no trivial (3+ pasos o decisiones de arquitectura): **usar plan mode**
- Si algo sale mal a mitad, PARAR y re-planificar — no seguir empujando
- Escribir specs detalladas antes de implementar para reducir ambigüedad

### 2. Estrategia de subagentes
- Usar subagentes para mantener el contexto principal limpio
- Delegar investigación, exploración de código y análisis paralelo a subagentes
- Un subagente = una tarea focalizada

### 3. Verificación antes de dar por terminado
- Nunca marcar una tarea como completa sin probar que funciona
- Comparar comportamiento entre `main` y los cambios cuando sea relevante
- Preguntarse: "¿Aprobaría esto un dev senior?"
- Correr tests, revisar logs, demostrar que funciona

### 4. Elegancia (balanceada)
- Para cambios no triviales: pausar y preguntar "¿hay una forma más elegante?"
- Si un fix se siente hacky → buscar la solución real
- Para fixes obvios y simples → no sobre-ingeniería
- No agregar complejidad para requisitos hipotéticos futuros

### 5. Bug fixing autónomo
- Ante un bug report: **simplemente arreglarlo**
- Señalar logs, errores, tests fallidos — luego resolverlos
- No pedir orientación para problemas que se pueden diagnosticar solos

---

## Principios core

- **Simplicidad primero:** Cada cambio debe ser lo más simple posible. Impacto mínimo en el código.
- **Sin pereza:** Encontrar causas raíz. Sin fixes temporales. Estándares de dev senior.
- **Impacto mínimo:** Los cambios solo deben tocar lo necesario. No introducir bugs nuevos.
- **No over-engineering:** Tres líneas similares son mejor que una abstracción prematura.
- **No crear archivos innecesarios:** Preferir editar existentes. No crear docs/README salvo que se pida.

---

## Errores recurrentes — Lecciones aprendidas

> Esta sección se actualiza cada vez que se corrige un error nuevo o se detecta un patrón repetido.

### Vercel / Deploy

| # | Error | Causa | Solución |
|---|---|---|---|
| 1 | Build falla en Vercel pero funciona local | TypeScript más estricto en build, o variables de entorno faltantes | Correr `npm run build` local antes de pushear. Revisar que todas las env vars estén en Vercel. |
| 2 | Rutas GET devuelven datos cacheados (datos viejos) | Vercel CDN cachea rutas GET por defecto | Agregar `export const dynamic = 'force-dynamic'` en rutas que devuelven datos dinámicos |
| 3 | Error al parsear arrays/objetos que vienen como string | Vercel serializa diferente a dev local | Siempre parsear con `JSON.parse()` o validar el tipo antes de usar |

### Next.js / API Routes

| # | Error | Causa | Solución |
|---|---|---|---|
| 4 | API route no encontrada en producción | Estructura de carpetas incorrecta en App Router | Verificar: `app/api/[recurso]/route.ts` (no `pages/api`) |
| 5 | Parámetros de template con count mismatch | No se mapean todos los parámetros, quedan vacíos | Llenar parámetros faltantes con fallback antes de enviar |
| 6 | Token de WhatsApp API no descifra correctamente | Encriptación/desencriptación inconsistente entre rutas | Centralizar la lógica de decrypt en una sola función utilitaria |
| 7b | `+` en teléfono se pierde en URL query string | `+` en query params se decodifica como espacio | Usar `encodeURIComponent(phone)` al construir URLs con números de teléfono |
| 25 | **Next 16:** `middleware.ts` no se ejecuta | Se renombró a **`proxy.ts`** (misma API, export `proxy`), y ahora corre en runtime **Node**, no Edge | Renombrar el archivo, al lado de `app/`. Ventaja: las libs que no andaban en Edge ahora sí |
| 26 | **Next 16:** la clave `eslint` en `next.config.ts` tira error de tipos | Se eliminó: `next build` ya no corre ESLint | Sacarla del config y correr lint aparte: `"check": "tsc --noEmit && eslint && next build"` |
| 27 | `try/catch` en código server traga el error y la página se prerenderiza estática (y sin sesión) | Next señaliza `redirect`, `notFound` y uso de APIs dinámicas lanzando errores internos | En todo `catch` de Server Component/DAL, primero `unstable_rethrow(error)` de `next/navigation`. Es bug de seguridad, no solo de render |
| 28 | **Next 16:** modelo de cache nuevo (`cacheComponents: true`, `use cache`, `cacheTag`, `updateTag`) | Reemplaza el modelo anterior, es opt-in | En apps con datos por usuario y auth (ERP, dashboards) **no activarlo**: obliga a envolver todo en `<Suspense>` sin ganancia real. Sí conviene en sitios con contenido compartido |
| 42 | El build rompe con `OmitWithTag<...> does not satisfy the constraint` | Se exportó algo que no es handler desde un `route.ts` (un schema de Zod, una constante) | Next solo permite exportar handlers y su config desde un archivo de ruta. Mover los schemas compartidos a `lib/` |
| 43 | El middleware protege `/admin` pero las páginas se prerenderizan estáticas y se sirven sin sesión | El layout de admin era `'use client'` y solo redirigía desde el cliente: el HTML con los datos ya salió | Layout de admin como Server Component con `await auth()` + `redirect()`. Aislar el `SessionProvider` en su propio archivo cliente. Verificar en la tabla de rutas: admin tiene que figurar `ƒ`, no `○` |
| 44 | Un `catch` que deja `services = []` hace que la sección renderice una grilla vacía en vez del contenido por defecto | El default de props solo aplica con `undefined`, no con `[]` | Pasar `arr.length ? arr : undefined`. Y si el contenido se edita desde un panel, `export const revalidate` para que no haga falta redeploy |
| 45 | `Math.random()` dentro del render tira error de hidratación y re-renderiza el subárbol | El servidor y el cliente sortean distinto | Hash determinístico sobre los índices. Solo usar random dentro de `useEffect` |

### Supabase / Prisma

| # | Error | Causa | Solución |
|---|---|---|---|
| 7 | Prisma migration falla en Supabase | Usar `DATABASE_URL` con pooling para migrations | Usar `DIRECT_URL` para migrations (`npx prisma db push`) |
| 8 | RLS bloquea operaciones inesperadamente | Row Level Security activa sin políticas definidas | Revisar políticas RLS en Supabase antes de debuggear la app |
| 30 | Políticas RLS lentas: cada fila evaluada hace un `SELECT` a `profiles` para saber el rol | El rol vive en una tabla, no en el token | `custom_access_token_hook` inyecta `user_role` en el JWT; las políticas leen `auth.jwt() ->> 'user_role'`. Dejar un fallback a la tabla por si el hook no está habilitado todavía |
| 31 | RLS no puede ocultar una **columna** (ej: el costo al rol caja) | RLS filtra filas, no columnas | `REVOKE SELECT (col) ON tabla FROM authenticated` + vista con `security_invoker = off` que valide el rol en el `WHERE`. Ojo: rompe `select('*')`, hay que listar columnas siempre. **Leer #35 antes: el revoke por columna solo no alcanza** |
| 35 | `REVOKE <priv> (columna) ON tabla FROM rol` no surte ningún efecto | Supabase otorga privilegios a **nivel tabla** (`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`), y ese grant cubre todas las columnas. El revoke por columna no lo alcanza | Al revés: `REVOKE <priv> ON tabla FROM rol` (saca el permiso amplio) y después `GRANT <priv> (col1, col2) ON tabla TO rol` (devuelve solo lo permitido). Verificar con `information_schema.column_privileges` — tiene que dar 0 filas |
| 36 | Un permiso mal cerrado no se nota: la escritura devuelve 204 en vez de error | Con RLS filtrando, un `UPDATE` que no matchea filas devuelve 204 aunque el privilegio siga estando | No confiar en el código HTTP. Verificar contra `information_schema.column_privileges` y sumar un `TRIGGER BEFORE UPDATE` que rechace el cambio salvo desde `service_role`: no depende de los grants |
| 32 | `@supabase/supabase-js` ≥2.111 avisa "Node 20 deprecated" | Declara `engines: node >=22` | Node 22 LTS local y `"engines": {"node": ">=22.0.0"}` en package.json para fijar el runtime de Vercel |
| 33 | Login devuelve `email_provider_disabled` — "Email logins are disabled" | En `config.toml`, `[auth.email].enable_signup = false` **no** bloquea solo el registro: mapea a "proveedor de email habilitado" y apaga también el **login** | Dejar `[auth.email].enable_signup = true` y bloquear el registro con el `enable_signup = false` **global** de `[auth]`. Verificar siempre las dos cosas juntas: que el login entra y que el signup sigue rechazado |
| 34 | `supabase config push` revierte ajustes hechos desde el dashboard | El toml local pisa el remoto entero, no hace merge | Todo cambio de auth va al toml. Si alguien toca el dashboard, bajarlo al archivo antes del próximo push |
| 37 | `revoke all ... from anon` deja de proteger con el tiempo: los objetos creados **después** nacen abiertos otra vez | `alter default privileges in schema public grant all on tables to anon, authenticated` sigue activo. Cada `create or replace view` en una migración posterior vuelve a conceder ALL a `anon` | Además del revoke, corregir el default: `alter default privileges in schema public revoke all on tables from anon`. Verificar con `information_schema.table_privileges where grantee='anon'` → 0 filas |
| 38 | Cerrar una columna por privilegios y que se pueda escribir igual por una vista | Una vista `select p.* from t where cond` es **auto-actualizable** para Postgres. Con `security_invoker = off` el UPDATE corre como owner (que en Supabase tiene BYPASSRLS): saltea el revoke de columna Y las políticas | Las vistas de lectura tienen que ser solo lectura: `revoke insert, update, delete, truncate on la_vista from authenticated, anon` |
| 39 | Consultas sin `.range()` devuelven 1000 filas y no avisan | `max_rows = 1000` en `[api]` de `config.toml` (y el default del dashboard). PostgREST trunca en silencio | Helper que pagina en tandas de 1000 hasta que una vuelva incompleta. Ojo con las tablas producto×lista: el techo llega mucho antes de lo que parece (500 productos × 3 listas = 1500) |
| 40 | Un filtro que compara dos columnas (`stock <= stock_min`) se termina haciendo en JS **después** de paginar | PostgREST no puede expresar columna-vs-columna | Columna generada: `add column bajo_stock boolean generated always as (stock <= stock_min) stored` + índice. El filtro vuelve a la consulta y el `count` deja de mentir |
| 41 | Un Server Action con un campo que la UI manda siempre en 0 igual es superficie de ataque | Los Server Actions se invocan con un POST directo. "La pantalla no lo muestra" no es un control | Si la feature no existe, sacar el campo del schema y de la función SQL. Si existe, guarda de rol + tope en Postgres, no en el cliente |

### Auth / NextAuth

| # | Error | Causa | Solución |
|---|---|---|---|
| 9 | Loop infinito en login | `callbackUrl` mal configurado o falta `authorized` en middleware | Revisar flujo completo: callback → authorized → redirect |
| 10 | Roles no respetados en rutas protegidas | Falta verificación del rol en el middleware | Siempre validar rol tanto en middleware como en el componente/API |
| 46 | Loop de login solo en el dominio propio: entrás por el dominio custom y la sesión no persiste | `NEXTAUTH_URL` apuntando a `*.vercel.app` en vez del dominio canónico. La cookie queda en el dominio equivocado | `NEXTAUTH_URL` = dominio canónico en todos los entornos. Verificar con `curl -s -o /dev/null -w '%{redirect_url}' <dominio>/admin`: el redirect tiene que quedarse en el mismo host |
| 14 | Errores de Supabase Auth filtran existencia de usuarios | `return { error: error.message }` raw permite enumerar ("User already registered" vs "Invalid login") | Mapear con `opaqueAuthError(ctx, error)` que solo expone rate-limit (que el usuario legítimo necesita ver). Detalle real va a `logError()`. |
| 15 | Bootstrap admin escalable | `if (email === ADMIN_BOOTSTRAP_EMAIL) → upsert admin` permite que cualquiera con ese email se vuelva admin si la env queda en prod | Bootstrap solo si `adminCount === 0` — el primer admin se asigna una vez y nunca más, aunque la env quede seteada |
| 16 | `auth.admin.listUsers({ perPage: 1000 })` para buscar por email | API SDK no tiene filtro por email — listar + filtrar en memoria es O(N), expone otros usuarios y rompe >1000 users | Usar `prisma.$queryRaw` con `SELECT FROM auth.users WHERE lower(email) = ${email}` — O(1) indexado |

### Seguridad (patrones aplicados en pet-app)

| # | Patrón | Cuándo usar | Cómo |
|---|---|---|---|
| 17 | Webhook con firma — falla cerrada en prod | Cualquier webhook externo (MP, Stripe, Meta, etc) | Si secret no está configurado + modo prod → **503**. Firma inválida → **401**. Sandbox sin secret → permitir + warn (DX). Verificar con `crypto.timingSafeEqual`. |
| 18 | Comparación timing-safe de secrets | CRON_SECRET, API tokens, signature verification | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` con guardia de longitud previa. Nunca `===`. |
| 19 | Rate limit en login / OTP / signup | Server actions de auth, endpoints sensibles | `@upstash/ratelimit` con factory opt-in: si UPSTASH_REDIS_REST_URL/TOKEN no están, queda OFF y loguea warning (no rompe DX en local) |
| 20 | Logger con sanitización de PII | Cualquier `console.error` que pueda recibir objetos con email/token/phone | Usar `logError(tag, err, meta)` que redacta keys sensibles y trunca strings largos. Output va a Vercel logs accesible vía dashboard |
| 21 | Sesiones largas = blast radius grande | Cookies de auth (Supabase, NextAuth) | maxAge 30 días, no 365. Refresh automático del access token sigue funcionando. SameSite=Lax (Strict rompe OAuth callback) |
| 22 | CSP con `'unsafe-eval'` y wildcards | next.config.mjs / headers | Quitar `'unsafe-eval'` (nadie en bundle lo necesita). Reemplazar `*.googleapis.com` por hosts específicos (maps, places). `'unsafe-inline'` queda hasta migrar a nonce dinámico |
| 23 | Confirmación obligatoria en endpoints destructivos | DELETE de cuenta, borrar mascota, revocar acceso vet | Exigir body `{ confirmation: "ELIMINAR" }` (palabra explícita, no boolean). Tanto en Server Action como en variante REST mobile |
| 24 | Next.js versión vulnerable | Cualquier proyecto Next | Mantener Next ≥ 15.2.3 (o ≥ 14.2.25 en branch 14) por CVE-2025-29927 (bypass middleware). `pnpm why next` para verificar versión real instalada |

### Vercel CLI / entorno de trabajo

| # | Error | Causa | Solución |
|---|---|---|---|
| 47 | `vercel link` devuelve `action_required: missing_scope` aunque se pase `--scope` | El CLI ≥50 no acepta el link no interactivo | Escribir `.vercel/project.json` a mano con `orgId` y `projectId` (se sacan de `vercel project inspect <proyecto> --scope <slug>`) |
| 48 | Env vars agregadas con `--sensitive` vuelven vacías en `vercel env pull` | Son de solo escritura por diseño | Es lo esperado, no un fallo. Verificar por el build: si la app conecta a la DB, en los logs no aparece el warning de conexión |
| 49 | Las animaciones (framer-motion, transiciones CSS) parecen "no correr" o quedar colgadas al testear | El panel del navegador no compone frames (`visibilityState: hidden`, 0 rAF). Las animaciones se congelan en su valor inicial | Ahí **no se puede verificar nada visual basado en animación** — sí lo semántico (clases, `aria-*`, `pointer-events`). No diagnosticarlo como bug de la app |

### Google Apps Script

| # | Error | Causa | Solución |
|---|---|---|---|
| 11 | Script falla sin mensaje de error útil | GAS no muestra stack traces detallados | Usar `Logger.log()` extensivamente y revisar "Ejecuciones" en el editor |

### React / UI

| # | Error | Causa | Solución |
|---|---|---|---|
| 12 | Estado no se actualiza después de una operación | `useState` con objetos/arrays no detecta cambios por referencia | Siempre crear nuevas referencias: `[...arr]`, `{...obj}` |
| 13 | Modal/componente no renderiza datos actualizados | Datos cargados una sola vez sin refetch | Agregar dependencias correctas en `useEffect` o refetch manual post-mutación |

---

## Checklist antes de dar por terminado

- [ ] El feature/fix funciona en local
- [ ] `npm run build` no tira errores (para proyectos Next.js)
- [ ] No se rompió nada que antes funcionaba
- [ ] El código es legible y no tiene `console.log` de debug
- [ ] Si toca la DB: se probó con datos reales o mock realistas
- [ ] Si toca auth o roles: se probó con distintos tipos de usuario
- [ ] Si recibe input externo: validado con Zod o equivalente
- [ ] Si maneja secrets o tokens: usar `crypto.timingSafeEqual`, nunca `===`
- [ ] Si toca endpoints de auth/login/signup: aplicar rate limit (`@/lib/rate-limit`)
- [ ] Si loguea errores: usar `logError(tag, err, meta)` no `console.error(error)` con objetos PII

---

## Cómo actualizar este archivo

Cuando se detecta un patrón nuevo de error o una lección importante:
1. Agregar una fila a la tabla correspondiente en "Errores recurrentes"
2. Si es un principio nuevo, agregarlo en la sección correspondiente
3. Mantener todo conciso — una fila por patrón, no párrafos largos
4. Fecha de la última actualización: **2026-08-04** (auditoría landing Kaizen `pag/`: filas 42-49)
