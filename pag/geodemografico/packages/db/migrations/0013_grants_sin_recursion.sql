-- 0013 — Rompe la recursion mutua entre las politicas de analyses y grants.
--
-- El problema: la politica de `analyses` preguntaba "existe una concesion para
-- mi?" y la de `analysis_grants` preguntaba "soy dueno del analisis?". Cada
-- una disparaba la otra y Postgres abortaba con
-- "infinite recursion detected in policy for relation analyses".
--
-- No es un detalle de rendimiento: la operacion fallaba entera, con 500.
--
-- La correccion: la politica de LECTURA de `analysis_grants` se sostiene solo
-- en columnas de su propia fila. `granted_by` ya guarda quien otorgo, asi que
-- no hace falta consultar `analyses` para saber quien puede ver la concesion.
--
-- La comprobacion de propiedad sigue existiendo, pero solo en las politicas de
-- ESCRITURA, que se evaluan en un sentido y no cierran el ciclo.

drop policy analysis_grants_visibles on analysis_grants;

-- LECTURA: la ve quien la recibio y quien la otorgo. Sin subconsultas.
create policy analysis_grants_lectura on analysis_grants for select
  using (
    tenant_id = app.current_tenant()
    and (
      grantee_user_id = app.current_user_id()
      or granted_by = app.current_user_id()
    )
  );

-- ALTA: solo el propietario del analisis puede compartirlo, y la fila tiene
-- que registrarlo a el como otorgante. Sin esa segunda condicion, alguien
-- podria crear una concesion atribuida a otra persona.
create policy analysis_grants_alta on analysis_grants for insert
  with check (
    tenant_id = app.current_tenant()
    and granted_by = app.current_user_id()
    and exists (
      select 1 from analyses a
       where a.tenant_id = analysis_grants.tenant_id
         and a.id = analysis_grants.analysis_id
         and a.owner_user_id = app.current_user_id()
    )
  );

-- REVOCACION: tambien solo el otorgante.
create policy analysis_grants_revocacion on analysis_grants for update
  using (tenant_id = app.current_tenant() and granted_by = app.current_user_id())
  with check (tenant_id = app.current_tenant() and granted_by = app.current_user_id());

create policy analysis_grants_borrado on analysis_grants for delete
  using (tenant_id = app.current_tenant() and granted_by = app.current_user_id());
