# Geodemográfico · Kaizen Solutions

Aplicación de Kaizen para registrar personas con consentimiento, revisar registros y consultar datos agregados dentro de espacios y finalidades autorizados. Vive en `/app` de la landing existente. Público principal: equipos que administran y consultan su red territorial en Cundinamarca. Toda la app, incluidas las respuestas de SUMA, usa español de Colombia y tuteo neutro.

El mapa permite recorrer departamento → provincia → municipio → vereda, con acceso directo a Anapoima. Municipio es la entidad territorial; alcaldía es su administración. Usa únicamente registros del espacio y finalidad activos. La medida de referidos cuenta receptores únicos con relaciones registradas, sin inferir relaciones por operador de captura.

La interfaz debe facilitar lectura y comparación en computadora y teléfono. El usuario confirmó conservar el diseño Kaizen anterior: no imitar el diseño de Apps Script. Hereda Geist, superficies neutras y verde reservado para datos de la app existente. El mapa y una lista equivalente permiten explorar la misma información. Los territorios sin personas y las cifras protegidas deben distinguirse.

La vista de entorno añade mapas de calles y satélite, límites, trazados férreos y superficie vial registrada en capas públicas IDEC. El usuario confirmó usar fuentes públicas por ahora. La ausencia de atributos se muestra como desconocida; ni la superficie sin pavimentar certifica una obra pendiente ni un trazado férreo certifica operación de trenes. Para necesidades actuales se requiere inventario municipal o verificación en campo.

Restricciones confirmadas: trabajar en `C:\kgeo`, usar los ejemplos y las capturas como referencia sin ejecutar Apps Script. El código de `politica` y el contenido de la landing están fuera de este cambio; la configuración compartida permite exclusivamente las imágenes cartográficas de `/app`. No publicar datos personales ni asignar veredas a registros históricos por aproximación.

La cartografía disponible es una referencia estadística publicada en 2020, con vigencias individuales anteriores. No se presenta como división administrativa vigente. La agrupación provincial del catálogo existente continúa pendiente de cotejo administrativo.
