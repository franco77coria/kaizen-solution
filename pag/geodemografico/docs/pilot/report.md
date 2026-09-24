# Reporte del piloto — gerencia@kaizensolutionscol.com

> **Este documento está VACÍO a propósito.** Es la plantilla que exige la
> sección 21.4 del plan. No se puede completar hasta que exista el OAuth real
> de Drive y se hayan leído notas reales.
>
> No completar ninguna celda con datos de los fixtures. Si una fila no se pudo
> medir, escribir «no medido» y por qué. Un reporte con números inventados es
> peor que uno incompleto: alguien lo va a citar.

| Campo | Valor |
|---|---|
| Fecha de ejecución | _pendiente_ |
| Versión de código (commit) | _pendiente_ |
| Versión de prompt | `respuesta-con-citas-v1` |
| Modelo y versión | _pendiente — el adaptador nunca se llamó_ |
| Versión de pipeline de ingesta | `chunk-estructural-v1` / parser `docs-tabs-v1` |
| Scope de Drive concedido | _pendiente_ |

## Cobertura del inventario

| Métrica | Valor |
|---|---|
| Documentos candidatos encontrados | _pendiente_ |
| Documentos admitidos | _pendiente_ |
| Pendientes de selección manual | _pendiente_ |
| Duplicados por acceso directo | _pendiente_ |
| Ubicaciones distintas cubiertas | _pendiente_ |
| Reuniones identificadas | _pendiente_ |
| Documentos **sin** reunión identificada | _pendiente_ |
| Extracciones incompletas | _pendiente_ |

Si el inventario quedó truncado o faltaron scopes, decirlo acá. La interfaz no
dice «listo» en ese caso y este reporte tampoco debe hacerlo.

## Evaluación de preguntas

Conjunto de 30 preguntas revisadas por gerencia: 15 hechos puntuales, 5
búsquedas entre reuniones, 5 de fechas/nombres/decisiones y 5 **sin respuesta**
en las fuentes.

| Criterio | Objetivo | Resultado |
|---|---|---|
| Respuestas correctas según rúbrica humana | ≥ 27/30 | _pendiente_ |
| Abstenciones correctas en casos sin evidencia | 5/5 | _pendiente_ |
| Fuentes e IDs citados válidos y accesibles | 100% | _pendiente_ |
| Respuestas inventadas | 0 | _pendiente_ |

Este conjunto es un **gate funcional**, no una garantía estadística. Treinta
preguntas no miden la calidad del sistema; sirven para decidir si se puede
seguir.

## Aislamiento

| Prueba | Resultado |
|---|---|
| Datos cruzados en pruebas A/B | _pendiente_ (objetivo: 0) |
| Archivos de Drive alterados por el conector | _pendiente_ (objetivo: 0) |
| Conteo de reuniones sin duplicados | _pendiente_ |

**Cualquier fallo de autorización o divulgación impide ampliar, aunque el
promedio de respuestas sea bueno.**

## Cambios, revocación y borrado

| Escenario | Resultado |
|---|---|
| Mover un archivo de carpeta no lo pierde | _pendiente_ |
| Retirar acceso bloquea el documento y sus derivados | _pendiente_ |
| Reconectar no duplica el índice | _pendiente_ |
| Renombrar no crea un documento nuevo | _pendiente_ |

Usar un documento de prueba creado por el usuario para esto. **No editar ni
revocar documentos de trabajo reales** sin una acción explícita suya.

## Latencia y costo

| Etapa | Medición |
|---|---|
| Recuperación | _pendiente_ |
| Llamada al modelo | _pendiente_ |
| Total por pregunta | _pendiente_ |
| Tokens consumidos (generación) | _pendiente_ |
| Tokens consumidos (embeddings) | _pendiente_ |
| Lecturas de Drive | _pendiente_ |
| Costo del período | _pendiente_ |

## Fallos encontrados

_Listar cada uno con su reproducción. Un piloto sin fallos encontrados
normalmente significa que no se buscó bien._

## Criterio de ampliación

- [ ] Sin fallos críticos de autorización ni divulgación
- [ ] ≥ 27/30 respuestas correctas y 5/5 abstenciones
- [ ] 100% de citas válidas y accesibles
- [ ] Cero alteraciones en Drive
- [ ] Latencia y costo dentro de lo acordado
- [ ] Ninguna mezcla entre datos de empresa y de campañas

**Decisión:** _pendiente_

---

_Este reporte no incluye transcripciones, tokens OAuth ni información
empresarial sensible. Si hace falta adjuntar evidencia, referenciarla, no
copiarla._
