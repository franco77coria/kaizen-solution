-- 0024 — Un rol de login propio para la aplicación.
--
-- La aplicación se conecta con UN usuario y, en cada transacción, hace
-- `SET LOCAL ROLE kaizen_app` (o worker, auth, webhook). En local funciona
-- porque ese usuario es `postgres`, superusuario. En Supabase NO:
--
--   - `postgres` no es superusuario ahí;
--   - desde Postgres 16, crear un rol no habilita a asumirlo (el creador
--     recibe ADMIN, pero no SET), así que `SET ROLE kaizen_app` falla con
--     "permission denied to set role".
--
-- Además, conectar la app como `postgres` le daría a un error de código los
-- privilegios del dueño de las tablas. Este rol no tiene NINGUNO propio: sin
-- asumir una de las cuatro identidades no puede leer ni escribir nada.
--
-- La contraseña NO va en la migración: la pone el script de inicialización
-- (`pnpm prod:inicializar`) desde una variable de entorno.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kaizen_login') then
    create role kaizen_login login noinherit nosuperuser nobypassrls nocreatedb nocreaterole;
  end if;
end $$;

-- SET TRUE: puede asumir cada identidad. INHERIT FALSE: no hereda sus
-- privilegios, así que conectado "a secas" no puede hacer nada.
grant kaizen_app, kaizen_worker, kaizen_auth, kaizen_webhook
  to kaizen_login with set true, inherit false;

-- La migración falla si el rol quedó con más de lo que necesita.
do $$
declare
  r record;
begin
  select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolinherit
    into r from pg_roles where rolname = 'kaizen_login';
  if r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolinherit then
    raise exception 'kaizen_login quedo con privilegios de mas';
  end if;

  -- Ningun privilegio directo sobre tablas: todo pasa por los roles. Se lee
  -- el ACL crudo y no information_schema, que filtra por los roles del que
  -- consulta: en Supabase el dueño no es superusuario y no veria nada.
  if exists (
    select 1 from pg_class c, aclexplode(c.relacl) a
     where a.grantee = 'kaizen_login'::regrole
  ) then
    raise exception 'kaizen_login tiene privilegios directos sobre tablas';
  end if;
end $$;
