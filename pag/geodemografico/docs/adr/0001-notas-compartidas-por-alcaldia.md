# ADR 0001 — Notas compartidas por alcaldía, chats y análisis privados

Fecha: 2026-09-20. Estado: aceptado. Ticket: 00.

## Contexto

Cada alcaldía es un espacio de trabajo con varios miembros. Las notas de reunión deben poder leerse entre los miembros autorizados de esa alcaldía, pero nunca cruzarse con otra. Los chats y los análisis guardados son trabajo personal.

## Decisión

1. La unidad de aislamiento es el **tenant**. Un tenant = una alcaldía, una campaña o el piloto interno de Kaizen.
2. Las notas viven en un **corpus** de tipo `tenant_shared` que pertenece a un tenant y a un propósito. Todo miembro con permiso `notes.read` sobre ese propósito lee ese corpus.
3. Los **chats** y los **análisis guardados** llevan `owner_user_id` y son privados por defecto. Se comparten solo mediante una concesión explícita creada por una acción de usuario y autorizada por el backend.
4. La membresía en un tenant **no** abre todos sus propósitos. `purpose_grants` es una asignación explícita y adicional.
5. Pertenecer al dominio corporativo **no** concede membresía. La identidad se resuelve por `(issuer, subject)`; el email es solo texto para mostrar.

## Consecuencias

- Toda tabla de negocio lleva `tenant_id`. Todo dato privado lleva además `corpus_id` o `owner_user_id`.
- Las claves foráneas son **compuestas** e incluyen `tenant_id`, para que la base rechace una relación cruzada aunque la consulta esté mal escrita.
- RLS se activa y se **fuerza**, de modo que alcance también al propietario de la tabla.
- Sin contexto de transacción establecido, las políticas deniegan todo: una consulta que olvide el contexto devuelve cero filas, no filas de otro tenant.

## Alternativas descartadas

- **Una base por alcaldía (116 bases).** El volumen y la carga no lo justifican hoy y multiplica la operación. Se reconsidera si un contrato exige aislamiento frente al compromiso del backend; ver ADR 0005.
- **Filtrar solo en el código de aplicación.** Un filtro por tenant olvidado no falla: devuelve datos de otro. RLS convierte ese olvido en cero filas.
