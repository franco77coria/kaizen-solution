# ADR 0005 — Alcance real del aislamiento por RLS

Fecha: 2026-09-20. Estado: aceptado. Ticket: 00.

## Decisión

Base compartida con RLS forzada y roles de mínimo privilegio, más particionado por tenant donde el rendimiento lo pida.

## Qué protege y qué no

RLS con contexto puesto por el backend es una defensa **contra errores de consulta**: un filtro olvidado devuelve cero filas en vez de datos ajenos. **No** es una garantía frente a un backend completamente comprometido, porque quien controle el proceso puede establecer el contexto que quiera.

Por eso se acumulan capas independientes:

- SQL parametrizado siempre; el modelo nunca redacta SQL ni elige tablas.
- Roles de runtime sin SUPERUSER, sin BYPASSRLS, sin propiedad de tablas y sin DDL. Verificado por prueba automática.
- Identidades de servicio separadas: API, worker de Drive, worker de embeddings, migraciones.
- Ninguna identidad de runtime puede cambiar IAM, otorgarse roles ni modificar políticas RLS.

Las particiones de Postgres ayudan al rendimiento; **no** equivalen a aislamiento físico.

## Cuándo cambiar de decisión

Si un contrato exige aislamiento frente al compromiso del backend o de credenciales de infraestructura, migrar a instancias y credenciales por alcaldía o por grupo de riesgo. El modelo de datos ya lo permite porque todo lleva `tenant_id`: el cambio es de despliegue, no de esquema.

## Prohibición

`SECURITY DEFINER` genérico está prohibido. Cualquier excepción requiere revisión específica y `search_path` fijado.
