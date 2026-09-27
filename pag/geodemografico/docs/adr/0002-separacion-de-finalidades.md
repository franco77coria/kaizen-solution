# ADR 0002 — Separación de finalidades (purpose)

Fecha: 2026-09-20. Estado: aceptado. Ticket: 00.

## Contexto

Un mismo tenant puede tratar datos con finalidades distintas: notas de reunión de gestión, y registros de personas con consentimiento para contacto. Mezclarlas es un problema legal antes que técnico: el consentimiento se otorga para una finalidad concreta.

## Decisión

1. `data_purposes` pertenece a un tenant. Cada corpus, conversación, ejecución analítica y análisis guardado referencia un `purpose_id` explícito.
2. Los permisos se conceden por la tripleta (usuario, tenant, propósito) en `purpose_grants`, con estado y expiración.
3. Permisos distintos y no implicados entre sí:
   - `notes.read` — leer notas del corpus documental.
   - `sources.manage` — configurar y sincronizar la fuente compartida.
   - `analytics.aggregate` — ejecutar consultas agregadas.
   - `records.capture`, `records.review`, `records.read_sensitive` — captura, revisión y consulta nominal.
   - `analyses.save`, `analyses.share` — guardar y compartir análisis.
4. **Una consulta no puede mezclar dos propósitos.** El enrutador del chat resuelve un único propósito por petición y lo registra.
5. Consentimiento y apoyo son campos distintos y no se derivan uno del otro.

## Consecuencias

- Las pruebas de aislamiento cubren dos casos, no uno: dos tenants distintos y dos propósitos del mismo tenant.
- El piloto interno de Kaizen usa el propósito `prueba_documental_empresa`, que no concede ningún acceso a datos de campañas.

## Prohibiciones explícitas

- No inferir preferencia política ni generar estrategias de persuasión. No existe un endpoint que lo permita.
- No importar datos de gestión pública a una campaña por pertenecer al mismo municipio.
