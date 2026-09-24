-- 0019 — El invariante "una coleccion por corpus" lo hace cumplir la BASE.
--
-- La 0018 consolido las colecciones a una por corpus y dejo un indice unico
-- por `connection_id`. Ese indice dice algo verdadero pero insuficiente: impide
-- dos colecciones en la MISMA conexion, no dos en el mismo corpus. Como la
-- consolidacion fue una limpieza de una sola vez, nada evitaba que el corpus
-- volviera a juntar dos, y volvio a pasar.
--
-- Sintoma, que no se parece a la causa: reconectar Drive devolvia 500 con
--   duplicate key value violates unique constraint
--   "source_collections_una_por_conexion"
-- El reapuntado de la 0018 hacia `update ... set connection_id = <nueva>` sobre
-- TODAS las colecciones del corpus; con dos, las dos caian en el mismo valor.
--
-- El arreglo no es filtrar a una en el UPDATE -eso deja el invariante en manos
-- del codigo, que es de donde se escapo-: es darle a la coleccion un
-- `corpus_id` propio y un indice unico encima. Asi el reapuntado pasa a ser
-- una sola fila por definicion, y una segunda coleccion es imposible de
-- insertar aunque alguien lo intente desde otra ruta.

-- ---------------------------------------------------------------------------
-- 1. Consolidar lo que ya este duplicado.
-- ---------------------------------------------------------------------------
-- Misma regla que la 0018: sobrevive la que acumulo mas decisiones humanas y,
-- ante empate, la mas antigua. Consolidar hacia la mas trabajada evita tirar
-- curaduria que alguien hizo a mano.
create temporary table consolidacion_19 on commit drop as
select distinct on (sc.corpus_id)
       sc.corpus_id,
       col.tenant_id,
       col.id as destino
  from source_collections col
  join source_connections sc on sc.tenant_id = col.tenant_id and sc.id = col.connection_id
  left join collection_members cm
         on cm.tenant_id = col.tenant_id
        and cm.collection_id = col.id
        and cm.status = 'admitted'
 group by sc.corpus_id, col.tenant_id, col.id, col.created_at
 order by sc.corpus_id, count(cm.id) desc, col.created_at asc;

-- Una admision ya tomada en otra coleccion se PROMUEVE en la destino: la
-- decision es del humano, no de la fila.
update collection_members destino
   set status = 'admitted',
       admitted_at = coalesce(destino.admitted_at, now())
  from collection_members otro
  join source_collections col_otro on col_otro.id = otro.collection_id
  join source_connections sc_otro on sc_otro.id = col_otro.connection_id
  join consolidacion_19 c on c.corpus_id = sc_otro.corpus_id
 where destino.collection_id = c.destino
   and destino.tenant_id = otro.tenant_id
   and destino.target_file_id = otro.target_file_id
   and otro.collection_id <> c.destino
   and otro.status = 'admitted'
   and destino.status <> 'admitted';

-- Los duplicados ya representados en la destino se descartan.
delete from collection_members otro
 using source_collections col_otro,
       source_connections sc_otro,
       consolidacion_19 c
 where col_otro.id = otro.collection_id
   and sc_otro.id = col_otro.connection_id
   and c.corpus_id = sc_otro.corpus_id
   and otro.collection_id <> c.destino
   and exists (
     select 1 from collection_members destino
      where destino.tenant_id = otro.tenant_id
        and destino.collection_id = c.destino
        and destino.target_file_id = otro.target_file_id
   );

-- Lo que no tiene equivalente se muda.
update collection_members otro
   set collection_id = c.destino
  from source_collections col_otro,
       source_connections sc_otro,
       consolidacion_19 c
 where col_otro.id = otro.collection_id
   and sc_otro.id = col_otro.connection_id
   and c.corpus_id = sc_otro.corpus_id
   and otro.collection_id <> c.destino;

delete from source_collections col
 using source_connections sc, consolidacion_19 c
 where sc.tenant_id = col.tenant_id
   and sc.id = col.connection_id
   and c.corpus_id = sc.corpus_id
   and col.id <> c.destino;

-- ---------------------------------------------------------------------------
-- 2. La pertenencia al corpus pasa a ser explicita.
-- ---------------------------------------------------------------------------
-- Hasta ahora el corpus de una coleccion se deducia saltando por la conexion.
-- Esa indireccion es justamente lo que impedia expresar el invariante como
-- una restriccion: no se puede poner un indice unico sobre una columna que
-- vive en otra tabla.
alter table source_collections add column corpus_id uuid;

update source_collections col
   set corpus_id = sc.corpus_id
  from source_connections sc
 where sc.tenant_id = col.tenant_id
   and sc.id = col.connection_id;

alter table source_collections alter column corpus_id set not null;

-- Para que `corpus_id` no pueda alejarse del corpus de su conexion, la clave
-- foranea incluye las tres columnas: la coleccion, su conexion y su corpus
-- tienen que ser consistentes entre si. Sin esto, `corpus_id` seria una copia
-- que se puede desincronizar en silencio -el mismo error que esta migracion
-- corrige, una capa mas abajo.
alter table source_connections
  add constraint sourceconn_id_corpus_unico unique (tenant_id, id, corpus_id);

alter table source_collections
  add constraint sourcecoll_corpus_coincide_con_conexion
  foreign key (tenant_id, connection_id, corpus_id)
  references source_connections (tenant_id, id, corpus_id)
  on delete cascade;

-- El invariante, ahora si, en la base. La 0018 lo declaraba en su titulo y lo
-- sostenia solo su limpieza inicial.
create unique index source_collections_una_por_corpus
  on source_collections (corpus_id);

-- La FK compuesta necesita este indice para no hacer un seq scan en cada
-- verificacion.
create index source_collections_conexion_corpus
  on source_collections (tenant_id, connection_id, corpus_id);

-- ---------------------------------------------------------------------------
-- 3. Comprobacion: la migracion falla si el invariante no quedo firme.
-- ---------------------------------------------------------------------------
-- Una migracion de consolidacion que "corre bien" y deja duplicados es
-- exactamente como se llego hasta aca.
do $$
declare
  duplicados integer;
begin
  select count(*) into duplicados
    from (select corpus_id from source_collections group by corpus_id having count(*) > 1) d;

  if duplicados > 0 then
    raise exception 'quedaron % corpus con mas de una coleccion', duplicados;
  end if;
end $$;
