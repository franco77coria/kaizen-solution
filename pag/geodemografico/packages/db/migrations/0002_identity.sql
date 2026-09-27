-- 0002 — Tenants, usuarios, membresias, propositos y corpus.

create table tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_kind text not null check (tenant_kind in ('municipality','campaign','internal_pilot')),
  organization_id uuid,
  campaign_id uuid,
  cycle_id uuid,
  -- Codigo DIVIPOLA de 5 digitos. Nulo solo para el piloto interno.
  municipality_code text check (municipality_code ~ '^[0-9]{5}$'),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  retention_days integer not null default 3650 check (retention_days > 0),
  time_zone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  -- Una campana exige campana y municipio. El piloto interno permite ambos nulos,
  -- con proposito empresarial explicito. Un municipio exige su codigo.
  constraint tenant_kind_coherente check (
    (tenant_kind = 'campaign'     and campaign_id is not null and municipality_code is not null) or
    (tenant_kind = 'municipality' and municipality_code is not null) or
    (tenant_kind = 'internal_pilot')
  )
);

create table users (
  id uuid primary key default gen_random_uuid(),
  -- Identidad estable del proveedor. El email NO es la identidad.
  issuer text not null,
  subject text not null,
  email_display text not null,
  status text not null default 'active' check (status in ('active','suspended','disabled')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint users_issuer_subject_unico unique (issuer, subject)
);

create table data_purposes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  description text not null,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  constraint purpose_codigo_unico_por_tenant unique (tenant_id, code),
  -- Clave candidata compuesta: permite FK que incluyan tenant_id.
  constraint purpose_tenant_id_unico unique (tenant_id, id)
);

create table memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  -- Cambia al revocar o suspender. Invalida sesiones y trabajo en curso.
  authz_version integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table purpose_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  permission text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  granted_by uuid references users(id),
  created_at timestamptz not null default now(),
  -- FK compuesta: el proposito debe pertenecer al mismo tenant que la concesion.
  constraint grant_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint grant_membresia_existente
    foreign key (tenant_id, user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint grant_unico unique (tenant_id, purpose_id, user_id, permission)
);

create table corpora (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  kind text not null default 'tenant_shared' check (kind in ('tenant_shared')),
  name text not null,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  constraint corpus_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint corpus_tenant_id_unico unique (tenant_id, id),
  -- Clave candidata que arrastra el proposito: permite que documentos y chunks
  -- deriven su purpose_id por FK compuesta en vez de duplicarlo sin control.
  constraint corpus_tenant_purpose_id_unico unique (tenant_id, purpose_id, id)
);

-- Invitaciones de un solo uso con expiracion. El alta nunca es automatica
-- por pertenecer al dominio.
create table invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- Email esperado, solo para mostrar y cotejar. La identidad se fija al aceptar.
  invited_email text not null,
  role text not null,
  -- Hash del token. El token en claro solo existe en el enlace enviado.
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  accepted_by uuid references users(id),
  accepted_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent_hash text,
  ip_hash text
);

create index on memberships (user_id);
create index on purpose_grants (tenant_id, user_id, permission) where status = 'active';
create index on corpora (tenant_id, purpose_id);
create index on sessions (user_id) where revoked_at is null;
create index on invitations (tenant_id) where status = 'pending';
