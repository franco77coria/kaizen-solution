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

### Supabase / Prisma

| # | Error | Causa | Solución |
|---|---|---|---|
| 7 | Prisma migration falla en Supabase | Usar `DATABASE_URL` con pooling para migrations | Usar `DIRECT_URL` para migrations (`npx prisma db push`) |
| 8 | RLS bloquea operaciones inesperadamente | Row Level Security activa sin políticas definidas | Revisar políticas RLS en Supabase antes de debuggear la app |

### Auth / NextAuth

| # | Error | Causa | Solución |
|---|---|---|---|
| 9 | Loop infinito en login | `callbackUrl` mal configurado o falta `authorized` en middleware | Revisar flujo completo: callback → authorized → redirect |
| 10 | Roles no respetados en rutas protegidas | Falta verificación del rol en el middleware | Siempre validar rol tanto en middleware como en el componente/API |

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

---

## Cómo actualizar este archivo

Cuando se detecta un patrón nuevo de error o una lección importante:
1. Agregar una fila a la tabla correspondiente en "Errores recurrentes"
2. Si es un principio nuevo, agregarlo en la sección correspondiente
3. Mantener todo conciso — una fila por patrón, no párrafos largos
4. Fecha de la última actualización: **2026-02-27**
