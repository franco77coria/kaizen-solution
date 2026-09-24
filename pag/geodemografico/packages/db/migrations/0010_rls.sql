-- 0010 — Row Level Security y privilegios. Superficie de seguridad completa
-- en un solo archivo, para que se pueda auditar de una sentada.
--
-- Reglas:
--   * ENABLE + FORCE en toda tabla privada. FORCE hace que la politica alcance
--     tambien al dueno de la tabla (leccion: sin FORCE, un DELETE desde una
--     migracion borra 0 filas o, peor, las borra todas sin avisar).
--   * Sin contexto, las funciones app.current_*() devuelven NULL y la
--     comparacion da NULL: la politica DENIEGA. Nunca devuelve filas ajenas.
--   * Privilegios explicitos por tabla. Nada hereda de un grant amplio.

-- Identidad de servicio separada para autenticacion. Ve usuarios y sesiones,
-- pero NO ve documentos, fragmentos ni registros de personas.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kaizen_auth') then
    create role kaizen_auth nologin noinherit;
  end if;
end
$$;

grant usage on schema public, app to kaizen_auth;
grant execute on all functions in schema app to kaizen_auth;

-- ---------------------------------------------------------------------------
-- Tablas de identidad. Solo kaizen_auth las toca.
-- ---------------------------------------------------------------------------

grant select, insert, update on users to kaizen_auth;
grant select, insert, update on sessions to kaizen_auth;
grant select, insert, update on invitations to kaizen_auth;
grant select on tenants to kaizen_auth, kaizen_app, kaizen_worker;
grant select on memberships to kaizen_auth;
grant select on purpose_grants to kaizen_auth;
grant select on data_purposes to kaizen_auth, kaizen_app, kaizen_worker;
grant select on corpora to kaizen_auth, kaizen_app, kaizen_worker;

alter table users enable row level security;
alter table users force row level security;
create policy users_propio on users for select to kaizen_auth
  using (id = app.current_user_id() or app.current_user_id() is null);

alter table sessions enable row level security;
alter table sessions force row level security;
create policy sessions_auth on sessions to kaizen_auth using (true) with check (true);

alter table invitations enable row level security;
alter table invitations force row level security;
create policy invitations_auth on invitations to kaizen_auth using (true) with check (true);

alter table tenants enable row level security;
alter table tenants force row level security;
create policy tenants_contexto on tenants for select
  using (id = app.current_tenant());
create policy tenants_auth on tenants for select to kaizen_auth using (true);

alter table memberships enable row level security;
alter table memberships force row level security;
create policy memberships_auth on memberships for select to kaizen_auth using (true);

alter table purpose_grants enable row level security;
alter table purpose_grants force row level security;
create policy grants_auth on purpose_grants for select to kaizen_auth using (true);

alter table data_purposes enable row level security;
alter table data_purposes force row level security;
create policy purposes_contexto on data_purposes for select
  using (tenant_id = app.current_tenant());
create policy purposes_auth on data_purposes for select to kaizen_auth using (true);

alter table corpora enable row level security;
alter table corpora force row level security;
create policy corpora_contexto on corpora for select
  using (tenant_id = app.current_tenant());
create policy corpora_auth on corpora for select to kaizen_auth using (true);

-- ---------------------------------------------------------------------------
-- Helper: politica de tenant. Se repite tanto que conviene generarla.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tablas_tenant text[] := array[
    'token_vault','source_connections','reader_connections','source_collections',
    'collection_members','ingestion_jobs','sync_outbox','deletion_tombstones',
    'consent_texts','person_records','consent_records','record_reviews','referrals',
    'analytics_runs','visualizations','privacy_requests'
  ];
begin
  foreach t in array tablas_tenant loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (tenant_id = app.current_tenant()) with check (tenant_id = app.current_tenant())',
      t || '_tenant', t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Tablas de corpus: exigen tenant Y corpus en el contexto.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tablas_corpus text[] := array[
    'meetings','documents','document_versions','meeting_documents','chunks',
    'chunk_embeddings','meeting_summaries','extracted_facts','answer_sources'
  ];
begin
  foreach t in array tablas_corpus loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (tenant_id = app.current_tenant() and corpus_id = app.current_corpus()) with check (tenant_id = app.current_tenant() and corpus_id = app.current_corpus())',
      t || '_corpus', t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Chats: PRIVADOS. Tenant + corpus + propietario. Ni siquiera otro miembro
-- del mismo espacio puede leerlos.
-- ---------------------------------------------------------------------------
alter table conversations enable row level security;
alter table conversations force row level security;
create policy conversations_propias on conversations
  using (
    tenant_id = app.current_tenant()
    and corpus_id = app.current_corpus()
    and owner_user_id = app.current_user_id()
  )
  with check (
    tenant_id = app.current_tenant()
    and corpus_id = app.current_corpus()
    and owner_user_id = app.current_user_id()
  );

-- Los mensajes heredan la privacidad de su conversacion: el EXISTS vuelve a
-- pasar por la politica de conversations, que ya exige propiedad.
alter table messages enable row level security;
alter table messages force row level security;
create policy messages_de_conversacion_propia on messages
  using (
    tenant_id = app.current_tenant()
    and exists (select 1 from conversations c
                 where c.tenant_id = messages.tenant_id and c.id = messages.conversation_id)
  )
  with check (
    tenant_id = app.current_tenant()
    and exists (select 1 from conversations c
                 where c.tenant_id = messages.tenant_id and c.id = messages.conversation_id)
  );

alter table chat_requests enable row level security;
alter table chat_requests force row level security;
create policy chat_requests_propias on chat_requests
  using (tenant_id = app.current_tenant() and user_id = app.current_user_id())
  with check (tenant_id = app.current_tenant() and user_id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- Analisis guardados: propios, o compartidos con una concesion ACTIVA y vigente.
-- Compartir no amplia el tenant: la concesion exige membresia en el mismo.
-- ---------------------------------------------------------------------------
alter table analyses enable row level security;
alter table analyses force row level security;

create policy analyses_propios on analyses
  using (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id())
  with check (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id());

-- Solo LECTURA para los compartidos. El destinatario no puede editar ni borrar.
create policy analyses_compartidos on analyses for select
  using (
    tenant_id = app.current_tenant()
    and exists (
      select 1 from analysis_grants g
       where g.tenant_id = analyses.tenant_id
         and g.analysis_id = analyses.id
         and g.grantee_user_id = app.current_user_id()
         and g.status = 'active'
         and (g.expires_at is null or g.expires_at > now())
    )
  );

alter table analysis_grants enable row level security;
alter table analysis_grants force row level security;
-- Ve la concesion quien la otorgo (dueno del analisis) y quien la recibe.
create policy analysis_grants_visibles on analysis_grants
  using (
    tenant_id = app.current_tenant()
    and (
      grantee_user_id = app.current_user_id()
      or exists (select 1 from analyses a
                  where a.tenant_id = analysis_grants.tenant_id
                    and a.id = analysis_grants.analysis_id
                    and a.owner_user_id = app.current_user_id())
    )
  )
  with check (
    tenant_id = app.current_tenant()
    and exists (select 1 from analyses a
                 where a.tenant_id = analysis_grants.tenant_id
                   and a.id = analysis_grants.analysis_id
                   and a.owner_user_id = app.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- Auditoria: la aplicacion SOLO inserta. No puede leerla, editarla ni borrarla.
-- Leerla es tarea de una identidad de auditoria separada.
-- ---------------------------------------------------------------------------
alter table audit_events enable row level security;
alter table audit_events force row level security;
create policy audit_solo_insercion on audit_events for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- Catalogo territorial: dato de referencia, sin tenant. Solo lectura.
-- ---------------------------------------------------------------------------
grant select on geography_versions, areas, municipality_catalog
  to kaizen_app, kaizen_worker, kaizen_readonly;

-- ---------------------------------------------------------------------------
-- Privilegios por identidad de servicio. Explicitos, tabla por tabla.
-- Lo que no aparece aqui, no se puede tocar.
-- ---------------------------------------------------------------------------

-- Nada hereda de PUBLIC.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on %I from public', t);
  end loop;
end
$$;

-- API: chat propio, lectura del corpus, analitica y captura.
grant select, insert, update, delete on conversations, chat_requests to kaizen_app;
grant select, insert, update on messages, answer_sources to kaizen_app;
grant select on documents, document_versions, chunks, chunk_embeddings to kaizen_app;
grant select on meetings, meeting_documents, meeting_summaries, extracted_facts to kaizen_app;
grant select on source_connections, source_collections, collection_members to kaizen_app;
grant select, insert, update on reader_connections to kaizen_app;
grant select, insert, update on token_vault to kaizen_app;
grant select, insert, update on person_records, consent_records, record_reviews to kaizen_app;
grant select on consent_texts, referrals to kaizen_app;
grant select, insert on analytics_runs, visualizations to kaizen_app;
grant select, insert, update, delete on analyses, analysis_grants to kaizen_app;
grant select, insert, update on privacy_requests to kaizen_app;
grant insert on audit_events to kaizen_app;
grant insert on deletion_tombstones to kaizen_app;

-- La API puede ENCOLAR trabajo pero no ejecutarlo ni marcarlo como hecho.
grant select, insert on ingestion_jobs to kaizen_app;

-- Worker de ingesta: escribe el corpus documental. NO ve chats ni personas.
grant select, insert, update, delete on documents, document_versions to kaizen_worker;
grant select, insert, update, delete on chunks, chunk_embeddings to kaizen_worker;
grant select, insert, update, delete on meetings, meeting_documents to kaizen_worker;
grant select, insert, update, delete on meeting_summaries, extracted_facts to kaizen_worker;
grant select, update on source_connections, source_collections to kaizen_worker;
grant select, insert, update on collection_members to kaizen_worker;
grant select, insert, update on ingestion_jobs, sync_outbox to kaizen_worker;
grant select on token_vault to kaizen_worker;
grant insert on audit_events to kaizen_worker;
grant insert, update on deletion_tombstones to kaizen_worker;

-- Secuencias necesarias para las tablas con identity.
grant usage, select on all sequences in schema public to kaizen_app, kaizen_worker;

-- ---------------------------------------------------------------------------
-- Comprobacion de la propia migracion. Si un rol de runtime quedara con
-- SUPERUSER o BYPASSRLS, la migracion FALLA en vez de dejarlo pasar.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
      from pg_roles
     where rolname in ('kaizen_app','kaizen_worker','kaizen_auth','kaizen_readonly')
  loop
    if r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole then
      raise exception 'rol de runtime % con privilegios excesivos', r.rolname;
    end if;
  end loop;
end
$$;
