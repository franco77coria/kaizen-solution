-- 0023 — El registro por email también sirve para el primer administrador.
--
-- Problema: en producción no había forma de que entrara NADIE con permisos de
-- administración. Las invitaciones por token nunca funcionaron con Google
-- real: el token se leía de `?invitation=` en la URL de callback, y Google
-- vuelve al callback solo con los parámetros que él define. Y un usuario no
-- existe hasta su primer login, así que tampoco se le pueden cargar permisos
-- de antemano.
--
-- Solución: el mismo mecanismo que los líderes, con un rol más. Quien entra
-- con un email registrado queda reconocido; sus permisos se derivan del rol
-- de su registro.
--
-- REGLA DE SEGURIDAD: desde la aplicación solo se pueden cargar y revocar
-- LÍDERES. Un registro de `administrador` solo lo puede crear quien tiene las
-- credenciales de migración (el deploy). Así la API sigue sin poder otorgar
-- permisos administrativos, que era la regla de la 0014.

alter table leader_registry
  add column rol text not null default 'lider' check (rol in ('lider', 'administrador'));

-- La API lee todos los registros de su espacio, pero solo escribe líderes.
drop policy lideres_del_tenant on leader_registry;

create policy lideres_leer on leader_registry for select to kaizen_app
  using (tenant_id = app.current_tenant());

create policy lideres_alta on leader_registry for insert to kaizen_app
  with check (tenant_id = app.current_tenant() and rol = 'lider');

create policy lideres_revocar on leader_registry for update to kaizen_app
  using (tenant_id = app.current_tenant() and rol = 'lider')
  with check (tenant_id = app.current_tenant() and rol = 'lider');

-- Permisos por rol. Una sola tabla de verdad, dentro de la vista.
create or replace view effective_grants with (security_invoker = on) as
  select g.tenant_id, g.purpose_id, g.user_id, g.permission
    from purpose_grants g
   where g.status = 'active'
     and (g.expires_at is null or g.expires_at > now())
  union
  select lr.tenant_id, lr.purpose_id, lr.user_id, p.permission
    from leader_registry lr
    join (values
      -- Líder: sumar personas y ver el panorama. No lee notas (SUMA no le
      -- aparece), no revisa y no administra.
      ('lider', 'records.capture'),
      ('lider', 'analytics.aggregate'),
      -- Administrador: todo. La autoaprobación igual la impide el trigger.
      ('administrador', 'notes.read'),
      ('administrador', 'sources.manage'),
      ('administrador', 'analytics.aggregate'),
      ('administrador', 'records.capture'),
      ('administrador', 'records.review'),
      ('administrador', 'records.read_sensitive'),
      ('administrador', 'analyses.save'),
      ('administrador', 'analyses.share'),
      ('administrador', 'tenant.admin')
    ) as p(rol, permission) on p.rol = lr.rol
   where lr.status = 'active';

-- La membresía que crea el login lleva el rol del registro que la respalda.
drop policy memberships_auth_alta on memberships;
drop policy memberships_auth_reactivar on memberships;

create policy memberships_auth_alta on memberships for insert to kaizen_auth
  with check (
    exists (
      select 1 from leader_registry lr
       where lr.tenant_id = memberships.tenant_id
         and lr.user_id = memberships.user_id
         and lr.rol = memberships.role
         and lr.status = 'active')
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
      exists (
        select 1 from leader_registry lr
         where lr.tenant_id = memberships.tenant_id
           and lr.user_id = memberships.user_id
           and lr.rol = memberships.role
           and lr.status = 'active')
      or exists (
        select 1 from invitations i
         where i.tenant_id = memberships.tenant_id
           and i.accepted_by = memberships.user_id
           and i.role = memberships.role
           and i.status = 'accepted')
    )
  );
