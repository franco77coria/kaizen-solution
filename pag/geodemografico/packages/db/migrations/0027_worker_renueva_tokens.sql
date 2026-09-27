-- 0027 — El worker puede guardar el token de Google que renueva.
--
-- El access token de Google dura una hora. Al vencer, el worker pide uno
-- nuevo con el refresh token (eso funcionaba) y lo guarda en token_vault...
-- con un rol que solo tenia SELECT (0010). El UPDATE fallaba, el error caia
-- en el catch de la renovacion y la conexion quedaba marcada "hay que
-- reconectar": en produccion, exactamente una hora despues de conectar Drive.
--
-- Solo las columnas que la renovacion reescribe. El worker sigue sin poder
-- crear ni borrar secretos, ni cambiar a que espacio pertenecen.
grant update (ciphertext, iv, auth_tag, key_version, rotated_at) on token_vault to kaizen_worker;

do $$
begin
  if not has_column_privilege('kaizen_worker', 'token_vault', 'ciphertext', 'UPDATE') then
    raise exception 'kaizen_worker no puede guardar el token renovado';
  end if;
  if has_column_privilege('kaizen_worker', 'token_vault', 'tenant_id', 'UPDATE') then
    raise exception 'kaizen_worker no deberia poder mover un secreto de espacio';
  end if;
end $$;
