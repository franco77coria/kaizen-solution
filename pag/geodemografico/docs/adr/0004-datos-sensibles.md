# ADR 0004 — Datos sensibles, logs y derivados

Fecha: 2026-09-20. Estado: aceptado. Ticket: 00.

## Decisión

1. **Los logs no contienen contenido.** `audit_events` registra actor, tenant, acción, recurso opaco, resultado, `request_id` y fecha. Nunca texto de reuniones, nombres de personas, tokens ni valores de parámetros de consulta.
2. El logger redacta por nombre de clave (`token`, `authorization`, `api_key`, `email`, `phone`, `documento`, `cedula`, `secret`, `password`, `cookie`, `refresh_token`) y trunca cadenas largas. La redacción es por defecto: un campo desconocido con forma de secreto se redacta igual.
3. Los tokens OAuth se guardan **cifrados** con AES-256-GCM en `token_vault`, con la clave en `TOKEN_VAULT_KEY`. Las tablas de conexión guardan una referencia, no el token.
4. Un grupo suprimido por umbral de anonimato **no aparece como cero**: aparece como suprimido. Un cero real y un cero por supresión son estados distintos y se serializan distinto.
5. No se muestran personas en coordenadas. Los mapas son coropléticos sobre unidades territoriales, nunca puntos sobre domicilios.
6. Los errores externos son **uniformes**: un conflicto de unicidad no puede revelar que un registro existe en otro tenant.

## Retención y borrado

- `deletion_tombstones` registra el alcance y el estado de purga de cada borrado, para que los derivados (chunks, embeddings, resúmenes, imágenes de análisis) se invaliden junto con la fuente.
- Revocar el acceso a una fuente invalida sus derivados y el historial que dependía de ella, mediante `authz_version` y `privacy_epoch`.
