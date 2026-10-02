# Mapa territorial

Ruta: `/app/mapa`. Accesible desde la navegación y Panorama para cuentas con `analytics.aggregate`. Se mantienen la sesión, el espacio, la finalidad y RLS existentes.

## Lectura

- Cundinamarca: cifras por las 15 provincias del catálogo, dibujadas sobre los 116 municipios.
- Provincia: municipios; elegir uno abre su referencia de veredas.
- Municipio: polígonos rurales, detalle buscable y personas sin vereda asignada por separado.
- Medidas: personas enviadas/aprobadas; o receptores únicos con referente enviado/aprobado de la misma finalidad. No es un recuento de enlaces ni del operador que capturó.
- Mes: fecha de creación del registro en `America/Bogota`.
- Los filtros usan búsqueda, casillas, etiquetas removibles y aplicación en bloque. Selección múltiple de provincias, municipios y meses: OR dentro de cada dimensión, AND entre dimensiones; duplicados se normalizan. Sin selección territorial significa todo Cundinamarca. Al cambiar provincias se retiran únicamente municipios que quedaron fuera.
- Varios municipios se comparan por municipio; uno solo abre sus veredas. Se pueden elegir ambas medidas: cifras independientes y un botón por medida para decidir cuál colorea el mapa. Nunca se suman personas sumadas y personas con referente, porque se superponen.
- Cero: ausencia de registros. Protegido: supresión por umbral y complemento según las reglas existentes. Ningún número reservado llega al cliente.

La captura permite informar una vereda opcional. El servidor y una clave foránea compuesta exigen que corresponda al municipio. Los registros anteriores conservan `NULL`; no se deduce su ubicación ni se confunde ausencia de vereda con casco urbano. El formulario no crea relaciones de referido nuevas: la métrica consulta las relaciones ya registradas en la base.

## Cartografía y procedencia

Los GeoJSON se sirven desde `/app/geo/` en el mismo dominio. No hay servicios externos de mapas, claves, geolocalización ni coordenadas de personas en el navegador.

Municipios: [DANE MGN, publicación institucional UPRA](https://services.arcgis.com/wLfHepIACaM0pwj9/arcgis/rest/services/MGN_MUNICIPIO_POLITICO/FeatureServer/0), vigencia 2020. Se cotejaron los 116 códigos con el catálogo existente. Ubalá tiene dos elementos en la fuente: se conserva como MultiPolygon. Bogotá D.C. queda fuera.

Veredas: [DANE, nivel de referencia 2020, publicación IDEC](https://www.arcgis.com/home/item.html?id=ceb6771090e04c6d966d10e64a9a6720). 2.578 códigos únicos y cobertura de 116 municipios; Anapoima tiene 27 polígonos, con vigencia individual 2010. Una vereda con dos componentes se consolidó sin perder anillos. Se mantienen los nombres originales de la fuente; los nombres para lectura se capitalizan sin corregirlos silenciosamente.

[Licencia DANE](https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/), CC BY 4.0; la fuente IDEC también declara CC BY 4.0. Atribución visible en la pantalla y metadata de cada archivo. Coordenadas EPSG:4326 redondeadas a cinco decimales, sin simplificación de anillos. La copia de dibujo invierte el sentido esférico necesario para d3, conservando intactos los GeoJSON publicados.

Se descartaron capas con licencia no comercial. El servicio directo de DANE 2024 no respondió durante la importación; no se afirma usar cartografía de esa edición. La referencia estadística no sustituye límites jurídicos ni un deslinde. La agrupación de provincias hereda el catálogo de Kaizen pendiente de cotejo administrativo.

## Operación

La migración **0030_mapa_territorial.sql debe aplicarse antes de desplegar la API nueva**. Añade catálogo, RLS forzada y política de lectura para `kaizen_app`, columna nullable, FK e índice. Cierra acceso REST de `anon` y `authenticated`. No modifica filas históricas ni concede lectura nominal adicional.

Desde `C:\kgeo\pag\geodemografico`: `pnpm prod:migrar`, con las variables de producción existentes. No se ejecutó contra producción durante esta implementación.

`scripts/territory-import.mjs` reproduce la consulta pública paginada y valida códigos, duplicados y coordenadas. Una nueva edición cartográfica requiere revisión de diferencias y una nueva migración: nunca sobrescribir una migración ya aplicada. El build copia los activos a `public/app/geo/` mediante el empaquetado existente.

Validación: suite de integración para autorización, aislamiento con datos de otros espacios/finalidades, cero/supresión complementaria, receptores únicos, filtros y captura/FK; prueba de activos para cobertura, anillos, coordenadas y componentes. Revisión de la app con base efímera y datos sintéticos, sin cargar secretos de producción.
