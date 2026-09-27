# ADR 0003 — Proveedor de modelo, región y tratamiento

Fecha: 2026-09-20. Estado: **parcialmente bloqueado**. Ticket: 00.

## Decisión tomada

- Adaptador de modelo detrás de la interfaz `LlmAdapter` en `packages/llm`. Implementaciones: `gemini_developer` y `fake`.
- Modelo seleccionado por el usuario: `gemini-3.7-flash`, con nivel de thinking inicial `low` para chat breve.
- La credencial se lee del entorno (`GEMINI_API_KEY`) o, solo en desarrollo, de un archivo local indicado por `GEMINI_API_KEY_FILE`. Nunca se imprime, versiona, indexa ni adjunta.
- El adaptador `fake` es determinista y es el que se usa en todas las pruebas y en el desarrollo local. No hace red.

## Lo que este ADR NO afirma

La documentación consultada identifica `gemini-3.7-flash` como modelo estable, pero la disponibilidad documental **no demuestra acceso, cuota ni latencia** en el proyecto de Kaizen. Durante esta implementación no se realizó ninguna llamada real al proveedor. La verificación está implementada y lista para ejecutarse, pero su resultado queda pendiente de que exista una credencial válida en el entorno.

## Bloqueos declarados

| ID | Bloqueo | Qué impide | Quién lo resuelve |
|---|---|---|---|
| B1 | Proyecto Google Cloud con facturación y cuotas | Llamar al modelo y a embeddings con datos reales | Usuario |
| B2 | Región y condiciones de tratamiento y retención para Colombia | Cargar datos reales a producción | Usuario y asesoría legal |
| B3 | Tipo de credencial aportada (Developer API frente a Vertex/IAM) | Elegir adaptador definitivo | Usuario |

Mientras B1 a B3 sigan abiertos, el adaptador real queda **deshabilitado con estado explícito** y la aplicación funciona con `LLM_PROVIDER=fake`. No se degrada ningún control por ello.

## Regla de operación

No confundir "no se usa para entrenar" con "no se retiene". Hay monitoreo de abuso, cachés y funciones específicas. Datos sintéticos en servicios no contratados; para datos reales, documentar servicio, tratamiento, retención y excepciones.
