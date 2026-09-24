-- 0007 — Personas, referidos, consentimiento versionado y revision.
-- Consentimiento y apoyo son datos DISTINTOS y no se derivan uno del otro.
-- No existe ninguna columna de preferencia politica inferida.

-- Textos de consentimiento versionados. Se guarda QUE texto se mostro,
-- no una casilla suelta.
create table consent_texts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  version text not null,
  body text not null,
  -- Responsable del tratamiento declarado en el aviso.
  controller_name text not null,
  effective_from timestamptz not null default now(),
  status text not null default 'active' check (status in ('draft','active','retired')),
  constraint consenttext_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint consenttext_version_unica unique (tenant_id, purpose_id, version),
  constraint consenttext_tenant_id_unico unique (tenant_id, id)
);

create table person_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  -- Titular del dato. Distinto del operador que lo captura.
  full_name text not null,
  document_number text not null,
  municipality_code text not null check (municipality_code ~ '^[0-9]{5}$'),
  birth_year integer check (birth_year between 1900 and 2100),
  phone text,
  -- Quien capturo el registro. NUNCA puede ser quien lo aprueba.
  captured_by uuid not null,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','rejected','withdrawn')),
  -- Bloqueo optimista. Una revision con version vieja se rechaza.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint person_operador_membresia
    foreign key (tenant_id, captured_by) references memberships(tenant_id, user_id) on delete restrict,
  constraint person_tenant_id_unico unique (tenant_id, id),
  -- Deduplicacion dentro de la finalidad. El error externo es uniforme:
  -- un conflicto no puede revelar que el documento existe en otro tenant.
  constraint person_documento_unico unique (tenant_id, purpose_id, document_number)
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  record_id uuid not null,
  consent_text_id uuid not null,
  -- Siempre true al crear: no se guarda un consentimiento negativo como si
  -- fuera dado. La ausencia de consentimiento es ausencia de fila.
  granted boolean not null default true check (granted),
  granted_at timestamptz not null default now(),
  evidence_kind text not null
    check (evidence_kind in ('firma_digital','formulario_papel','registro_verbal')),
  evidence_ref text not null,
  -- El retiro es un hecho posterior, nunca un borrado.
  withdrawn_at timestamptz,
  withdrawal_ref text,
  constraint consent_record_del_mismo_tenant
    foreign key (tenant_id, record_id) references person_records(tenant_id, id) on delete cascade,
  constraint consent_texto_del_mismo_tenant
    foreign key (tenant_id, consent_text_id) references consent_texts(tenant_id, id) on delete restrict
);

create table record_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  record_id uuid not null,
  reviewer_user_id uuid not null,
  decision text not null check (decision in ('approve','reject')),
  reason text not null,
  expected_version integer not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint review_record_del_mismo_tenant
    foreign key (tenant_id, record_id) references person_records(tenant_id, id) on delete cascade,
  constraint review_revisor_membresia
    foreign key (tenant_id, reviewer_user_id) references memberships(tenant_id, user_id) on delete restrict,
  constraint review_idempotencia unique (tenant_id, record_id, idempotency_key)
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  referrer_record_id uuid not null,
  referred_record_id uuid not null,
  created_at timestamptz not null default now(),
  constraint ref_referrer_del_mismo_tenant
    foreign key (tenant_id, referrer_record_id) references person_records(tenant_id, id) on delete cascade,
  constraint ref_referred_del_mismo_tenant
    foreign key (tenant_id, referred_record_id) references person_records(tenant_id, id) on delete cascade,
  constraint ref_no_autoreferencia check (referrer_record_id <> referred_record_id),
  constraint ref_unica unique (tenant_id, referrer_record_id, referred_record_id)
);

-- Invariantes en la BASE, no en el cliente. Un Server Action o un endpoint se
-- invocan con curl; "la pantalla no lo permite" no es un control.

-- 1. Autoaprobacion bloqueada: quien captura no puede revisar.
create function app.review_actor_distinto() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
declare
  v_captured_by uuid;
begin
  select captured_by into v_captured_by
    from person_records
   where tenant_id = new.tenant_id and id = new.record_id;

  if v_captured_by is null then
    raise exception 'registro inexistente' using errcode = 'foreign_key_violation';
  end if;

  if v_captured_by = new.reviewer_user_id then
    raise exception 'autoaprobacion no permitida' using errcode = 'check_violation';
  end if;

  return new;
end
$fn$;

create trigger review_actor_distinto_trg
  before insert on record_reviews
  for each row execute function app.review_actor_distinto();

-- 2. El retiro de consentimiento PREVALECE sobre la aprobacion.
-- Ambas operaciones bloquean la misma fila de person_records, asi que se
-- serializan; en cualquiera de los dos ordenes el resultado final es 'withdrawn'.
create function app.consentimiento_vigente() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if new.status = 'approved' then
    if exists (
      select 1 from consent_records
       where tenant_id = new.tenant_id
         and record_id = new.id
         and withdrawn_at is not null
    ) then
      raise exception 'consentimiento retirado' using errcode = 'check_violation';
    end if;

    if not exists (
      select 1 from consent_records
       where tenant_id = new.tenant_id
         and record_id = new.id
         and withdrawn_at is null
    ) then
      raise exception 'sin consentimiento vigente' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end
$fn$;

create trigger consentimiento_vigente_trg
  before update of status on person_records
  for each row execute function app.consentimiento_vigente();

-- 3. Al retirar el consentimiento, el registro deja de estar aprobado.
create function app.propagar_retiro() returns trigger
  language plpgsql
  set search_path = pg_catalog, public
  as $fn$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null then
    update person_records
       set status = 'withdrawn', version = version + 1, updated_at = now()
     where tenant_id = new.tenant_id and id = new.record_id;

    insert into deletion_tombstones (tenant_id, resource_kind, resource_ref, reason, scope)
    values (new.tenant_id, 'person_record', new.record_id::text, 'user_request', 'record');
  end if;
  return new;
end
$fn$;

create trigger propagar_retiro_trg
  after update of withdrawn_at on consent_records
  for each row execute function app.propagar_retiro();

create index on person_records (tenant_id, purpose_id, status);
create index on person_records (tenant_id, purpose_id, municipality_code);
create index on consent_records (tenant_id, record_id) where withdrawn_at is null;
create index on referrals (tenant_id, referrer_record_id);
