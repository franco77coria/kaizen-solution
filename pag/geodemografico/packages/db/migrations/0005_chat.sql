-- 0005 — Conversaciones, mensajes, fuentes citadas y peticiones idempotentes.
-- Los chats son PERSONALES: llevan owner_user_id y no se comparten.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  purpose_id uuid not null,
  owner_user_id uuid not null,
  title text,
  -- Version de autorizacion al crear. Si la membresia cambia, el historial
  -- deja de poder reutilizarse sin revalidar.
  authz_version integer not null,
  status text not null default 'active' check (status in ('active','archived','blocked')),
  created_at timestamptz not null default now(),
  constraint conv_corpus_y_purpose
    foreign key (tenant_id, purpose_id, corpus_id) references corpora(tenant_id, purpose_id, id) on delete cascade,
  constraint conv_owner_membresia
    foreign key (tenant_id, owner_user_id) references memberships(tenant_id, user_id) on delete cascade,
  constraint conv_tenant_id_unico unique (tenant_id, id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant')),
  status text not null default 'complete'
    check (status in ('pending','complete','failed','abstained','blocked')),
  content text not null,
  -- Versiones de las que depende esta respuesta. Si una se retira, el mensaje
  -- se marca dependiente-de-fuente-revocada y no se reutiliza como contexto.
  dependency_version_ids uuid[] not null default '{}',
  model_version text,
  prompt_version text,
  summary_only boolean not null default false,
  created_at timestamptz not null default now(),
  constraint msg_conv_del_mismo_tenant
    foreign key (tenant_id, conversation_id) references conversations(tenant_id, id) on delete cascade,
  constraint msg_tenant_id_unico unique (tenant_id, id)
);

create table answer_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  message_id uuid not null,
  document_id uuid not null,
  version_id uuid not null,
  chunk_id uuid not null,
  -- Instantanea de la referencia tal como se mostro. Si el documento cambia
  -- despues, la cita conserva lo que efectivamente respaldo la respuesta.
  snapshot_title text not null,
  snapshot_quote text not null,
  snapshot_section text,
  created_at timestamptz not null default now(),
  constraint ansrc_msg_del_mismo_tenant
    foreign key (tenant_id, message_id) references messages(tenant_id, id) on delete cascade,
  constraint ansrc_chunk_del_mismo_corpus
    foreign key (tenant_id, corpus_id, chunk_id) references chunks(tenant_id, corpus_id, id) on delete cascade
);

-- Idempotencia de peticiones de chat. Dos clics con la misma clave devuelven
-- el mismo resultado en vez de ejecutar dos veces.
create table chat_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  corpus_id uuid not null,
  user_id uuid not null,
  conversation_id uuid not null,
  idempotency_key text not null,
  -- Hash del contenido. Misma clave con distinto cuerpo es un conflicto,
  -- no una reutilizacion silenciosa.
  request_hash text not null,
  status text not null default 'pending'
    check (status in ('pending','running','succeeded','failed','cancelled')),
  lease_until timestamptz,
  deadline_at timestamptz not null,
  result_message_id uuid,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chatreq_conv_del_mismo_tenant
    foreign key (tenant_id, conversation_id) references conversations(tenant_id, id) on delete cascade,
  constraint chatreq_idempotencia unique (tenant_id, user_id, idempotency_key)
);

create index on conversations (tenant_id, owner_user_id) where status = 'active';
create index on messages (tenant_id, conversation_id, created_at);
create index on answer_sources (tenant_id, message_id);
create index on chat_requests (tenant_id, status) where status in ('pending','running');
