-- 0012 — El worker necesita LEER las lapidas de borrado.
--
-- Tenia INSERT y UPDATE, pero no SELECT. Un `update ... where purge_status =
-- 'pending'` necesita leer esa columna, asi que el trabajo de purga habria
-- fallado con "permission denied" la primera vez que corriera en produccion.
--
-- Se concede SELECT, no mas: el worker sigue sin poder borrar lapidas, que es
-- justamente lo que las hace utiles como registro de lo que hay que purgar.
grant select on deletion_tombstones to kaizen_worker;
