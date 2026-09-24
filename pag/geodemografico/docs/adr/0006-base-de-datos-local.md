# ADR 0006 — Motor de base de datos en desarrollo local

Fecha: 2026-09-20. Estado: aceptado. Ticket: 01.

## Contexto

La máquina de desarrollo no tiene Docker, ni WSL, ni un servidor PostgreSQL instalado, y el usuario no tiene permisos de administrador. El plan exige probar RLS forzada, roles sin BYPASSRLS, `set_config` transaccional y pgvector.

## Decisión

Usar **PGlite** (`@electric-sql/pglite` 0.5.8, que es PostgreSQL 18.3) con la extensión `@electric-sql/pglite-pgvector`, expuesta por el **protocolo de cable de Postgres** mediante `@electric-sql/pglite-socket`.

La aplicación se conecta con el cliente `pg` estándar a una `DATABASE_URL`. No hay ninguna rama de código específica para desarrollo: el mismo driver, el mismo SQL y las mismas migraciones corren contra Cloud SQL cambiando únicamente la variable de entorno.

## Verificado empíricamente antes de adoptarlo

| Requisito | Resultado |
|---|---|
| `create extension vector` y operador de distancia coseno | Funciona |
| `CREATE ROLE` sin SUPERUSER ni BYPASSRLS | Funciona; atributos confirmados en `pg_roles` |
| ENABLE y FORCE ROW LEVEL SECURITY | Funciona |
| `set_config(..., true)` con alcance de transacción | Funciona; el contexto no sobrevive al COMMIT |
| Conexión de `pg.Pool` por TCP | Funciona con `maxConnections` mayor que 1 |
| 6 transacciones concurrentes sobre pool de 4, contextos A y B distintos | Aisladas correctamente |
| Conexión reutilizada sin contexto | Devuelve 0 filas |

## Limitación declarada

PGlite tiene **un solo backend** y serializa las consultas. La concurrencia es real desde el punto de vista del pool y del aislamiento, pero no reproduce contención de bloqueos, `FOR UPDATE` entre sesiones simultáneas ni el comportamiento de `pg_advisory_xact_lock` bajo paralelismo verdadero.

En consecuencia: **la prueba de carga de 126 consultas simultáneas del ticket 18 no se considera cubierta en local.** Requiere PostgreSQL real. El resto de la suite sí es representativo.
