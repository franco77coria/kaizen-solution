-- 0003 — Vault de tokens y conexiones a fuentes. Lector e ingestor separados.

-- Los tokens se guardan cifrados con AES-256-GCM. La tabla guarda el
-- criptograma, nunca el token en claro. La clave vive en TOKEN_VAULT_KEY.
create table token_vault (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ciphertext bytea not null,
  iv bytea not null,
  auth_tag bytea not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint vault_tenant_id_unico unique (tenant_id, id)
);

-- Conexion de INGESTA: la identidad cuya autorizacion usa el worker para leer
-- los archivos de la coleccion compartida.
create table source_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  provider text not null default 'google_drive' check (provider in ('google_drive','fixture')),
  -- Identidad Google que concedio el consentimiento. No es el email.
  provider_subject text not null,
  token_ref uuid,
  granted_scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','needs_reauth','revoked')),
  -- Cursor de cambios del proveedor.
  cursor text,
  -- Sube en cada reconexion. Invalida trabajos de una generacion anterior.
  generation integer not null default 1,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sourceconn_corpus_del_mismo_tenant
    foreign key (tenant_id, corpus_id) references corpora(tenant_id, id) on delete cascade,
  constraint sourceconn_token_del_mismo_tenant
    foreign key (tenant_id, token_ref) references token_vault(tenant_id, id) on delete set null,
  constraint sourceconn_tenant_id_unico unique (tenant_id, id),
  -- Una sola conexion de ingesta activa por corpus.
  constraint sourceconn_una_activa_por_corpus exclude (corpus_id with =) where (status = 'active')
);

-- Conexion de LECTURA: se usa para comprobar que el consultante sigue teniendo
-- acceso a la fuente en el proveedor. Nunca se usa para ingerir.
create table reader_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  provider text not null default 'google_drive' check (provider in ('google_drive','fixture')),
  provider_subject text not null,
  token_ref uuid,
  granted_scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','needs_reauth','revoked')),
  created_at timestamptz not null default now(),
  constraint readerconn_membresia
    foreign key (tenant_id, user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint readerconn_token_del_mismo_tenant
    foreign key (tenant_id, token_ref) references token_vault(tenant_id, id) on delete set null,
  constraint readerconn_unica unique (tenant_id, user_id, provider),
  constraint readerconn_tenant_id_unico unique (tenant_id, id)
);

-- Coleccion virtual: la pertenencia es por ID de archivo, no por carpeta.
-- Mover un archivo de carpeta NO lo saca de la coleccion.
create table source_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  connection_id uuid not null,
  mode text not null default 'virtual_manifest' check (mode in ('virtual_manifest')),
  -- Tipos MIME admitidos. Lo que no este aqui no se descarga.
  allowed_mime_types text[] not null default '{}',
  -- Regla de admision aprobada por el usuario. NULL = solo seleccion manual.
  admission_rule jsonb,
  include_shared_with_me boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sourcecoll_conn_del_mismo_tenant
    foreign key (tenant_id, connection_id) references source_connections(tenant_id, id) on delete cascade,
  constraint sourcecoll_tenant_id_unico unique (tenant_id, id)
);

-- Pertenencia explicita por ID de archivo del proveedor.
create table collection_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  collection_id uuid not null,
  provider_file_id text not null,
  -- El destino real cuando el archivo es un acceso directo.
  target_file_id text not null,
  admitted_by text not null check (admitted_by in ('manual_selection','admission_rule')),
  status text not null default 'admitted' check (status in ('candidate','admitted','withdrawn')),
  admitted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint collmember_coll_del_mismo_tenant
    foreign key (tenant_id, collection_id) references source_collections(tenant_id, id) on delete cascade,
  -- Deduplicacion: el mismo archivo destino no entra dos veces aunque aparezca
  -- en dos carpetas o por dos accesos directos.
  constraint collmember_destino_unico unique (tenant_id, collection_id, target_file_id)
);

create index on source_connections (tenant_id, corpus_id);
create index on collection_members (tenant_id, collection_id) where status = 'admitted';
