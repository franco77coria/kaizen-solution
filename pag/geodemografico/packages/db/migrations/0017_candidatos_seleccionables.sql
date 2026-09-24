-- 0017 — Metadata de los candidatos, para poder elegirlos.
--
-- El inventario registraba solo los identificadores del proveedor. Con eso es
-- imposible construir la pantalla que exige la seccion 21.2 del plan: mostrar
-- titulo, tipo, fecha conocida y ubicacion para que una persona confirme la
-- coleccion inicial.
--
-- Sin esta metadata, un archivo ambiguo queda pendiente para siempre: no entra
-- solo (correcto) y nadie puede admitirlo (fallo).
--
-- Lo que se guarda es metadata de LISTADO, no contenido: nunca se descarga el
-- cuerpo de un archivo que no fue admitido.

alter table collection_members
  add column display_name text,
  add column mime_type text,
  add column modified_at timestamptz,
  -- Carpeta contenedora, solo para orientar a quien elige. NO define
  -- pertenencia: la coleccion es virtual y va por ID de archivo.
  add column location_hint text,
  -- Por que el clasificador lo propuso. Se muestra para que la decision sea
  -- informada y quede claro que fue una pista, no una certeza.
  add column classification_reason text,
  -- true cuando el proveedor confirmo que es un artefacto de reunion.
  add column provider_confirmed boolean not null default false,
  add column reviewed_by uuid,
  add column reviewed_at timestamptz;

comment on column collection_members.location_hint is
  'Carpeta de origen, solo informativa. La pertenencia es por target_file_id.';

-- La aplicacion necesita poder ADMITIR o descartar candidatos.
grant insert, update on collection_members to kaizen_app;
