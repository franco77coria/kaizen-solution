-- 0016 — La aplicacion necesita ADMINISTRAR conexiones de fuente.
--
-- Los endpoints de vinculacion (`/v1/google/*` y `/v1/source-connections/*`)
-- crean y revocan conexiones, pero el rol de la aplicacion solo tenia SELECT
-- sobre `source_connections`: conectar Drive fallaba con "permission denied".
--
-- Las politicas RLS ya existian (acotan al tenant del contexto); lo que
-- faltaba eran los privilegios. Se conceden los minimos:
--
--   * INSERT y UPDATE, para crear una conexion y marcarla revocada.
--   * NO se concede DELETE: una conexion no se borra, se revoca. Borrarla
--     perderia la traza de que existio y de que documentos trajo.

grant insert, update on source_connections to kaizen_app;
grant insert, update on source_collections to kaizen_app;

-- Desconectar una fuente compartida retira sus documentos para todo el
-- espacio, asi que la aplicacion necesita poder marcarlos.
grant update on documents to kaizen_app;
grant update on document_versions to kaizen_app;

-- Guarda: la aplicacion NO puede resucitar una conexion revocada. Reconectar
-- crea una fila nueva con una generacion mayor, que es lo que invalida los
-- trabajos en vuelo de la conexion anterior. Permitir volver a 'active'
-- dejaria correr un job viejo con una autorizacion que ya no rige.
create function app.conexion_no_resucita() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if current_user = 'kaizen_app'
     and old.status = 'revoked'
     and new.status <> 'revoked' then
    raise exception 'una conexion revocada no se reactiva: hay que reconectar'
      using errcode = 'check_violation';
  end if;
  return new;
end
$fn$;

create trigger conexion_no_resucita_trg
  before update on source_connections
  for each row execute function app.conexion_no_resucita();
