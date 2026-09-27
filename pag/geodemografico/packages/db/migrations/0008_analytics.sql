-- 0008 — Ejecuciones analiticas, analisis guardados, comparticion y graficas.

-- Epoch de privacidad por tenant. Sube con cada retiro de consentimiento o
-- revocacion. Un snapshot guardado con un epoch anterior queda invalidado:
-- no se sirve hasta refrescarlo.
alter table tenants add column privacy_epoch integer not null default 1;

create table analytics_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  owner_user_id uuid not null,
  -- Plantilla registrada. NUNCA texto SQL.
  template text not null,
  -- Plan validado tal como se ejecuto. Sirve para reejecutar y auditar.
  plan jsonb not null,
  -- Resultado ya suprimido. Un grupo suprimido lleva suppressed=true y
  -- value=null; no se serializa como cero.
  result jsonb not null,
  total_groups integer not null default 0,
  suppressed_groups integer not null default 0,
  suppression_threshold integer not null,
  privacy_epoch integer not null,
  duration_ms integer not null default 0,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint run_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint run_owner_membresia
    foreign key (tenant_id, owner_user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint run_tenant_id_unico unique (tenant_id, id),
  constraint run_idempotencia unique (tenant_id, owner_user_id, idempotency_key)
);

create table visualizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  owner_user_id uuid not null,
  run_id uuid not null,
  -- ChartSpec validado. No admite URLs, SQL, HTML ni valores libres.
  spec jsonb not null,
  -- PNG renderizado en servidor. Se sirve autenticado, nunca por CDN publica.
  png bytea,
  png_sha256 text,
  privacy_epoch integer not null,
  created_at timestamptz not null default now(),
  constraint viz_run_del_mismo_tenant
    foreign key (tenant_id, run_id) references analytics_runs(tenant_id, id) on delete cascade,
  constraint viz_tenant_id_unico unique (tenant_id, id)
);

-- Analisis guardado. PRIVADO por defecto: se comparte solo con una concesion
-- explicita creada por accion del usuario.
create table analyses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  owner_user_id uuid not null,
  title text not null,
  run_id uuid not null,
  visualization_id uuid,
  privacy_epoch integer not null,
  status text not null default 'active' check (status in ('active','stale','deleted')),
  created_at timestamptz not null default now(),
  refreshed_at timestamptz,
  constraint analysis_run_del_mismo_tenant
    foreign key (tenant_id, run_id) references analytics_runs(tenant_id, id) on delete restrict,
  constraint analysis_viz_del_mismo_tenant
    foreign key (tenant_id, visualization_id) references visualizations(tenant_id, id) on delete set null,
  constraint analysis_owner_membresia
    foreign key (tenant_id, owner_user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint analysis_tenant_id_unico unique (tenant_id, id)
);

create table analysis_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  analysis_id uuid not null,
  grantee_user_id uuid not null,
  granted_by uuid not null,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  constraint grant_analysis_del_mismo_tenant
    foreign key (tenant_id, analysis_id) references analyses(tenant_id, id) on delete cascade,
  -- Compartir NO amplia el tenant: el destinatario debe ser miembro del mismo.
  constraint grant_destinatario_membresia
    foreign key (tenant_id, grantee_user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint grant_analysis_unico unique (tenant_id, analysis_id, grantee_user_id)
);

-- Al retirar un consentimiento sube el epoch del tenant, lo que invalida
-- snapshots y PNG guardados que se calcularon antes.
create function app.subir_privacy_epoch() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null then
    update tenants set privacy_epoch = privacy_epoch + 1 where id = new.tenant_id;
    update analyses set status = 'stale'
     where tenant_id = new.tenant_id and status = 'active';
  end if;
  return new;
end
$fn$;

create trigger subir_privacy_epoch_trg
  after update of withdrawn_at on consent_records
  for each row execute function app.subir_privacy_epoch();

-- Peticiones de derechos del titular (acceso, rectificacion, retiro).
create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  request_kind text not null
    check (request_kind in ('access','rectification','withdrawal','deletion')),
  -- Referencia al registro afectado. La verificacion de identidad del titular
  -- se hace fuera de la app y se referencia, no se guarda el documento.
  record_id uuid,
  identity_check_ref text not null,
  status text not null default 'received'
    check (status in ('received','verified','fulfilled','rejected')),
  handled_by uuid,
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint privreq_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade
);

create index on analytics_runs (tenant_id, owner_user_id, created_at desc);
create index on analyses (tenant_id, owner_user_id) where status <> 'deleted';
create index on analysis_grants (tenant_id, grantee_user_id) where status = 'active';
create index on visualizations (tenant_id, run_id);
create index on privacy_requests (tenant_id, status);
