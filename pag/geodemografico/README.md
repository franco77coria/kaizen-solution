# Asistente Kaizen

Asistente privado sobre notas de reunión, con analítica agregada y cartografía,
para los 116 municipios de Cundinamarca.

Este proyecto vive dentro del repositorio de Kaizen, pero se instala y despliega
por separado de la web Next.js de `pag/`. Subirlo al repositorio no publica
automáticamente `/geodemografico`; la base, la API y el worker requieren su
propia configuración de despliegue.

Implementación del plan técnico v1.5. Ver `docs/adr/` para las decisiones y
`docs/runbooks/configuracion-externa.md` para lo que falta configurar.

## Arrancar en local

No hace falta Docker, ni PostgreSQL instalado, ni credenciales de Google.

```bash
pnpm install
cp .env.example .env   # y completar; ver "Variables" abajo
pnpm db:start          # PostgreSQL 18 embebido, en otra terminal
pnpm seed              # migraciones + fixtures + piloto interno
pnpm build
pnpm api               # API en :3001, en otra terminal
pnpm web               # interfaz en :5173
```

Entrar a `http://localhost:5273/geodemografico/`. Redirige a la pantalla de selección de cuenta
del proveedor de identidad local, que reemplaza el consentimiento de Google
mientras `OIDC_PROVIDER=fake`.

Cuentas de prueba (las siembra `pnpm seed`):

| Cuenta | Qué ejercita |
|---|---|
| `sub-a1` | Lector de notas, con dos finalidades en el mismo espacio |
| `sub-a2` | Analista: analítica agregada y consulta nominal |
| `sub-a3` | Lector **sin** analítica sensible |
| `sub-admin` | Administrador **sin** permiso de lectura de notas |
| `sub-b1` | Otra alcaldía, para probar aislamiento |
| `sub-sin-inv` | Cuenta del dominio **sin invitación**: debe quedar afuera |

## Variables mínimas para local

```
APP_ENV=local
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/postgres
SESSION_SECRET=<node scripts/gen-secret.mjs>
TOKEN_VAULT_KEY=<node scripts/gen-secret.mjs>
OIDC_PROVIDER=fake
OIDC_ALLOWED_HD=kaizensolutionscol.com
LLM_PROVIDER=fake
EMBEDDINGS_PROVIDER=fake
SOURCE_PROVIDER=fixture
```

Los adaptadores `fake` y `fixture` son deterministas y no hacen red. No son
simulacros de conveniencia: implementan las mismas interfaces y las mismas
reglas que los reales, y son los que usan las pruebas.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm check` | Tipos, lint y pruebas |
| `pnpm test` | Suite completa (levanta su propia base efímera) |
| `pnpm db:reset` | Borra la base local. Solo con `APP_ENV=local` |
| `pnpm verify:gemini` | Una llamada mínima al proveedor y clasifica el resultado |
| `pnpm geo:verify <csv>` | Coteja el catálogo contra DIVIPOLA oficial |
| `pnpm geo:load <geojson> …` | Carga geometrías y activa la cartografía |
| `pnpm api:stop` | Detiene la API en Windows |

## Estructura

```
apps/api        API HTTP (Fastify)
apps/worker     Ingesta: inventario, extracción, segmentación, embeddings
apps/web        Interfaz (React + Vite)
packages/
  contracts     Tipos, permisos, errores y esquemas de entrada
  authz         Identidad, sesiones, vault de tokens, permisos
  db            Migraciones, pools por identidad y transacción autorizada
  llm           Adaptadores de modelo y validador de citas
  retrieval     Búsqueda híbrida y comprobación de vigencia
  query-plans   QueryPlan cerrado → SQL parametrizado, y supresión
  geography     Catálogo de los 116 municipios y geometrías
  visualizations Gráficas deterministas, PNG y Markdown protegido
  observability Logger con redacción de PII y auditoría
  connectors/google-drive  Proveedor real, de fixtures, parser y chunking
tests/security     Aislamiento, roles, consentimiento, inyección
tests/integration  Ingesta, recuperación y superficie HTTP
evals/fixtures     Dos alcaldías, piloto interno y registros sintéticos
docs/adr           Decisiones y bloqueos
docs/runbooks      Operación y configuración externa
```

## Cómo está sostenido el aislamiento

No hay una sola capa, porque una sola capa falla en silencio.

1. **Permisos explícitos** por `(usuario, tenant, finalidad)`. Pertenecer al
   dominio no da membresía; pertenecer al tenant no abre sus finalidades.
2. **RLS forzada** en 39 tablas. Sin contexto de transacción, una consulta
   devuelve **cero filas**, no filas de otro.
3. **Claves foráneas compuestas** que incluyen `tenant_id`: la base rechaza una
   relación cruzada aunque la consulta esté mal escrita.
4. **Roles de servicio separados**: la API no ve las tablas de ingesta, el
   worker no ve conversaciones ni personas, y la autenticación no ve nada del
   corpus. Ninguno tiene `BYPASSRLS` ni puede hacer DDL.
5. **SQL siempre parametrizado**: el modelo nunca escribe SQL ni elige tablas.

Lo que esto **no** protege: un backend completamente comprometido puede poner
el contexto que quiera. Ver ADR 0005 para cuándo esto deja de alcanzar.
