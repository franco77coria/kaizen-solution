-- 0021 — Líderes: quién suma a quién.
--
-- El modelo: un administrador carga el email de Google de cada líder. Cuando
-- esa cuenta entra por primera vez, el sistema la reconoce, le crea la
-- membresía y la ata a su identidad estable (issuer + subject). Lo que el
-- líder suma queda a su nombre (`person_records.captured_by`).
--
-- DECISIÓN CENTRAL: los permisos de un líder NO se guardan. Se DERIVAN de su
-- registro activo en el momento de consultarlos (vista `effective_grants`).
--
--   - La API de usuario sigue sin poder escribir `purpose_grants`, que era la
--     regla de la 0014: otorgar permisos es tarea administrativa.
--   - Revocar un líder es poner su registro en `revoked`. Sus permisos
--     desaparecen en la siguiente consulta, sin que nadie tenga que acordarse
--     de borrar filas en otra tabla. Es el mismo principio que el proyecto ya
--     aplicó tres veces: la validez se deriva al leer, no se almacena.
--
-- De paso corrige un bug que no fallaba en ninguna prueba: `consumeInvitation`
-- insertaba en `memberships` como `kaizen_auth`, que solo tenía SELECT. La
-- primera invitación real habría fallado en el login con "permission denied".

-- ---------------------------------------------------------------------------
-- 1. Registro de líderes
-- ---------------------------------------------------------------------------
create table leader_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purpose_id uuid not null,
  -- Se guarda normalizado: la comparación con el email verificado de Google
  -- es exacta, y "Ana@Gmail.com" y "ana@gmail.com" son la misma cuenta.
  email text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  display_name text not null check (length(btrim(display_name)) between 2 and 120),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  -- Se completa en el primer login. Desde ahí el líder se identifica por su
  -- cuenta, no por el texto del email.
  user_id uuid references users(id) on delete set null,
  activated_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint lider_purpose_del_mismo_tenant
    foreign key (tenant_id, purpose_id) references data_purposes(tenant_id, id) on delete cascade,
  -- Activo exige cuenta; pendiente no puede tenerla.
  constraint lider_estado_coherente check (
    (status = 'pending' and user_id is null) or
    (status = 'active' and user_id is not null) or
    status = 'revoked'
  )
);

-- Un email no puede estar dos veces vigente en la misma finalidad. Revocado
-- no cuenta: se puede volver a cargar a alguien que se dio de baja.
create unique index lider_email_vigente
  on leader_registry (tenant_id, purpose_id, email)
  where status <> 'revoked';

create index lider_por_email on leader_registry (email) where status = 'pending';
create index lider_por_usuario on leader_registry (tenant_id, purpose_id, user_id) where status = 'active';

alter table leader_registry enable row level security;
alter table leader_registry force row level security;

-- La API ve y administra los líderes de SU espacio. Que la cuenta sea
-- administradora lo comprueba el endpoint (tenant.admin).
grant select, insert, update on leader_registry to kaizen_app;
create policy lideres_del_tenant on leader_registry
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

-- La identidad de login lee todos (para detectar por email) y solo puede
-- pasar un registro de pendiente a activo, poniéndole una cuenta.
grant select, update on leader_registry to kaizen_auth;
create policy lideres_auth_leer on leader_registry for select to kaizen_auth using (true);
create policy lideres_auth_activar on leader_registry for update to kaizen_auth
  using (status = 'pending')
  with check (status = 'active' and user_id is not null);

-- ---------------------------------------------------------------------------
-- 2. Permisos efectivos: una sola definición
-- ---------------------------------------------------------------------------
-- Hasta ahora los permisos se calculaban en DOS consultas distintas (la
-- resolución de ámbito y /v1/me). Agregar la regla de líderes en una sola
-- habría hecho que la otra mintiera. Ahora las dos leen esta vista.
--
-- `security_invoker`: la vista se evalúa con los permisos de quien la
-- consulta, así las políticas RLS de las tablas de abajo siguen aplicando.
-- Una vista con UNION no es auto-actualizable, así que no hay forma de
-- escribir por ella (lección 38), y además se revoca por las dudas.
create view effective_grants with (security_invoker = on) as
  select g.tenant_id, g.purpose_id, g.user_id, g.permission
    from purpose_grants g
   where g.status = 'active'
     and (g.expires_at is null or g.expires_at > now())
  union
  -- Un líder activo tiene exactamente estos dos permisos: sumar personas y
  -- ver el panorama. Ni leer notas, ni revisar, ni administrar.
  select lr.tenant_id, lr.purpose_id, lr.user_id, p.permission
    from leader_registry lr
    cross join (values ('records.capture'), ('analytics.aggregate')) as p(permission)
   where lr.status = 'active';

revoke all on effective_grants from public;
grant select on effective_grants to kaizen_auth, kaizen_app;

-- ---------------------------------------------------------------------------
-- 3. Membresías: la identidad de login puede crearlas, pero solo con respaldo
-- ---------------------------------------------------------------------------
-- `kaizen_auth` puede crear o reactivar una membresía ÚNICAMENTE si existe
-- algo que la justifique: un registro de líder activo para esa cuenta, o una
-- invitación que esa misma cuenta acaba de aceptar, con el mismo rol. No hay
-- forma de que el login se dé acceso a un espacio por su cuenta.
grant insert, update on memberships to kaizen_auth;

create policy memberships_auth_alta on memberships for insert to kaizen_auth
  with check (
    (role = 'lider' and exists (
      select 1 from leader_registry lr
       where lr.tenant_id = memberships.tenant_id
         and lr.user_id = memberships.user_id
         and lr.status = 'active'))
    or exists (
      select 1 from invitations i
       where i.tenant_id = memberships.tenant_id
         and i.accepted_by = memberships.user_id
         and i.role = memberships.role
         and i.status = 'accepted')
  );

create policy memberships_auth_reactivar on memberships for update to kaizen_auth
  using (true)
  with check (
    status = 'active' and (
      (role = 'lider' and exists (
        select 1 from leader_registry lr
         where lr.tenant_id = memberships.tenant_id
           and lr.user_id = memberships.user_id
           and lr.status = 'active'))
      or exists (
        select 1 from invitations i
         where i.tenant_id = memberships.tenant_id
           and i.accepted_by = memberships.user_id
           and i.role = memberships.role
           and i.status = 'accepted')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Datos nuevos de cada persona, a pedido: como en el formulario de líderes
-- ---------------------------------------------------------------------------
-- Nulos en los registros anteriores; la API los exige en las altas nuevas.
alter table person_records
  add column gender text check (gender in ('femenino', 'masculino', 'no_binario', 'otro', 'prefiere_no_decir')),
  add column relationship text check (relationship in ('familia', 'amistad', 'vecindad', 'trabajo', 'comunidad', 'otra')),
  add column uses_whatsapp boolean,
  add column occupation text check (occupation is null or length(btrim(occupation)) between 1 and 80);

-- Los privilegios de `person_records` son a nivel TABLA (0010), así que las
-- columnas nuevas quedan cubiertas. Si algún día pasan a ser por columna,
-- estas cuatro tienen que entrar en el grant (lección 58).

create index person_records_por_lider on person_records (tenant_id, purpose_id, captured_by);
