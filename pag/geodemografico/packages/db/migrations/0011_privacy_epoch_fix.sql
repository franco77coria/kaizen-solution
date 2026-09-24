-- 0011 — Correccion del mecanismo de epoch de privacidad.
--
-- Dos problemas detectados al probar el retiro de consentimiento:
--
-- 1. El trigger corre con el rol de la APLICACION, que solo tiene SELECT sobre
--    `tenants`. El UPDATE del contador fallaba con "permission denied".
--
-- 2. El mismo trigger marcaba `analyses.status = 'stale'`. Bajo RLS, esa
--    sentencia solo alcanza los analisis DEL USUARIO QUE ACTUA: los de los
--    demas miembros quedaban sin marcar y la sentencia no fallaba. Una
--    actualizacion parcial silenciosa es peor que no tenerla, porque deja
--    creer que la invalidacion se aplico.
--
-- Solucion:
--   - Privilegio MINIMO para el contador: UPDATE sobre UNA sola columna, mas
--     una politica que lo acota al tenant del contexto.
--   - La obsolescencia de un analisis se DERIVA comparando su `privacy_epoch`
--     con el del tenant, en la lectura. Un dato derivado no puede quedar a
--     medias, y ya era como lo comprobaban los endpoints.

-- Privilegio acotado a una columna. El rol sigue sin poder tocar el nombre,
-- el estado ni la retencion del tenant.
grant update (privacy_epoch) on tenants to kaizen_app;

-- Sin politica de UPDATE, con FORCE RLS el UPDATE afectaria 0 filas y no
-- fallaria: exito aparente y contador sin subir.
create policy tenants_actualiza_epoch on tenants for update
  using (id = app.current_tenant())
  with check (id = app.current_tenant());

-- Un tenant no puede cambiar de identidad ni de tipo por esta via, aunque
-- alguien ampliara los grants por error mas adelante.
create function app.solo_epoch_editable() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if current_user <> 'kaizen_app' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.tenant_kind is distinct from old.tenant_kind
     or new.municipality_code is distinct from old.municipality_code
     or new.name is distinct from old.name
     or new.status is distinct from old.status
     or new.retention_days is distinct from old.retention_days then
    raise exception 'la aplicacion solo puede modificar privacy_epoch'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

create trigger solo_epoch_editable_trg
  before update on tenants
  for each row execute function app.solo_epoch_editable();

-- El trigger deja de escribir en `analyses`.
create or replace function app.subir_privacy_epoch() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null then
    update tenants set privacy_epoch = privacy_epoch + 1 where id = new.tenant_id;
  end if;
  return new;
end
$fn$;

-- El estado 'stale' almacenado queda obsoleto. Las filas existentes vuelven a
-- 'active'; su obsolescencia real se calcula comparando epochs.
update analyses set status = 'active' where status = 'stale';

comment on column analyses.privacy_epoch is
  'Epoch del tenant al guardar. Si difiere del actual, el analisis esta obsoleto. La obsolescencia se DERIVA, no se almacena.';
