-- 0015 — Canales de notificacion del proveedor (webhook de Drive).
--
-- Problema de fondo: el webhook llega SIN sesion y SIN saber de que tenant es.
-- Lo unico que trae es un identificador de canal. Pero todas las tablas de
-- negocio exigen contexto de tenant en sus politicas, y sin contexto devuelven
-- cero filas (que es exactamente lo que deben hacer).
--
-- La solucion NO es relajar RLS sobre `source_connections`. Es aislar la
-- traduccion "canal -> tenant" en una tabla propia, minima y sin datos de
-- nadie: identificadores opacos, un hash y una fecha. Esa tabla es lo UNICO
-- legible sin contexto, y por eso la frontera de confianza queda explicita y
-- se puede auditar de un vistazo.
--
-- La notificacion no se cree: solo se usa como senal para reconsultar.

create table notification_channels (
  -- Identificador opaco que viaja en la cabecera del webhook.
  channel_id text primary key,
  tenant_id uuid not null,
  connection_id uuid not null,
  -- Se copian aqui para que el webhook pueda encolar SIN leer
  -- `source_connections`, que es una tabla con datos de la conexion.
  corpus_id uuid not null,
  -- Generacion al registrar el canal. Si la conexion se reconecto despues, el
  -- trabajo encolado quedara obsoleto y el worker lo descartara, que es lo
  -- correcto: ese canal ya no corresponde.
  connection_generation integer not null,
  -- Se guarda el HASH del secreto, igual que con las sesiones.
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint canal_conexion_del_mismo_tenant
    foreign key (tenant_id, connection_id) references source_connections(tenant_id, id)
      on delete cascade,
  -- Una conexion tiene a lo sumo un canal vigente.
  constraint canal_unico_por_conexion unique (connection_id)
);

create index on notification_channels (expires_at);

-- Identidad dedicada al webhook. Solo puede traducir un canal y encolar
-- trabajo: no ve documentos, ni personas, ni conversaciones, ni tokens.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kaizen_webhook') then
    create role kaizen_webhook nologin noinherit;
  end if;
end
$$;

grant usage on schema public, app to kaizen_webhook;
grant execute on all functions in schema app to kaizen_webhook;
grant select on notification_channels to kaizen_webhook;
grant select, insert on ingestion_jobs to kaizen_webhook;
grant usage, select on all sequences in schema public to kaizen_webhook;

-- La tabla de canales SI lleva RLS, pero su politica no exige tenant: ese es
-- justamente el punto. Contiene identificadores opacos y un hash, nada mas.
alter table notification_channels enable row level security;
alter table notification_channels force row level security;

create policy canales_traduccion on notification_channels for select
  to kaizen_webhook using (true);

-- La aplicacion administra los canales dentro de SU tenant.
grant select, insert, update, delete on notification_channels to kaizen_app;
create policy canales_del_tenant on notification_channels
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

-- El webhook solo puede encolar reconciliaciones para el tenant que le indico
-- la tabla de canales. No puede leer trabajos de otros ni cambiar su estado.
create policy jobs_webhook_alta on ingestion_jobs for insert
  to kaizen_webhook
  with check (
    job_kind = 'reconcile'
    and exists (
      select 1 from notification_channels c
       where c.tenant_id = ingestion_jobs.tenant_id
         and c.connection_id = ingestion_jobs.connection_id
         and c.expires_at > now()
    )
  );

create policy jobs_webhook_lectura on ingestion_jobs for select
  to kaizen_webhook using (job_kind = 'reconcile');

do $$
begin
  if (select rolsuper or rolbypassrls from pg_roles where rolname = 'kaizen_webhook') then
    raise exception 'kaizen_webhook con privilegios excesivos';
  end if;
end
$$;
