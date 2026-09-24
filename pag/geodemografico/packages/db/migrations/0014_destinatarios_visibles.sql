-- 0014 — La aplicacion necesita saber CON QUIEN puede compartir.
--
-- Compartir un analisis exige comprobar que el destinatario sea miembro activo
-- del mismo tenant y tenga la finalidad concedida. Esa comprobacion vive en la
-- API, pero el rol de la aplicacion no tenia SELECT sobre `memberships` ni
-- sobre `purpose_grants`, asi que la operacion terminaba en 500.
--
-- Se concede SELECT y se acota con RLS al tenant del contexto: la aplicacion
-- puede ver quienes son sus companeros de espacio, que es exactamente lo que
-- necesita un selector de destinatarios, y nada de otro espacio.
--
-- Sigue sin poder escribir: otorgar membresias y permisos es tarea
-- administrativa, no de la API de usuario.

grant select on memberships to kaizen_app;
grant select on purpose_grants to kaizen_app;

create policy memberships_del_tenant on memberships for select
  using (tenant_id = app.current_tenant());

create policy grants_del_tenant on purpose_grants for select
  using (tenant_id = app.current_tenant());
