-- 0028 — Una respuesta de SUMA puede estar respaldada por datos.
--
-- Cuando la pregunta es un conteo ("cuantas personas se sumaron en Chia"),
-- SUMA ejecuta una consulta analitica cerrada y la respuesta es su resultado:
-- el numero sale de la base, nunca del modelo. El mensaje guarda QUE ejecucion
-- lo respalda, para volver a mostrar la tabla al recargar la conversacion y
-- para poder exportarla a un dashboard.
alter table messages add column analytics_run_id uuid;

-- La ejecucion tiene que ser del mismo espacio. Si alguna vez se borra, el
-- mensaje se queda sin datos, no desaparece (solo esa columna pasa a null).
alter table messages
  add constraint msg_run_del_mismo_tenant
  foreign key (tenant_id, analytics_run_id) references analytics_runs(tenant_id, id)
  on delete set null (analytics_run_id);
