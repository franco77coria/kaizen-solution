# Mapa territorial

Ruta: `/app/mapa`. Accesible desde la navegación y Panorama para cuentas con `analytics.aggregate`. Se mantienen la sesión, el espacio, la finalidad y RLS existentes.

## Lectura

- Cundinamarca: cifras por las 15 provincias del catálogo, dibujadas sobre los 116 municipios.
- Provincia: municipios; seleccionar uno muestra sus cifras y una acción explícita abre sus veredas.
- Municipio: polígonos rurales, detalle buscable y personas sin vereda asignada por separado.
- Medidas: personas enviadas/aprobadas; o receptores únicos con referente enviado/aprobado de la misma finalidad. No es un recuento de enlaces ni del operador que capturó.
- Mes: fecha de creación del registro en `America/Bogota`.
- Los filtros usan búsqueda, casillas, etiquetas removibles y aplicación en bloque. Selección múltiple de provincias, municipios y meses: OR dentro de cada dimensión, AND entre dimensiones; duplicados se normalizan. Sin selección territorial significa todo Cundinamarca. Al cambiar provincias se retiran únicamente municipios que quedaron fuera.
- Varios municipios se comparan por municipio; uno solo abre sus veredas. Ambas medidas se consultan siempre con los mismos filtros y se muestran en columnas separadas. Un botón por medida decide cuál colorea el mapa sin nuevas consultas. Nunca se suman personas registradas y personas referidas, porque se superponen.
- Cuatro indicadores muestran registros, personas referidas, presencia territorial y territorios sin registros. En nivel vereda, el último muestra personas sin vereda asignada, incluidas en el total municipal. La presencia y los territorios sin registros usan los recuentos de áreas ya autorizados del servidor, sin calcular cantidades personales por diferencia.
- Pasar el cursor muestra un resumen breve de ambas cifras, conservando “Protegido”. Hacer clic selecciona sin cambiar de nivel; una acción explícita permite entrar al siguiente. La tabla permite ordenar por nombre o cualquiera de las cifras, buscar y filtrar territorios sin registros o con cifras protegidas. Valores protegidos o pendientes quedan al final sin convertirlos a cero. El inspector muestra ambas cifras y los atributos geográficos disponibles.
- La tabla de celular muestra nombre y ambas medidas en tres columnas; seleccionar lleva el foco al inspector, desde donde se puede explorar el siguiente nivel. La fila mantiene una acción de navegación directa adicional en escritorio.
- Cero: ausencia de registros. Protegido: supresión por umbral y complemento según las reglas existentes. Ningún número reservado llega al cliente.

La captura permite informar una vereda opcional. El servidor y una clave foránea compuesta exigen que corresponda al municipio. Los registros anteriores conservan `NULL`; no se deduce su ubicación ni se confunde ausencia de vereda con casco urbano. El formulario no crea relaciones de referido nuevas: la métrica consulta las relaciones ya registradas en la base.

## Cartografía y procedencia

Los límites GeoJSON se sirven desde `/app/geo/` en el mismo dominio. La vista Referidos conserva su dibujo SVG local. Vías y entorno carga teselas públicas de OpenStreetMap o Esri según el área visible; no requiere claves ni geolocalización. Nunca se envían registros ni coordenadas de personas a proveedores cartográficos.

Municipios: [DANE MGN, publicación institucional UPRA](https://services.arcgis.com/wLfHepIACaM0pwj9/arcgis/rest/services/MGN_MUNICIPIO_POLITICO/FeatureServer/0), vigencia 2020. Se cotejaron los 116 códigos con el catálogo existente. Ubalá tiene dos elementos en la fuente: se conserva como MultiPolygon. Bogotá D.C. queda fuera.

Veredas: [DANE, nivel de referencia 2020, publicación IDEC](https://www.arcgis.com/home/item.html?id=ceb6771090e04c6d966d10e64a9a6720). 2.578 códigos únicos y cobertura de 116 municipios; Anapoima tiene 27 polígonos, con vigencia individual 2010. Una vereda con dos componentes se consolidó sin perder anillos. Se mantienen los nombres originales de la fuente; los nombres para lectura se capitalizan sin corregirlos silenciosamente.

[Licencia DANE](https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/), CC BY 4.0; la fuente IDEC también declara CC BY 4.0. Atribución visible en la pantalla y metadata de cada archivo. Coordenadas EPSG:4326 redondeadas a cinco decimales, sin simplificación de anillos. La copia de dibujo invierte el sentido esférico necesario para d3, conservando intactos los GeoJSON publicados.

Se descartaron capas con licencia no comercial. El servicio directo de DANE 2024 no respondió durante la importación; no se afirma usar cartografía de esa edición. La referencia estadística no sustituye límites jurídicos ni un deslinde. La agrupación de provincias hereda el catálogo de Kaizen pendiente de cotejo administrativo.

## Infraestructura pública

La vista de entorno consulta únicamente fuentes fijas publicadas por IDEC:

- [Vías de Cundinamarca basadas en OpenStreetMap, editadas](https://www.arcgis.com/home/item.html?id=9fa7809f46cb41e6bd331f77dcd109a5): seis capas de vías residenciales, terciarias, secundarias, primarias, peatonales/ciclovías y troncales. La publicación declara CC BY-SA 4.0. Se normalizan los atributos y se recortan geometrías a la caja consultada. Los atributos se presentan con su fuente; no se exportan ni se fusionan con cifras personales.
- [Red férrea de Cundinamarca, publicación 2024](https://www.arcgis.com/home/item.html?id=64449b63d6444865be5cc077afcc4a58): CC BY 4.0. Se muestran nombre, corredor y estado reportado, incluida la falta de información de operación. La presencia de un trazado no confirma un servicio activo.

La superficie se clasifica solo cuando el atributo es explícito: pavimentada, sin pavimentar/afirmado, otra o sin información. No se deduce a partir de la categoría vial. Los valores originales normalizados siguen disponibles en la ficha, junto con puente, túnel, ancho y regularidad cuando la fuente los aporta. “Sin pavimentar” no equivale a obra pendiente. La fecha de edición de una capa no certifica vigencia en campo.

`GET /v1/geography/infrastructure` exige `analytics.aggregate`, ámbito autorizado y límite de consultas. La API usa URLs fijas sin encabezados de sesión externos. Para vías requiere una caja pequeña dentro del encuadre de Cundinamarca, máximo 0,16 grados por dimensión; el botón se habilita desde zoom 13. Cada capa devuelve hasta 1.000 elementos, con recorte al área visible y presupuesto conservador de respuesta de 3 MB. Los cortes y geometrías inválidas se declaran parciales; fallos de fuente responden 503, nunca un inventario vacío. La red férrea rechaza resultados incompletos. Timeout externo 22 segundos, caché de cuatro consultas públicas durante 15 minutos; respuesta privada sin caché HTTP. El cliente conserva hasta cuatro consultas durante 30 minutos.

La búsqueda global permite encontrar una vereda por nombre, código o municipio. La ficha muestra área geodésica aproximada en hectáreas y vigencia individual de referencia. La descarga GeoJSON contiene exclusivamente límites públicos, códigos, nombres y procedencia, sin registros ni recuentos.

Las teselas se piden exclusivamente para el mapa visible, sin precarga ni descarga masiva; atribución visible. La CSP de `/app` permite imágenes de `tile.openstreetmap.org` y `server.arcgisonline.com`; las consultas de atributos permanecen en la API del mismo dominio. Para registrar necesidades actuales de pavimentación debe incorporarse un inventario vial municipal actualizado o evidencia de campo. El usuario confirmó trabajar por ahora con capas públicas.

## Operación

La migración **0030_mapa_territorial.sql debe aplicarse antes de desplegar la API nueva**. Añade catálogo, RLS forzada y política de lectura para `kaizen_app`, columna nullable, FK e índice. Cierra acceso REST de `anon` y `authenticated`. No modifica filas históricas ni concede lectura nominal adicional.

Desde `C:\kgeo\pag\geodemografico`: `pnpm prod:migrar`, con las variables de producción existentes. No se ejecutó contra producción durante esta implementación.

`scripts/territory-import.mjs` reproduce la consulta pública paginada y valida códigos, duplicados y coordenadas. Una nueva edición cartográfica requiere revisión de diferencias y una nueva migración: nunca sobrescribir una migración ya aplicada. El build copia los activos a `public/app/geo/` mediante el empaquetado existente.

Validación: suite de integración para autorización, aislamiento con datos de otros espacios/finalidades, cero/supresión complementaria, receptores únicos, filtros y captura/FK; prueba de activos para cobertura, anillos, coordenadas y componentes. Revisión de la app con base efímera y datos sintéticos, sin cargar secretos de producción.
