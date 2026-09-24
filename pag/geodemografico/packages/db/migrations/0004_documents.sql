-- 0004 — Reuniones, documentos, versiones, fragmentos y embeddings.

create table meetings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  purpose_id uuid not null,
  -- Identificador oficial del evento cuando el proveedor lo entrega.
  provider_meeting_key text,
  started_at timestamptz,
  status text not null default 'active' check (status in ('active','withdrawn')),
  -- Que tan segura es la asociacion documento-reunion. Un titulo parecido
  -- NO es evidencia: eso es 'low' y no cuenta como reunion identificada.
  identity_confidence text not null default 'low'
    check (identity_confidence in ('provider_key','metadata_match','manual_review','low')),
  created_at timestamptz not null default now(),
  constraint meeting_corpus_y_purpose
    foreign key (tenant_id, purpose_id, corpus_id) references corpora(tenant_id, purpose_id, id) on delete cascade,
  constraint meeting_tenant_id_unico unique (tenant_id, id),
  constraint meeting_provider_key_unica unique (tenant_id, corpus_id, provider_meeting_key)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  purpose_id uuid not null,
  connection_id uuid not null,
  source_file_id text not null,
  artifact_type text not null
    check (artifact_type in ('meeting_notes','transcript','manual_document')),
  title text not null,
  meeting_at timestamptz,
  -- De donde salio meeting_at. 'unknown' es legitimo: no se inventa fecha.
  date_origin text not null default 'unknown'
    check (date_origin in ('provider_meeting','document_metadata','parsed_heading','unknown')),
  current_version_id uuid,
  status text not null default 'active' check (status in ('active','withdrawn','trashed')),
  created_at timestamptz not null default now(),
  constraint document_corpus_y_purpose
    foreign key (tenant_id, purpose_id, corpus_id) references corpora(tenant_id, purpose_id, id) on delete cascade,
  constraint document_conn_del_mismo_tenant
    foreign key (tenant_id, connection_id) references source_connections(tenant_id, id) on delete cascade,
  constraint document_tenant_id_unico unique (tenant_id, id),
  constraint document_tenant_corpus_id_unico unique (tenant_id, corpus_id, id),
  constraint document_archivo_unico unique (tenant_id, corpus_id, source_file_id)
);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  document_id uuid not null,
  source_version text not null,
  content_hash text not null,
  parser_version text not null,
  status text not null default 'staging'
    check (status in ('staging','published','superseded','withdrawn')),
  -- Si el parser no pudo leer todo, se declara. No se trunca en silencio.
  extraction_complete boolean not null default true,
  extraction_note text,
  char_count integer not null default 0,
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint version_doc_del_mismo_corpus
    foreign key (tenant_id, corpus_id, document_id) references documents(tenant_id, corpus_id, id) on delete cascade,
  constraint version_tenant_corpus_id_unico unique (tenant_id, corpus_id, id),
  constraint version_source_unica unique (tenant_id, document_id, source_version)
);

alter table documents
  add constraint document_version_actual
  foreign key (tenant_id, corpus_id, current_version_id)
  references document_versions(tenant_id, corpus_id, id) on delete set null;

-- Relaciona nota, transcripcion y copias con una sola entidad reunion,
-- para que COUNT(DISTINCT meeting_id) no triplique el total.
create table meeting_documents (
  tenant_id uuid not null,
  corpus_id uuid not null,
  meeting_id uuid not null,
  document_id uuid not null,
  artifact_type text not null
    check (artifact_type in ('meeting_notes','transcript','manual_document')),
  primary key (tenant_id, meeting_id, document_id),
  constraint mtgdoc_meeting_del_mismo_tenant
    foreign key (tenant_id, meeting_id) references meetings(tenant_id, id) on delete cascade,
  constraint mtgdoc_doc_del_mismo_corpus
    foreign key (tenant_id, corpus_id, document_id) references documents(tenant_id, corpus_id, id) on delete cascade,
  -- Un documento pertenece a lo sumo a una reunion.
  constraint mtgdoc_documento_unico unique (tenant_id, document_id)
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  ordinal integer not null,
  content text not null,
  tab_id text,
  heading text,
  char_start integer not null,
  char_end integer not null,
  token_estimate integer not null default 0,
  speaker text,
  ts_start_seconds integer,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  constraint chunk_version_del_mismo_corpus
    foreign key (tenant_id, corpus_id, version_id) references document_versions(tenant_id, corpus_id, id) on delete cascade,
  constraint chunk_doc_del_mismo_corpus
    foreign key (tenant_id, corpus_id, document_id) references documents(tenant_id, corpus_id, id) on delete cascade,
  constraint chunk_tenant_corpus_id_unico unique (tenant_id, corpus_id, id),
  constraint chunk_ordinal_unico unique (tenant_id, version_id, ordinal)
);

create function app.chunks_search_vector() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.heading, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(new.content, '')), 'B');
  return new;
end
$fn$;

create trigger chunks_search_vector_trg
  before insert or update of content, heading on chunks
  for each row execute function app.chunks_search_vector();

create table chunk_embeddings (
  chunk_id uuid primary key,
  tenant_id uuid not null,
  corpus_id uuid not null,
  embedding_model text not null,
  dimension integer not null,
  pipeline_version text not null,
  -- 768 dimensiones por decision inicial del plan. Cambiar de modelo exige
  -- migracion explicita, no reinterpretar vectores existentes.
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  constraint emb_chunk_del_mismo_corpus
    foreign key (tenant_id, corpus_id, chunk_id) references chunks(tenant_id, corpus_id, id) on delete cascade,
  constraint emb_dimension_declarada check (dimension = 768)
);

create table meeting_summaries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  summary text not null,
  source_chunk_ids uuid[] not null default '{}',
  schema_version text not null,
  created_at timestamptz not null default now(),
  constraint summary_version_del_mismo_corpus
    foreign key (tenant_id, corpus_id, version_id) references document_versions(tenant_id, corpus_id, id) on delete cascade
);

create table extracted_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  fact_kind text not null,
  fact_value text not null,
  occurred_on date,
  source_chunk_id uuid,
  -- Una inferencia NUNCA se promueve a dato confirmado sin revision humana.
  verification_state text not null default 'inferred'
    check (verification_state in ('inferred','confirmed','rejected')),
  created_at timestamptz not null default now(),
  constraint fact_version_del_mismo_corpus
    foreign key (tenant_id, corpus_id, version_id) references document_versions(tenant_id, corpus_id, id) on delete cascade
);

create index on documents (tenant_id, corpus_id) where status = 'active';
create index on document_versions (tenant_id, document_id, status);
create index on chunks using gin (search_vector);
create index on chunks (tenant_id, corpus_id);
create index on meeting_documents (tenant_id, corpus_id, meeting_id);
create index chunk_embeddings_ivfflat
  on chunk_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 32);
