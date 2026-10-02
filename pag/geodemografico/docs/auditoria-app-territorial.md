# Auditoría de /app y panorama territorial

Fecha: 2 de octubre de 2026. Copia de trabajo: `C:/kgeo/pag/geodemografico`.

## Integridad de implementación

Resultado: coherente con el producto. Se conserva Geist, la paleta forestal, los filtros múltiples, la separación de cero y supresión y el recorrido provincia → municipio → vereda. Se amplía la comparación con un gráfico de dos series independientes y una ficha ligada a la selección. Las referidas forman parte de las registradas: no se apilan, suman ni convierten en población.

El detector se ejecutó una vez sobre `apps/web/src`. Encontró cuatro transiciones de dimensiones en `paginas.css` (líneas originales 95, 372, 408 y 874). Las cuatro eran reales y se retiraron. La animación nueva del gráfico usa `transform`, dura 360 ms y se omite con movimiento reducido. No se ejecutó un segundo detector.

## Alcance y resultado

Se revisaron el shell y las importaciones de todas las rutas, estilos y tokens compartidos, las consultas territoriales, el manejo de cartografía y las dos vistas del mapa. Las verificaciones visuales e interactivas se concentraron en `/app/mapa`, en escritorio y teléfono, con una sesión efímera y datos sintéticos. No equivale a una auditoría de seguridad de toda la plataforma ni a mediciones de usuarios de producción.

| Dimensión | Antes / 4 | Después / 4 | Evidencia |
|---|---:|---:|---|
| Accesibilidad | 2 | 3 | Contraste secundario corregido, gráfico operable con teclado, foco en ficha y tabla equivalente. No se certificó con lector de pantalla. |
| Rendimiento | 1 | 3 | Cartografía ligera, preparación reutilizada, consultas cancelables y carga de rutas por demanda. Falta medir Core Web Vitals en producción. |
| Adaptación | 3 | 3 | Sin desborde a 390 px; cards con separación de 12 px y controles principales de 44 px. Las etiquetas removibles conservan un blanco de 24 px. |
| Tema | 3 | 3 | Colores a partir de tokens, contraste secundario corregido en ambos temas. Tema oscuro revisado en código, sin captura de sistema oscuro. |
| Integridad | 3 | 4 | Fuente original intacta, 116 municipios y 2.578 veredas comprobados, ausencia de cantidades inventadas en el gráfico. |
| **Total** | **12/20** | **16/20** | **Bueno: mejoras comprobadas y límites declarados.** |

Se identificaron nueve asuntos iniciales: cuatro P1 y cinco P2; ningún P0 en los recorridos comprobados. Ocho se corrigieron y uno queda como siguiente mejora. La revisión independiente añadió el estado de error del gráfico y la documentación desactualizada, corregidos en el cierre.

## Hallazgos y cambios

| Prioridad | Hallazgo y ubicación | Impacto y criterio | Acción / estado |
|---|---|---|---|
| P1 | Geometría de 8,2 MB en `MapaTerritorial.tsx` y `public/geo/municipios.json`. | Bloquea el hilo principal durante preparación y aumenta el costo del SVG. | Corregido con derivados de visualización, manteniendo archivos originales. `$impeccable optimize`. |
| P1 | Relectura y normalización esférica de límites al cambiar cada filtro geográfico. | Repite trabajo costoso al explorar. | Corregido con caché acotada de cartografía pública y normalización única; tablas y búsquedas memorizadas. `$impeccable optimize`. |
| P1 | Textos secundarios y placeholders con `--tinta-3` en `tokens.css`, `styles.css` y `chat.css`. | Contraste de texto pequeño inferior a 4,5:1 en superficies comunes; WCAG 1.4.3. | Corregido: `#858b90` → `#636b72`, 3,45:1 → 5,42:1 sobre blanco, 5,09:1 sobre lienzo. En oscuro, `#6f7773` → `#96a19b`, 3,82:1 → 6,58:1 sobre superficie. `$impeccable harden`. |
| P1 | Importación inmediata de todas las rutas y creación del índice veredal al importar `@kaizen/geography`. | Paga el costo de módulos no abiertos desde cualquier sección. | Corregido con `React.lazy` y creación diferida del índice dentro de `findVereda`; el generador conserva el cambio. `$impeccable optimize`. |
| P2 | Consultas a ambos indicadores sin cancelación al cambiar filtros. | Respuestas obsoletas continúan trabajando; volver al mismo filtro repite la consulta. | Corregido con `AbortSignal` y reutilización por hasta 60 segundos, sólo en memoria del componente, con claves de espacio, finalidad, permisos y filtros. Caché máxima de 12 consultas, limpiada al error o actualización manual; se destruye al desmontar. `$impeccable optimize`. |
| P2 | Cuatro animaciones de `width` / `height` en `paginas.css`. | Recalculan diseño durante toda la transición. | Corregido retirando las transiciones; se mantienen las medidas finales. `$impeccable animate`. |
| P2 | Indicadores contiguos y comparación exclusivamente tabular. | Mezcla los bloques visuales y dificulta comparar rápidamente la red. | Corregido con cards independientes, 18 px en escritorio / 12 px en móvil, primer indicador forestal y gráfico ligado a la ficha. `$impeccable layout` / `$impeccable bolder`. |
| P2 | Controles del mapa de 40 px, cierre de 28 px y filtros móviles compactos. | Menor facilidad de toque; objetivo de diseño 44 px, distinto del mínimo WCAG 2.5.8. | Corregido en zoom, cierre, vistas, acciones principales y filtros de tabla; quedan chips de 24 px. `$impeccable adapt`. |
| P2 | El contador de revisión del shell consulta la lista de pendientes al cambiar ruta (`App.tsx`). | Añade una consulta para quienes pueden revisar, aunque sólo se necesita una cantidad. | Pendiente: endpoint de conteo autorizado y actualización después de revisar; no reutilizar listas nominales en caché global. `$impeccable optimize`. |

## Mediciones reproducibles

`node scripts/territory-benchmark.mjs` compara cinco ejecuciones de parseo JSON, normalización, ajuste de proyección Mercator y generación del trazado SVG. Se informa la mediana. Es una prueba de CPU local en Node, no LCP, INP ni latencia de red del navegador.

| Medida municipal | Original | Vista ligera |
|---|---:|---:|
| Tamaño del texto JSON | 8.206.875 caracteres | 639.086 caracteres |
| Caracteres de trazado SVG en benchmark | 6.517.446 | 490.751 |
| Mediana de preparación | 1.867 ms | 136 ms |

Los 117 archivos suman 32.410.196 bytes originales y 3.550.799 bytes derivados: reducción conjunta del 89%. El SVG municipal observado en el navegador pasó de 6.517.325 a 491.403 caracteres; las diferencias con el benchmark provienen del tamaño del lienzo. Sigue mostrando 116 áreas municipales agrupadas en 15 provincias.

El build de Vite pasa de un archivo inicial de aproximadamente 750 KB / 179 KB gzip a 415,90 KB / 119,56 KB gzip. El mapa tiene su propio módulo de 286,74 KB / 48,18 KB gzip; Leaflet continúa separado y se abre con Vías y entorno. Los módulos diferidos siguen descargándose cuando son necesarios: la mejora de entrada no significa que todo el peso de la sesión desaparezca.

La simplificación se reproduce con `node scripts/territory-display.mjs`. Usa Mapshaper, 8% de puntos y `keep-shapes`, conserva atribución, vigencia y código, y recupera la geometría original si se perdería un componente. Las áreas aproximadas se calculan sobre el original. Los derivados se usan para dibujar; la descarga solicita el archivo original sólo al pedirla. No modifica el archivo fuente ni publica cifras o ubicaciones personales. Referencia técnica: [Mapshaper: simplify](https://mapshaper.org/docs/reference.html).

## Verificación

- Typecheck y lint del monorepo; build de los 16 paquetes y empaquetado de API/interfaz para Next completados.
- Suite final completa: **364 pruebas aprobadas en 29 archivos** (`pnpm test`).
- 20 pruebas focalizadas: API territorial, privacidad, cartografía y gráfico; 26 pruebas de cartografía, comparación y paquete geográfico tras diferir el índice.
- Tres pruebas de renderizado del gráfico añadidas por la revisión: fallo finaliza `aria-busy` y ofrece reintento, carga parcial mantiene espera y ausencia de registros muestra vacío. El error de cifras tiene estado propio; un fallo de cartografía no invalida la comparación disponible.
- Teclado: Enter sobre una fila del gráfico selecciona Tequendama y abre la ficha con 12 registradas / 6 referidas; en Anapoima, Andalucía muestra 8 / 6 y 598,01 ha calculadas sobre la fuente.
- Resumen breve del mapa confirmado con 8 / 6. Vista de entorno sigue presentando límites y capas públicas, con procedencia y límites de interpretación.
- Provincia sin registros: gráfico vacío con explicación; búsqueda sin coincidencias: tabla conserva mensaje y acción para mostrar todos. Sin desborde horizontal a 390 px.
- Control de descarga retorna a habilitado y no produce error de consola. El navegador integrado no notificó el evento de descarga del Blob, por lo que no se verificó un archivo guardado mediante ese evento; la selección de geometría original se comprobó en código y las fuentes en pruebas.

Capturas sintéticas: `.impeccable/review/auditoria-desktop.png`, `auditoria-mobile.png` y `auditoria-mobile-empty.png`.

Revisión final independiente: **Ship**. Ambos hallazgos materiales del cierre están resueltos: estado de error del gráfico y persistencia del sistema documentado. Veredicto y límites en `.impeccable/review/auditoria-verdict.md`; no quedan hallazgos materiales abiertos en esa revisión.

## Qué mantener y siguiente paso

Mantener permisos y supresión en servidor, el aislamiento de espacio/finalidad, las fuentes públicas versionadas y la tabla accesible como alternativa al mapa. No usar una ausencia de registros como ausencia de población; no usar una superficie vial como diagnóstico de obra pendiente.

El siguiente cambio prioritario es el contador de revisión. Después conviene medir con datos representativos y una conexión móvil en producción, y validar lector de pantalla y tema oscuro con captura. La pasada final de presentación corresponde a `$impeccable polish`; no repetir escaneos de estilo sin un defecto o necesidad nueva.
