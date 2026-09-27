-- 0022 — El login puede crear y actualizar usuarios.
--
-- Bug que ninguna prueba detectaba: `users` tenía FORCE ROW LEVEL SECURITY y
-- una sola política, de LECTURA, para `kaizen_auth`. Con eso:
--
--   1. El PRIMER login de cualquier cuenta fallaba: "new row violates
--      row-level security policy for table users". Todas las cuentas de las
--      pruebas ya existían (las carga el fixture), así que ninguna ejercitaba
--      un alta real. En producción, la primera persona en entrar con Google
--      habría recibido un error.
--
--   2. El `update` de `email_display` y `last_seen_at` en cada login tocaba
--      CERO filas sin error (lección 36): el último acceso nunca se registraba
--      y un cambio de email en Google nunca se reflejaba.
--
-- El `update` se limita a esas dos columnas, al revés de como viene de
-- fábrica (lección 35: el revoke por columna no alcanza, hay que sacar el
-- permiso de tabla y devolver solo las columnas). Si la identidad de login
-- pudiera escribir `status`, un login podría reactivar a un usuario
-- suspendido.

create policy users_auth_alta on users for insert to kaizen_auth
  with check (status = 'active');

create policy users_auth_actualizar on users for update to kaizen_auth
  using (true)
  with check (true);

revoke update on users from kaizen_auth;
grant update (email_display, last_seen_at) on users to kaizen_auth;

-- La migración falla si la identidad de login conserva cualquier otro
-- permiso de escritura sobre `users` por columna.
do $$
declare
  sobrantes integer;
begin
  select count(*) into sobrantes
    from information_schema.column_privileges
   where table_name = 'users'
     and grantee = 'kaizen_auth'
     and privilege_type = 'UPDATE'
     and column_name not in ('email_display', 'last_seen_at');
  if sobrantes > 0 then
    raise exception 'kaizen_auth puede actualizar % columnas de users de mas', sobrantes;
  end if;
end $$;
