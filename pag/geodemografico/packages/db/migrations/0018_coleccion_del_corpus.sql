-- 0018 — La coleccion pertenece al CORPUS, no a la conexion.
--
-- El problema: cada reconexion creaba una `source_collections` nueva, y con
-- ella un manifiesto vacio. Las decisiones de admision -que archivos puede
-- leer el asistente- quedaban colgadas de la coleccion vieja.
--
-- Efecto practico: reconectar Drive obligaba a volver a elegir los archivos
-- uno por uno, y no fallaba: el inventario decia "3 candidatos" como si fuera
-- la primera vez.
--
-- El modelo correcto: la coleccion es la CURADURIA del espacio y sobrevive a
-- los cambios de credencial. La conexion es solo por donde se lee.

-- Coleccion destino por corpus: la que mas decisiones humanas acumulo. Si
-- hay empate, la mas antigua. Consolidar hacia la que tiene mas admitidos
-- evita perder trabajo ya hecho.
create temporary table consolidacion on commit drop as
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

-- Las decisiones de admision de las colecciones sobrantes se PROMUEVEN a la
-- destino antes de borrarlas: una eleccion humana no se pierde por consolidar.
update collection_members destino
   set status = 'admitted',
       admitted_at = coalesce(destino.admitted_at, now())
  from collection_members otro
  join source_collections colOtro on colOtro.id = otro.collection_id
  join source_connections scOtro on scOtro.id = colOtro.connection_id
  join consolidacion c on c.corpus_id = scOtro.corpus_id
 where destino.collection_id = c.destino
   and destino.tenant_id = otro.tenant_id
   and destino.target_file_id = otro.target_file_id
   and otro.collection_id <> c.destino
   and otro.status = 'admitted'
   and destino.status <> 'admitted';

-- Se descartan los duplicados ya representados en la destino.
delete from collection_members otro
 using source_collections colOtro,
       source_connections scOtro,
       consolidacion c
 where colOtro.id = otro.collection_id
   and scOtro.id = colOtro.connection_id
   and c.corpus_id = scOtro.corpus_id
   and otro.collection_id <> c.destino
   and exists (
     select 1 from collection_members destino
      where destino.tenant_id = otro.tenant_id
        and destino.collection_id = c.destino
        and destino.target_file_id = otro.target_file_id
   );

-- Lo que queda sin equivalente se muda a la destino.
update collection_members otro
   set collection_id = c.destino
  from source_collections colOtro,
       source_connections scOtro,
       consolidacion c
 where colOtro.id = otro.collection_id
   and scOtro.id = colOtro.connection_id
   and c.corpus_id = scOtro.corpus_id
   and otro.collection_id <> c.destino;

delete from source_collections col
 using source_connections sc, consolidacion c
 where sc.tenant_id = col.tenant_id
   and sc.id = col.connection_id
   and c.corpus_id = sc.corpus_id
   and col.id <> c.destino;

-- La coleccion superviviente se reapunta a la conexion vigente del corpus.
update source_collections col
   set connection_id = vigente.id
  from consolidacion c
  join source_connections vigente
    on vigente.corpus_id = c.corpus_id and vigente.status = 'active'
 where col.id = c.destino;

-- Una sola coleccion por conexion. Al reconectar se REAPUNTA la existente.
create unique index source_collections_una_por_conexion
  on source_collections (connection_id);
