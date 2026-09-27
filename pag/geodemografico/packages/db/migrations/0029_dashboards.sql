-- 0029 — Dashboards publicados desde SUMA (/app/suma/<id>).
--
-- Un dashboard es una FOTO: el documento guarda el resumen, sus fuentes y los
-- resultados analiticos tal como estaban al crearlo (ya suprimidos). No se
-- recalcula al abrirlo; si despues alguien retira su consentimiento, el
-- privacy_epoch del espacio cambia y la pagina lo avisa.
--
-- Reglas:
--   - Dura 5 dias. La vigencia se DERIVA al leer (expires_at > now()); el
--     cron diario borra los vencidos, pero no depender de el para ocultarlos.
--   - Privado por defecto. "espacio" lo deja ver a los miembros del MISMO
--     espacio y proposito. Nunca entre espacios. Siempre con sesion.
--   - Solo el autor cambia la visibilidad o lo borra.
create table dashboards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  owner_user_id uuid not null,
  -- Foto del autor al crearlo: la app no tiene lectura sobre `users`.
  autor text not null check (length(btrim(autor)) between 1 and 200),
  titulo text not null check (length(btrim(titulo)) between 1 and 200),
  documento jsonb not null,
  visibilidad text not null default 'privado' check (visibilidad in ('privado', 'espacio')),
  privacy_epoch integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint dash_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  constraint dash_owner_membresia
    foreign key (tenant_id, owner_user_id) references memberships(tenant_id, user_id) on delete cascade,
  -- La vigencia no puede estirarse: como mucho 5 dias desde la creacion.
  constraint dash_vigencia check (expires_at > created_at and expires_at <= created_at + interval '5 days')
);

create index dashboards_vigentes on dashboards (tenant_id, purpose_id, expires_at desc);

alter table dashboards enable row level security;
alter table dashboards force row level security;

-- Lectura: los propios, y los visibles del mismo espacio y proposito.
create policy dashboards_lectura on dashboards for select to kaizen_app
  using (
    tenant_id = app.current_tenant()
    and purpose_id = app.current_purpose()
    and (owner_user_id = app.current_user_id() or visibilidad = 'espacio')
  );

-- Alta y cambios: solo el autor, dentro de su espacio.
create policy dashboards_alta on dashboards for insert to kaizen_app
  with check (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id());
create policy dashboards_cambio on dashboards for update to kaizen_app
  using (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id())
  with check (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id());
create policy dashboards_baja on dashboards for delete to kaizen_app
  using (tenant_id = app.current_tenant() and owner_user_id = app.current_user_id());

-- La app solo puede cambiar la visibilidad (no el contenido ni la vigencia).
grant select, insert, delete on dashboards to kaizen_app;
grant update (visibilidad) on dashboards to kaizen_app;

-- Purga diaria de vencidos (cron de ingesta). Solo los ya vencidos.
create policy dashboards_purga on dashboards for delete to kaizen_worker
  using (expires_at < now());
create policy dashboards_purga_lectura on dashboards for select to kaizen_worker
  using (expires_at < now());
grant select, delete on dashboards to kaizen_worker;
