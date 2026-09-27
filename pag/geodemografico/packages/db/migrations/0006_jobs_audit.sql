-- 0006 — Trabajos de ingesta, outbox de sincronizacion, auditoria y borrados.

create table ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  connection_id uuid not null,
  -- Generacion de la conexion al encolar. Un trabajo de generacion vieja
  -- se descarta: la reconexion invalida trabajo en vuelo.
  connection_generation integer not null,
  provider_file_id text not null,
  job_kind text not null check (job_kind in ('extract','embed','reconcile','withdraw')),
  pipeline_version text not null,
  status text not null default 'queued'
    check (status in ('queued','leased','succeeded','failed','dead')),
  attempts integer not null default 0,
  lease_until timestamptz,
  lease_holder text,
  error_class text,
  error_detail text,
  -- Clave de idempotencia del trabajo. Reentregar el mismo mensaje no crea
  -- un segundo trabajo ni publica dos veces.
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_conn_del_mismo_tenant
    foreign key (tenant_id, connection_id) references source_connections(tenant_id, id) on delete cascade,
  constraint job_dedupe_unico unique (tenant_id, dedupe_key)
);

-- Outbox: los eventos del proveedor se persisten antes de procesarse.
-- Perder o duplicar una notificacion no pierde cambios ni crea documentos dobles.
create table sync_outbox (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  connection_id uuid not null,
  cursor_before text,
  cursor_after text,
  event_payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','published','skipped','failed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint outbox_conn_del_mismo_tenant
    foreign key (tenant_id, connection_id) references source_connections(tenant_id, id) on delete cascade
);

-- Auditoria. NUNCA contiene contenido: ni texto de reuniones, ni nombres de
-- personas, ni tokens, ni valores de parametros.
create table audit_events (
  -- Orden total. now() es el timestamp de la TRANSACCION: varias filas
  -- insertadas juntas empatan al microsegundo y el desempate seria arbitrario.
  seq bigint generated always as identity primary key,
  actor_user_id uuid,
  tenant_id uuid,
  purpose_id uuid,
  action text not null,
  -- Identificador opaco del recurso, no su titulo.
  resource_ref text,
  result text not null check (result in ('allowed','denied','error')),
  request_id text not null,
  detail jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create table deletion_tombstones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid,
  resource_kind text not null,
  resource_ref text not null,
  reason text not null
    check (reason in ('source_removed','access_revoked','user_request','retention','tenant_closed')),
  scope text not null
    check (scope in ('document','version','chunk','embedding','summary','analysis','record','tenant')),
  purge_status text not null default 'pending'
    check (purge_status in ('pending','purged','failed')),
  created_at timestamptz not null default now(),
  purged_at timestamptz
);

create index on ingestion_jobs (tenant_id, status) where status in ('queued','leased');
create index on ingestion_jobs (lease_until) where status = 'leased';
create index on sync_outbox (connection_id, status) where status = 'pending';
create index on audit_events (tenant_id, created_at desc);
create index on audit_events (actor_user_id, created_at desc);
create index on deletion_tombstones (tenant_id, purge_status) where purge_status = 'pending';
