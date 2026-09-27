-- 0026 — Cerrar la API REST de Supabase sobre el esquema de la app.
--
-- Supabase trae privilegios POR DEFECTO que le dan TODO a `anon` y
-- `authenticated` (los roles de su API REST publica) sobre cada tabla,
-- secuencia y funcion que se cree en `public`. Medido tras migrar: las 48
-- tablas quedaban con SELECT, INSERT, UPDATE, DELETE y TRUNCATE para los dos.
--
-- En las tablas con RLS forzada no se filtraban datos, porque las politicas
-- exigen el contexto de un espacio. Pero cuatro tablas no llevan RLS (el
-- catalogo territorial, la geografia y el registro de migraciones), y ahi
-- cualquiera con la clave publica del proyecto podia modificarlas o borrarlas.
--
-- La app no usa esa API: habla con Postgres directo, con sus cuatro
-- identidades. Asi que no se afina nada: se cierra entero, y tambien para lo
-- que se cree despues (leccion 37: el revoke solo no alcanza, los objetos
-- nuevos nacen abiertos otra vez).
--
-- En local (PGlite) esos roles no existen y la migracion no hace nada.
do $$
declare
  rol text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = rol) then
      execute format('revoke all on all tables in schema public from %I', rol);
      execute format('revoke all on all sequences in schema public from %I', rol);
      execute format('revoke all on all functions in schema public from %I', rol);
      execute format('alter default privileges in schema public revoke all on tables from %I', rol);
      execute format('alter default privileges in schema public revoke all on sequences from %I', rol);
      execute format('alter default privileges in schema public revoke all on functions from %I', rol);
    end if;
  end loop;

  -- La migracion falla si quedo algo abierto. Se lee el ACL crudo: se ve
  -- igual sin importar quien consulte (ver 0024).
  if exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace,
           aclexplode(c.relacl) a
     where n.nspname = 'public'
       and a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated'))
  ) then
    raise exception 'anon o authenticated conservan privilegios sobre tablas de la app';
  end if;
end $$;
