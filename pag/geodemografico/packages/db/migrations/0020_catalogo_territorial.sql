-- 0020 — El catalogo territorial vive en la base, con su provincia, y se hace
-- cumplir.
--
-- Dos huecos que no fallaban:
--
-- 1. `municipality_catalog` solo se llenaba desde el seed de DESARROLLO. En una
--    base de produccion recien migrada quedaba vacia, y nada lo notaba porque
--    las etiquetas salen del paquete de geografia, no de la tabla.
--
-- 2. `person_records.municipality_code` solo tenia un regex de cinco digitos.
--    El endpoint aceptaba '25999' (no existe) o '11001' (Bogota, excluida a
--    proposito). Esa persona se contaba en el total pero no tenia celda en el
--    mapa: el territorio y el total dejaban de cerrar sin ningun error. Que el
--    formulario solo ofrezca los 116 no es un control: el endpoint se llama
--    con curl.
--
-- Las filas de abajo NO se escriben a mano: salen de
-- `node scripts/generar-catalogo-sql.mjs`, y `catalogo-sql.test.ts` falla si
-- dejan de coincidir con `packages/geography`.

alter table municipality_catalog
  add column display_name text,
  add column province_id text,
  add column province_name text;

insert into municipality_catalog
  (code, name, display_name, province_id, province_name,
   department_code, department_name, in_project_scope, note)
select v.code, v.name, v.display_name, v.province_id, v.province_name,
       '25', 'Cundinamarca', true,
       'transcrito de DIVIPOLA; provincia transcrita de la division departamental; pendiente de cotejo'
  from (values
  ('25001', 'Agua de Dios', 'Agua de Dios', 'alto_magdalena', 'Alto Magdalena'),
  ('25019', 'Alban', 'Albán', 'gualiva', 'Gualivá'),
  ('25035', 'Anapoima', 'Anapoima', 'tequendama', 'Tequendama'),
  ('25040', 'Anolaima', 'Anolaima', 'tequendama', 'Tequendama'),
  ('25053', 'Arbelaez', 'Arbeláez', 'sumapaz', 'Sumapaz'),
  ('25086', 'Beltran', 'Beltrán', 'magdalena_centro', 'Magdalena Centro'),
  ('25095', 'Bituima', 'Bituima', 'magdalena_centro', 'Magdalena Centro'),
  ('25099', 'Bojaca', 'Bojacá', 'sabana_occidente', 'Sabana Occidente'),
  ('25120', 'Cabrera', 'Cabrera', 'sumapaz', 'Sumapaz'),
  ('25123', 'Cachipay', 'Cachipay', 'tequendama', 'Tequendama'),
  ('25126', 'Cajica', 'Cajicá', 'sabana_centro', 'Sabana Centro'),
  ('25148', 'Caparrapi', 'Caparrapí', 'bajo_magdalena', 'Bajo Magdalena'),
  ('25151', 'Caqueza', 'Cáqueza', 'oriente', 'Oriente'),
  ('25154', 'Carmen de Carupa', 'Carmen de Carupa', 'ubate', 'Ubaté'),
  ('25168', 'Chaguani', 'Chaguaní', 'magdalena_centro', 'Magdalena Centro'),
  ('25175', 'Chia', 'Chía', 'sabana_centro', 'Sabana Centro'),
  ('25178', 'Chipaque', 'Chipaque', 'oriente', 'Oriente'),
  ('25181', 'Choachi', 'Choachí', 'oriente', 'Oriente'),
  ('25183', 'Choconta', 'Chocontá', 'almeidas', 'Almeidas'),
  ('25200', 'Cogua', 'Cogua', 'sabana_centro', 'Sabana Centro'),
  ('25214', 'Cota', 'Cota', 'sabana_centro', 'Sabana Centro'),
  ('25224', 'Cucunuba', 'Cucunubá', 'ubate', 'Ubaté'),
  ('25245', 'El Colegio', 'El Colegio', 'tequendama', 'Tequendama'),
  ('25258', 'El Penon', 'El Peñón', 'rionegro', 'Rionegro'),
  ('25260', 'El Rosal', 'El Rosal', 'sabana_occidente', 'Sabana Occidente'),
  ('25269', 'Facatativa', 'Facatativá', 'sabana_occidente', 'Sabana Occidente'),
  ('25279', 'Fomeque', 'Fómeque', 'oriente', 'Oriente'),
  ('25281', 'Fosca', 'Fosca', 'oriente', 'Oriente'),
  ('25286', 'Funza', 'Funza', 'sabana_occidente', 'Sabana Occidente'),
  ('25288', 'Fuquene', 'Fúquene', 'ubate', 'Ubaté'),
  ('25290', 'Fusagasuga', 'Fusagasugá', 'sumapaz', 'Sumapaz'),
  ('25293', 'Gachala', 'Gachalá', 'guavio', 'Guavio'),
  ('25295', 'Gachancipa', 'Gachancipá', 'sabana_centro', 'Sabana Centro'),
  ('25297', 'Gacheta', 'Gachetá', 'guavio', 'Guavio'),
  ('25299', 'Gama', 'Gama', 'guavio', 'Guavio'),
  ('25307', 'Girardot', 'Girardot', 'alto_magdalena', 'Alto Magdalena'),
  ('25312', 'Granada', 'Granada', 'sumapaz', 'Sumapaz'),
  ('25317', 'Guacheta', 'Guachetá', 'ubate', 'Ubaté'),
  ('25320', 'Guaduas', 'Guaduas', 'bajo_magdalena', 'Bajo Magdalena'),
  ('25322', 'Guasca', 'Guasca', 'guavio', 'Guavio'),
  ('25324', 'Guataqui', 'Guataquí', 'alto_magdalena', 'Alto Magdalena'),
  ('25326', 'Guatavita', 'Guatavita', 'guavio', 'Guavio'),
  ('25328', 'Guayabal de Siquima', 'Guayabal de Síquima', 'magdalena_centro', 'Magdalena Centro'),
  ('25335', 'Guayabetal', 'Guayabetal', 'oriente', 'Oriente'),
  ('25339', 'Gutierrez', 'Gutiérrez', 'oriente', 'Oriente'),
  ('25368', 'Jerusalen', 'Jerusalén', 'alto_magdalena', 'Alto Magdalena'),
  ('25372', 'Junin', 'Junín', 'guavio', 'Guavio'),
  ('25377', 'La Calera', 'La Calera', 'guavio', 'Guavio'),
  ('25386', 'La Mesa', 'La Mesa', 'tequendama', 'Tequendama'),
  ('25394', 'La Palma', 'La Palma', 'rionegro', 'Rionegro'),
  ('25398', 'La Pena', 'La Peña', 'gualiva', 'Gualivá'),
  ('25402', 'La Vega', 'La Vega', 'gualiva', 'Gualivá'),
  ('25407', 'Lenguazaque', 'Lenguazaque', 'ubate', 'Ubaté'),
  ('25426', 'Macheta', 'Machetá', 'almeidas', 'Almeidas'),
  ('25430', 'Madrid', 'Madrid', 'sabana_occidente', 'Sabana Occidente'),
  ('25436', 'Manta', 'Manta', 'almeidas', 'Almeidas'),
  ('25438', 'Medina', 'Medina', 'medina', 'Medina'),
  ('25473', 'Mosquera', 'Mosquera', 'sabana_occidente', 'Sabana Occidente'),
  ('25483', 'Narino', 'Nariño', 'alto_magdalena', 'Alto Magdalena'),
  ('25486', 'Nemocon', 'Nemocón', 'sabana_centro', 'Sabana Centro'),
  ('25488', 'Nilo', 'Nilo', 'alto_magdalena', 'Alto Magdalena'),
  ('25489', 'Nimaima', 'Nimaima', 'gualiva', 'Gualivá'),
  ('25491', 'Nocaima', 'Nocaima', 'gualiva', 'Gualivá'),
  ('25506', 'Venecia', 'Venecia', 'sumapaz', 'Sumapaz'),
  ('25513', 'Pacho', 'Pacho', 'rionegro', 'Rionegro'),
  ('25518', 'Paime', 'Paime', 'rionegro', 'Rionegro'),
  ('25524', 'Pandi', 'Pandi', 'sumapaz', 'Sumapaz'),
  ('25530', 'Paratebueno', 'Paratebueno', 'medina', 'Medina'),
  ('25535', 'Pasca', 'Pasca', 'sumapaz', 'Sumapaz'),
  ('25572', 'Puerto Salgar', 'Puerto Salgar', 'bajo_magdalena', 'Bajo Magdalena'),
  ('25580', 'Puli', 'Pulí', 'magdalena_centro', 'Magdalena Centro'),
  ('25592', 'Quebradanegra', 'Quebradanegra', 'gualiva', 'Gualivá'),
  ('25594', 'Quetame', 'Quetame', 'oriente', 'Oriente'),
  ('25596', 'Quipile', 'Quipile', 'tequendama', 'Tequendama'),
  ('25599', 'Apulo', 'Apulo', 'tequendama', 'Tequendama'),
  ('25612', 'Ricaurte', 'Ricaurte', 'alto_magdalena', 'Alto Magdalena'),
  ('25645', 'San Antonio del Tequendama', 'San Antonio del Tequendama', 'tequendama', 'Tequendama'),
  ('25649', 'San Bernardo', 'San Bernardo', 'sumapaz', 'Sumapaz'),
  ('25653', 'San Cayetano', 'San Cayetano', 'rionegro', 'Rionegro'),
  ('25658', 'San Francisco', 'San Francisco', 'gualiva', 'Gualivá'),
  ('25662', 'San Juan de Rioseco', 'San Juan de Rioseco', 'magdalena_centro', 'Magdalena Centro'),
  ('25718', 'Sasaima', 'Sasaima', 'gualiva', 'Gualivá'),
  ('25736', 'Sesquile', 'Sesquilé', 'almeidas', 'Almeidas'),
  ('25740', 'Sibate', 'Sibaté', 'soacha', 'Soacha'),
  ('25743', 'Silvania', 'Silvania', 'sumapaz', 'Sumapaz'),
  ('25745', 'Simijaca', 'Simijaca', 'ubate', 'Ubaté'),
  ('25754', 'Soacha', 'Soacha', 'soacha', 'Soacha'),
  ('25758', 'Sopo', 'Sopó', 'sabana_centro', 'Sabana Centro'),
  ('25769', 'Subachoque', 'Subachoque', 'sabana_occidente', 'Sabana Occidente'),
  ('25772', 'Suesca', 'Suesca', 'almeidas', 'Almeidas'),
  ('25777', 'Supata', 'Supatá', 'gualiva', 'Gualivá'),
  ('25779', 'Susa', 'Susa', 'ubate', 'Ubaté'),
  ('25781', 'Sutatausa', 'Sutatausa', 'ubate', 'Ubaté'),
  ('25785', 'Tabio', 'Tabio', 'sabana_centro', 'Sabana Centro'),
  ('25793', 'Tausa', 'Tausa', 'ubate', 'Ubaté'),
  ('25797', 'Tena', 'Tena', 'tequendama', 'Tequendama'),
  ('25799', 'Tenjo', 'Tenjo', 'sabana_centro', 'Sabana Centro'),
  ('25805', 'Tibacuy', 'Tibacuy', 'sumapaz', 'Sumapaz'),
  ('25807', 'Tibirita', 'Tibirita', 'almeidas', 'Almeidas'),
  ('25815', 'Tocaima', 'Tocaima', 'alto_magdalena', 'Alto Magdalena'),
  ('25817', 'Tocancipa', 'Tocancipá', 'sabana_centro', 'Sabana Centro'),
  ('25823', 'Topaipi', 'Topaipí', 'rionegro', 'Rionegro'),
  ('25839', 'Ubala', 'Ubalá', 'guavio', 'Guavio'),
  ('25841', 'Ubaque', 'Ubaque', 'oriente', 'Oriente'),
  ('25843', 'Villa de San Diego de Ubate', 'Villa de San Diego de Ubaté', 'ubate', 'Ubaté'),
  ('25845', 'Une', 'Une', 'oriente', 'Oriente'),
  ('25851', 'Utica', 'Útica', 'gualiva', 'Gualivá'),
  ('25862', 'Vergara', 'Vergara', 'gualiva', 'Gualivá'),
  ('25867', 'Viani', 'Vianí', 'magdalena_centro', 'Magdalena Centro'),
  ('25871', 'Villagomez', 'Villagómez', 'rionegro', 'Rionegro'),
  ('25873', 'Villapinzon', 'Villapinzón', 'almeidas', 'Almeidas'),
  ('25875', 'Villeta', 'Villeta', 'gualiva', 'Gualivá'),
  ('25878', 'Viota', 'Viotá', 'tequendama', 'Tequendama'),
  ('25885', 'Yacopi', 'Yacopí', 'rionegro', 'Rionegro'),
  ('25898', 'Zipacon', 'Zipacón', 'sabana_occidente', 'Sabana Occidente'),
  ('25899', 'Zipaquira', 'Zipaquirá', 'sabana_centro', 'Sabana Centro')
  ) as v(code, name, display_name, province_id, province_name)
on conflict (code) do update
  set name = excluded.name,
      display_name = excluded.display_name,
      province_id = excluded.province_id,
      province_name = excluded.province_name,
      note = excluded.note;

alter table municipality_catalog
  alter column display_name set not null,
  alter column province_id set not null,
  alter column province_name set not null;

create index municipality_catalog_provincia on municipality_catalog (province_id);

-- La base rechaza lo que no existe en el territorio del proyecto. La
-- restriccion se crea VALIDADA: si hubiera un registro con un codigo invalido,
-- la migracion falla y lo muestra, en vez de dejarlo pasar con `not valid`.
alter table person_records
  add constraint person_records_municipio_del_catalogo
  foreign key (municipality_code) references municipality_catalog (code);

do $$
declare
  n integer;
begin
  select count(*) into n from municipality_catalog where in_project_scope;
  if n <> 116 then
    raise exception 'el catalogo quedo con % municipios y se esperan 116', n;
  end if;
  select count(distinct province_id) into n from municipality_catalog;
  if n <> 15 then
    raise exception 'el catalogo quedo con % provincias y se esperan 15', n;
  end if;
end $$;
