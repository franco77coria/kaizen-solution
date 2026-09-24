-- 0001 — Extensiones, esquema de contexto y roles de ejecucion.
-- El rol de runtime NO es superusuario, NO tiene BYPASSRLS, NO es dueno de
-- tablas y NO puede hacer DDL. Verificado por tests/security/roles.test.ts.

create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create schema if not exists app;

-- Contexto de la transaccion. Lo establece el backend con set_config(..., true),
-- de alcance LOCAL: no sobrevive al COMMIT ni al prestamo de la conexion al pool.
-- Sin contexto, estas funciones devuelven NULL y las politicas deniegan todo,
-- porque `columna = NULL` no es verdadero.
create or replace function app.current_tenant() returns uuid
  language sql stable
  set search_path = pg_catalog
  as $$ select nullif(current_setting('app.tenant_id', true), '')::uuid $$;

create or replace function app.current_user_id() returns uuid
  language sql stable
  set search_path = pg_catalog
  as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create or replace function app.current_corpus() returns uuid
  language sql stable
  set search_path = pg_catalog
  as $$ select nullif(current_setting('app.corpus_id', true), '')::uuid $$;

create or replace function app.current_purpose() returns uuid
  language sql stable
  set search_path = pg_catalog
  as $$ select nullif(current_setting('app.purpose_id', true), '')::uuid $$;

-- Roles. NOINHERIT evita que un rol acumule privilegios sin pedirlos.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kaizen_app') then
    create role kaizen_app nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'kaizen_worker') then
    create role kaizen_worker nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'kaizen_readonly') then
    create role kaizen_readonly nologin noinherit;
  end if;
end
$$;

-- Ninguno de estos roles puede crear objetos en public.
revoke create on schema public from public;
revoke all on schema public from public;
grant usage on schema public to kaizen_app, kaizen_worker, kaizen_readonly;
grant usage on schema app to kaizen_app, kaizen_worker, kaizen_readonly;
grant execute on all functions in schema app to kaizen_app, kaizen_worker, kaizen_readonly;

-- Los privilegios por defecto NO conceden nada: cada tabla otorga explicitamente
-- lo que necesita. Esto evita la trampa de que un objeto creado despues nazca
-- abierto (leccion aprendida: el revoke inicial deja de proteger con el tiempo).
alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public revoke all on sequences from public;
