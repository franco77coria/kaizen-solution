# ADR 0007 — Dónde se despliega

Fecha: 2026-09-21. Estado: recomendado, pendiente de una decisión legal.

## Decisión

**Vercel (Pro) para la aplicación + Supabase (São Paulo) para PostgreSQL.**

Cloudflare Workers queda descartado como capa de aplicación. Puede usarse
igual para DNS, CDN y R2 si conviene: son decisiones independientes.

## La eliminatoria que cierra la discusión

No es una comparación de precio ni de velocidad. **Cloudflare Workers no puede
correr esta aplicación**, por dos motivos que no se arreglan con configuración:

1. **El render de gráficas usa un addon nativo.** `@resvg/resvg-js` es un
   binario compilado. Workers corre en aislados de V8: ofrece las *APIs* de
   Node, no un proceso Node, así que no hay dónde cargar un `.node`.
   `nodejs_compat` no cubre esto — cubre módulos built-in, no addons.

2. **La base necesita RLS y pgvector.** D1 es SQLite: no tiene ninguna de las
   dos, y además es de un solo escritor. Se podría usar Vectorize para los
   vectores, pero eso parte la autorización en dos sistemas que hay que
   mantener sincronizados — exactamente lo que el plan técnico advierte que no
   hay que hacer.

Existe una salida para (1): `@resvg/resvg-wasm`. Pero resolver (2) exige
conectar Workers a un Postgres externo por Hyperdrive, con lo cual Cloudflare
queda solo como capa de aplicación y se pierde el argumento de integración.

## Por qué Vercel y no un contenedor

La aplicación tiene forma de servidor largo: Fastify más un worker con bucle
de sondeo. Esa forma pide contenedor, no serverless. Tres cosas la inclinan
igual hacia Vercel:

**El cobro es por CPU activa, no por tiempo de reloj.** Esta app pasa la mayor
parte del tiempo esperando: a Gemini, a Drive, a la base. Ese tiempo no se
factura. Es justo el perfil donde serverless sale barato y la intuición dice
lo contrario.

**800 segundos por invocación alcanzan para el worker.** Verificado hoy: el
límite viejo de 60 s que habría obligado a un contenedor ya no existe. El
worker pasa a ser un cron, y el diseño de *leases* que ya tiene lo soporta sin
cambios: si una invocación muere, el lease vence y el trabajo vuelve a la cola.

**El equipo ya conoce Vercel y Supabase.** El `CLAUDE.md` del workspace tiene
más de veinte lecciones específicas de esta combinación, pagadas en proyectos
anteriores. Elegir otra cosa tira esa experiencia a la basura para ganar un
porcentaje en un banco de pruebas.

## Lo que valida el diseño actual

Dos decisiones que se tomaron por seguridad resultan ser las que permiten
escalar:

- **Contexto transaccional.** Todo usa `SET LOCAL ROLE` y
  `set_config(..., true)`. El pooling en modo transacción —imprescindible para
  1000+ concurrentes— no conserva estado de sesión: un diseño con `SET`
  persistente habría que reescribirlo entero. Este entra sin tocar nada.
- **Cuatro roles de servicio.** Supabase permite `CREATE ROLE ... WITH LOGIN
  PASSWORD`, así que `kaizen_app`, `kaizen_worker`, `kaizen_auth` y
  `kaizen_webhook` se crean igual que en local.

## La decisión que NO es técnica

**Supabase no tiene región en Colombia.** La única de América Latina es São
Paulo (`sa-east-1`). Con cualquier proveedor de esta lista, los datos
personales salen del país.

Eso no es necesariamente un bloqueo: la Ley 1581 admite transferencia
internacional con garantías y consentimiento informado. Pero es una decisión
del responsable de tratamiento, no de infraestructura, y hay que tomarla
explícitamente antes de cargar datos reales de personas.

Si apareciera una exigencia de residencia estricta en Colombia, esta
recomendación se cae entera y el camino sería un proveedor local o un VPS en
el país.

## Qué hay que cambiar de lo construido

| Pieza | Cambio | Tamaño |
|---|---|---|
| PGlite → Supabase | Solo `DATABASE_URL`. Mismo driver, mismo SQL, mismas migraciones | trivial |
| Roles de base | Crear los cuatro con LOGIN y contraseña, por migración | chico |
| Fastify | Envolver en una función catch-all de Vercel | mediano |
| Worker | De bucle continuo a cron cada minuto, con ventana de 800 s | chico |
| Migraciones | Usar la URL directa, no la del pooler | trivial |
| PostgREST | Cerrar `anon` y `authenticated`: esta app no lo usa y es superficie de ataque | chico |
| `service_role` | Nunca en el runtime: saltea RLS | — |

## Costo

Plan **Pro obligatorio**, por dos motivos independientes: los cron de menos de
un día fallan **en el deploy** en Hobby, y Hobby no permite conectar un
repositorio que pertenezca a una organización de Git.

## En qué caso me equivoco

- **Si hay exigencia de residencia de datos en Colombia.** Cae todo.
- **Si el corpus documental crece mucho.** pgvector sobre Postgres administrado
  tiene techo; con millones de fragmentos habría que revisar el motor vectorial.
- **Si aparece trabajo de más de 800 s por unidad.** Un documento enorme que no
  se pueda partir obligaría a un contenedor para la ingesta. El chat seguiría
  en Vercel.
- **Si el uso pasa a ser sostenido y no a picos.** Con carga pareja las 24 h,
  un contenedor siempre encendido sale más barato que pagar CPU activa.

## Verificado el 2026-09-21

- Duración de funciones de Vercel: Hobby 300 s; Pro 800 s, 1800 s en beta.
  Bundle 250 MB, 5 GB con Large Functions. Cobro por CPU activa.
- Cron de Vercel: Hobby una vez por día, y las expresiones más frecuentes
  fallan en el deploy. Pro admite cada minuto.
- Supabase: roles propios con LOGIN soportados. Única región latinoamericana,
  São Paulo.
- Cloudflare: `nodejs_compat` cubre APIs built-in, no addons nativos.

**No verificado:** el precio final con volumen real, que depende de mediciones
que todavía no existen.
