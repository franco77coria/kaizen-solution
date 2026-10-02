---
name: "Geodemográfico · Kaizen"
description: "Sistema visual de consulta y operación territorial de la app."
colors:
  tinta: "#15171a"
  tinta-2: "#4b5157"
  tinta-3: "#636b72"
  lienzo: "#f7f8f7"
  superficie: "#ffffff"
  superficie-2: "#f1f3f1"
  linea: "#e4e7e4"
  linea-fuerte: "#d0d6d2"
  acento: "#2f6b57"
  acento-hover: "#245545"
  acento-suave: "#eaf2ee"
  acento-borde: "#c9ded4"
  sobre-acento: "#ffffff"
  dato-1: "#eaf2ee"
  dato-2: "#c9ded4"
  dato-3: "#8fbca8"
  dato-4: "#4e8c74"
  dato-5: "#2f6b57"
  senal: "#b42318"
  senal-suave: "#fef3f2"
  mapa-fondo: "#edf1ed"
  dato-cero: "#e0e7e2"
  dato-uno: "#b5d1c0"
  dato-dos: "#78af91"
  dato-tres: "#418264"
  dato-cuatro: "#1b513e"
  via-pavimentada: "#256a91"
  via-afirmado: "#a15d24"
  via-otra: "#6b5587"
  via-desconocida: "#58646b"
  red-ferrea: "#3d354d"
typography:
  display:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "48px"
    fontWeight: 550
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(26px, 3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01', 'cv11'"
  label:
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  sm: "7px"
  default: "10px"
  lg: "14px"
  full: "999px"
  territorio-field: "6px"
  territorio-filter: "12px"
  selector-trigger: "8px"
  selector-chip: "5px"
spacing:
  compact: "6px"
  control-gap: "8px"
  field-padding: "12px"
  gutter: "16px"
  card-padding: "20px"
  territorio-card-padding: "22px"
  territorio-card-gap: "18px"
  territorio-mobile-gap: "12px"
  panel-padding: "24px"
  desktop-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.sobre-acento}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.acento-hover}"
  button-neutral:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "34px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "34px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.default}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.sobre-acento}"
    rounded: "{rounded.full}"
    padding: "0 5px"
    height: "18px"
  selector-multiple:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.selector-trigger}"
    padding: "10px 12px"
    width: "100%"
  selector-panel:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.territorio-filter}"
    width: "340px"
  selector-chip:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento}"
    rounded: "{rounded.selector-chip}"
    padding: "3px 6px 3px 8px"
  territorio-vista:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.selector-trigger}"
    padding: "3px"
  territorio-vista-activa:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento}"
    rounded: "{rounded.selector-chip}"
    padding: "8px 16px"
  entorno-tramo:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    padding: "10px 8px"
    width: "100%"
  entorno-tramo-seleccionado:
    backgroundColor: "{colors.acento-suave}"
  territorio-indicadores:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
  territorio-indicador:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "22px"
  territorio-indicador-principal:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.sobre-acento}"
  territorio-inspector:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "22px"
  territorio-grafico:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "22px"
  territorio-comparacion:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
  territorio-color:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.territorio-field}"
    padding: "6px 10px"
  territorio-color-activo:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.sobre-acento}"
  entorno-ficha:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    padding: "20px 24px"
---

# Design System: Geodemográfico · Kaizen

## Overview

**Creative North Star: "Personas en el territorio del altiplano"**

Este nombre descriptivo proviene del comentario del sistema de tokens; no constituye una identidad nueva ni una metáfora aprobada por entrevista. La app usa un marco neutro, tipografía Geist y un acento verde forestal para que la información territorial conserve la prioridad. Su carácter es sobrio, compacto y legible, adecuado para consultar y operar datos agregados.

Este documento registra el sistema implementado de la app en modo **Operate**. La autoridad visual es el código existente y su extensión territorial, sin una comp aprobada. Las capturas de revisión usan datos sintéticos. El alcance visual es la app; la landing y `politica` conservan sus sistemas existentes. La composición particular del mapa y su contrato de datos viven en [.impeccable/mapa-territorial.md](.impeccable/mapa-territorial.md).

La ampliación de **Vías y entorno** conserva el diseño Kaizen confirmado por el usuario. Apps Script aporta referencias funcionales y de fuentes, sin autoridad visual. En las capturas `infra-*`, las cifras de personas siguen siendo sintéticas; la cartografía y la consulta de infraestructura proceden de fuentes públicas reales. Las capturas finales de calles registran 754 tramos y una ficha férrea; ese número documenta una consulta puntual y no un total territorial permanente.

**Key Characteristics:**

- Superficies neutras, filetes finos y verde asociado a datos y acciones.
- Una sola familia sans, con cifras tabulares.
- Controles compactos, foco visible y alternativas de navegación por teclado.
- Distinción explícita entre cero, cifra protegida y falta de asignación.

## Colors

El verde es apagado y forestal; la mayor parte de la pantalla se compone de blancos y grises con un ligero matiz vegetal. Los valores normativos del tema claro están en el frontmatter y se extraen de `apps/web/src/tokens.css` y `apps/web/src/mapa.css`.

### Primary

- **Verde forestal — acento:** acciones principales, identidad y cobertura. Su variante hover oscurece la acción en el tema claro; suave y borde forman fondos de apoyo.
- **Verde de cantidad — dato-1 a dato-5:** escala de cinco pasos del mosaico del sistema existente.
- **Verde territorial — dato-uno a dato-cuatro:** escala específica del coroplético, desde menor hasta mayor cantidad. La leyenda muestra los intervalos implementados y no representa densidad de población.

### Categorías de infraestructura

- **Azul vial — via-pavimentada:** tramos con superficie pavimentada registrada.
- **Tierra vial — via-afirmado:** superficie sin pavimentar o afirmado según la fuente.
- **Violeta vial — via-otra:** otras superficies registradas.
- **Gris vial — via-desconocida:** ausencia de información de superficie; nunca equivale a una obra pendiente.
- **Violeta férreo — red-ferrea:** trazados de referencia con línea discontinua; el trazo no confirma operación actual.

Estos colores, extraídos de `MapaEntorno.tsx`, identifican categorías, no cantidades de personas. Las casillas repiten cada categoría por nombre y cantidad; conservar esa lectura textual en calles y satélite. No sustituir con ellos la escala verde de Mapa de la red.

### Neutral

- **Tinta:** texto principal; tinta-2 organiza la información secundaria; tinta-3 acompaña detalles discretos.
- **Lienzo:** fondo general. Superficie contiene controles y paneles; superficie-2 identifica estados y selección.
- **Línea y línea fuerte:** divisiones estructurales y estados hover.
- **Fondo cartográfico y dato-cero:** separan la base del mapa y las áreas sin registros.

El texto auxiliar tinta-3 conserva el matiz gris y alcanza 5,42:1 sobre superficie blanca y 5,09:1 sobre lienzo. En oscuro usa `#96a19b`, con 6,58:1 sobre la superficie `#161a18`. Son contrastes de estos pares concretos; no constituyen una certificación de toda la app.

### Señal semántica

- **Rojo de señal:** errores y acciones destructivas. Los avisos informativos usan texto y un filete neutro, sin bloques ámbar.

**The Cantidad Rule.** El color del dato expresa una medida documentada; no se usa para atribuir precisión a cifras reservadas o datos faltantes.

El tema oscuro del shell se define en `tokens.css` bajo `prefers-color-scheme`, con excepción de `data-tema='claro'`. El mapa tiene su propia adaptación en `mapa.css`: oscurece base y cero, conserva los cuatro tonos positivos para mantener su lectura cuantitativa y ajusta tinta y halos por clase. No unificar estas dos escalas ni invertir su orden. El estado oscuro se revisó por fuente; no hay captura oscura en la evidencia disponible.

## Typography

**Display Font:** Geist Variable, con la cadena de alternativas del frontmatter.
**Body Font:** la misma familia.
**Label/Mono Font:** etiquetas en Geist; las cifras usan números tabulares, sin una familia mono adicional.

La diferencia de función depende de tamaño, peso y espacio, manteniendo una voz tipográfica continua. El cuerpo general es compacto; los totales reciben mayor tamaño y un tracking más cerrado.

### Hierarchy

- **Display:** rol disponible del sistema para totales. El resumen actual usa cuatro indicadores con cifras de tamaño fluido (30–42px), reducidas a 26px en teléfono; la ficha usa cifras de 22px.
- **Headline:** encabezado de la superficie territorial, con tamaño fluido.
- **Title:** título de la cartografía; en teléfono baja a 20px.
- **Body:** lectura general y ayudas. Los campos base usan 16px en teléfono y el tamaño de cuerpo a partir de 720px.
- **Label:** campos y contexto; las leyendas y procedencia cartográfica usan un nivel auxiliar de 11px.

**The Cifra Rule.** Usar cifras tabulares para totales, comparaciones y filas; conservar texto explícito para los estados que no tienen un número publicable.

## Layout

El shell es mobile-first, con contenido centrado de 1120px y barra superior de 56px. La base tiene padding de 24px 16px 112px; a partir de 900px usa 32px 24px 96px. Ese espacio inferior acompaña las acciones del teléfono y no debe perderse en nuevas superficies.

La superficie territorial amplía el máximo a 1480px. En escritorio usa dos columnas `minmax(0, 1fr) minmax(350px, .54fr)` separadas por 20px. Entre 761px y 1100px el panel mide 350px y la separación baja a 16px. Hasta 760px se apilan mapa, gráfico, ficha y tabla; mapa y panel se separan por 18px. El SVG del mapa tiene altura de 440px en escritorio y 360px en teléfono; título, selector de color y leyenda ocupan espacio adicional. A partir de 1100px el contenido territorial usa padding de 36px 32px 60px.

Los tres selectores múltiples —provincias, municipios y meses de registro— ocupan tres columnas en escritorio y dos en teléfono; el filtro de meses ocupa toda la fila inferior. Sus etiquetas seleccionadas se envuelven debajo del disparador. El desplegable es fijo: mide como máximo 340px de ancho, deja 16px a los lados y se desplaza hacia arriba cuando falta espacio inferior, reservando 96px bajo el panel. Su altura máxima es `calc(100dvh - 128px)`; la lista interna desplaza hasta 280px y la acción Aplicar queda al pie del panel. Estos valores proceden de `SelectorMultiple.tsx` y `mapa.css`; las capturas `multi-desktop.png` y `multi-mobile.png` registran la misma selección en ambos tamaños.

El resumen territorial reúne cuatro tarjetas independientes: cuatro columnas con separación de 18px en escritorio y dos por dos con separación de 12px en teléfono. Cada tarjeta tiene borde y radio propios, padding de 22px (16px en teléfono); la primera usa fondo forestal y texto sobre-acento, las otras usan superficie blanca. La cartografía es una tarjeta y el panel agrupa gráfico y ficha en tarjetas separadas por 18px; la tabla comparativa ocupa el ancho completo debajo, con separación de 28px. La tabla desplaza verticalmente hasta 460px y fija los encabezados; en teléfono mantiene nombre y ambas cifras en tres columnas, oculta la acción de detalle redundante y permite seleccionar el nombre para enfocar la ficha.

Los grupos reutilizan separaciones pequeñas en controles y padding mayor en paneles. Evitar imponer una grilla nueva a todas las pantallas: la vista territorial es una extensión más amplia, mientras Panorama conserva el contenedor y las primitivas comunes.

Vías y entorno ocupa el mismo marco territorial. Su mapa Leaflet mide 540px en escritorio y 420px hasta 760px; son alturas propias de esa vista, independientes de las de Mapa de la red. La barra de capas se envuelve; la consulta y los inventarios usan padding de 24px a los lados, reducido a 16px en teléfono. Las listas viales y férreas desplazan internamente hasta 220px, con filas de altura mínima 44px. Las fichas muestran atributo y valor en dos columnas; en teléfono usan columnas iguales y valores que permiten envolver palabras largas.

Las capturas actuales de la auditoría son [.impeccable/review/auditoria-desktop.png](.impeccable/review/auditoria-desktop.png), [auditoria-mobile.png](.impeccable/review/auditoria-mobile.png) y [auditoria-mobile-empty.png](.impeccable/review/auditoria-mobile-empty.png), de página completa. Registran cifras sintéticas, las tarjetas separadas, el gráfico ligado a la ficha y estados vacíos; no son contenido de producción. Las capturas `panorama-*` y anteriores se conservan como evidencia histórica de sus respectivas ampliaciones. El alcance y las mediciones técnicas se documentan en [docs/auditoria-app-territorial.md](docs/auditoria-app-territorial.md).

La búsqueda global mide hasta 380px en escritorio y ocupa el ancho disponible en teléfono; los resultados flotantes desplazan hasta 320px. Las capturas de evidencia son [.impeccable/review/infra-desktop.png](.impeccable/review/infra-desktop.png), [infra-mobile.png](.impeccable/review/infra-mobile.png), [infra-referidos-desktop.png](.impeccable/review/infra-referidos-desktop.png), [infra-referidos-mobile.png](.impeccable/review/infra-referidos-mobile.png) e [infra-satelite-desktop.png](.impeccable/review/infra-satelite-desktop.png). La captura de satélite registra una consulta previa de 391 tramos; las dos capturas finales de calles incluyen el listado férreo y su ficha.

## Elevation & Depth

La estructura se reconoce por tonos, filetes y separación, con poca sombra en reposo. Los menús flotantes usan la sombra flotante del sistema. Los controles y tooltip cartográficos tienen sombras menores propias, documentadas en el sidecar. La barra del shell es translúcida con blur de 12px; no extender ese material a todas las tarjetas.

**The Superficie Rule.** Los paneles de lectura se separan por fondo y borde; reservar la elevación perceptible para elementos superpuestos.

Las transiciones de estados usan la curva del sistema y la duración rápida; la aparición del shell usa la duración media con un desplazamiento de 4px. `prefers-reduced-motion` reduce transiciones y animaciones. No añadir movimiento decorativo al dibujo cartográfico.

El gráfico territorial introduce sus barras con `transform: scaleX` durante 360ms y ajusta cantidades durante 320ms, ambos con `cubic-bezier(.16,1,.3,1)`. Hover de fila cambia el fondo en 140ms. Con movimiento reducido, barras y filas omiten esas animaciones y transiciones; no se animan dimensiones de diseño.

## Shapes

Las tarjetas tienen esquinas suaves y un filete de un píxel. Los botones y enlaces de navegación son cápsulas; los campos son rectángulos suaves. Las primitivas usan la escala de radios del frontmatter. La superficie territorial conserva sus variantes implementadas: campos más ajustados, filtros de radio intermedio y contenedor principal con el radio de tarjeta.

La cartografía conserva las siluetas de su fuente; no reemplazar áreas reales con círculos ni redondear sus límites. Los iconos de acciones usan trazos simples, tamaño explícito y no se estiran con el ancho del control.

## Components

### Buttons

Cápsulas compactas con texto de peso medio y altura consistente. Primario usa acento y sobre-acento; neutro usa superficie y borde; fantasma conserva fondo transparente y texto secundario. Hover cambia fondo y filete; disabled baja opacidad. La variante grande usa 42px de altura y la acción inferior del teléfono 44px. Foco visible con contorno de acento; no eliminarlo para mejorar una captura.

### Inputs / Fields

Campos con etiqueta encima, ancho flexible y mínimo de ancho cero para contenerse. Los campos base usan fondo de superficie, borde y halo de foco. La búsqueda territorial integra un icono y un contorno en focus-within. Los filtros territoriales usan el selector múltiple descrito abajo; las casillas y la entrada adicional de mes conservan controles nativos.

### SelectorMultiple

Componente reutilizado por los filtros de provincias, municipios y meses. Disparador de altura mínima 44px, texto de 13px, filete de línea fuerte y radio propio; hover usa superficie-2 y borde de acento. El contador usa cifras tabulares de 11px. Se muestran dos etiquetas removibles y `+n` para el resto; cada etiqueta trunca su texto y conserva el nombre completo en title. La eliminación se aplica de inmediato, respetando el mínimo del componente.

El panel elevado abre con foco en búsqueda. Busca sin distinguir mayúsculas ni tildes, también por grupo; las selecciones ya aplicadas aparecen primero. Las filas de casillas nativas tienen altura mínima 44px, casilla de 16px y fondo suave de acento al marcar. Seleccionar todos/resultados y Limpiar editan un borrador; Aplicar confirma el conjunto. Su botón tiene altura mínima 36px y usa acento, hover oscuro y opacidad reducida cuando no alcanza el mínimo. La búsqueda señala foco con un filete inferior de acento; los demás controles conservan contorno visible. La flecha gira en 160ms ease-out, sin transición con movimiento reducido.

Escape descarta el borrador y devuelve foco al disparador; también lo devuelve Aplicar. Las flechas arriba/abajo recorren casillas, y Tab usa el orden nativo. Clic exterior, salida del foco, resize o scroll externo cierran el panel sin confirmar; el scroll interno permanece disponible. Al reabrir, el borrador parte de la selección aplicada.

En el mapa, las provincias acotan los municipios y eliminan selecciones municipales fuera de alcance. Meses ofrece los últimos 24 meses y una entrada nativa para añadir otros. Personas registradas y personas referidas siempre se consultan por separado; ya no constituyen un filtro múltiple. El selector de color conserva las dos medidas visibles y cambia únicamente el coroplético. No sumar sus totales entre sí.

### Cards / Containers

Superficie blanca en claro, radio de tarjeta, borde de línea y padding de tarjeta. Los títulos y ayudas comparten línea cuando el espacio lo permite. Los estados vacíos usan texto centrado y separación; los avisos informativos usan el filete lateral.

### Navigation

La navegación superior usa texto pequeño y cápsula neutra para la página activa. Aparece desde 900px; en teléfono la acción principal dispone de barra inferior. Las migas territoriales se pueden envolver y mantienen peso y contraste más fuertes para la ubicación actual.

### Badge

La insignia del shell es una cápsula pequeña en acento con cifra tabular y texto sobre-acento. Es un indicador de cantidad, no un filtro territorial.

### Resumen territorial

Cuatro tarjetas compactas e independientes con borde y separación visible. La primera usa acento forestal y texto sobre-acento, también en oscuro; las demás conservan la superficie del tema. Cada una usa etiqueta de 12px, cifra tabular y definición de 11px. Personas registradas y Personas referidas conservan sus totales separados; Presencia territorial muestra áreas con registros sobre áreas de referencia. El cuarto indicador cuenta territorios Sin registros; en vereda cambia a Sin vereda asignada y muestra personas sin asignación, sin equipararlas con población urbana. La presencia corresponde a registros del espacio, no a cobertura de habitantes.

### Gráfico territorial

Tu red, en perspectiva compara hasta seis territorios mediante dos barras independientes por fila: Registradas en acento y Referidas en dato-tres, con escala común y cifras tabulares. Las referidas forman parte de las registradas; no se apilan ni suman. La medida cartográfica activa ordena las filas; la tabla mantiene todos los territorios. Las cifras protegidas o no disponibles muestran texto, sin barra ni cantidad inferida; dos ceros no ocupan una fila del gráfico.

La tarjeta tiene padding de 22px (20px en teléfono), título de 20px, nombres de 12px y cifras de 11px. Cada fila es un botón de mínimo 56px, con `aria-pressed`, foco visible y nombre accesible que incluye ambas cifras y sus estados. Hover y selección usan acento suave. Activarla selecciona y enfoca la misma ficha que el mapa y la tabla.

La carga muestra Consultando comparación…; el vacío explica No hay registros para comparar con estos filtros. Una falla de cifras muestra La comparación no está disponible y Reintentar comparación, con `aria-busy=false`. Este estado depende del error de cifras, separado del cartográfico. Actualizar cifras y el reintento limpian la caché del componente y consultan nuevamente. El movimiento acompaña el cambio de datos y respeta movimiento reducido.

### Mapa e inspector territorial

Cartografía, gráfico y ficha usan tarjetas propias dentro de una misma grilla. Colorear por usa botones de altura mínima 34px en escritorio y 44px en teléfono, con radio de campo (6px); la medida activa recibe acento sólido con texto sobre-acento y `aria-pressed`. La leyenda y el punto de cada fila siguen esa medida; los indicadores, la tabla, el gráfico y la ficha conservan ambas cifras.

Pasar el cursor ofrece nombre y ambas cifras en un tooltip; hacer clic selecciona y enfoca el inspector sin cambiar automáticamente de nivel. La ficha muestra título de 19px, contexto de 12px, ambas cifras de 22px y metadatos de 11px. Provincia muestra municipios de referencia; municipio muestra veredas de referencia y código DANE; vereda añade código, área aproximada y vigencia. Explorar municipios / Explorar veredas es una acción explícita en cápsula primaria, de ancho completo y altura mínima 40px (44px en teléfono). Quitar selección mantiene el nivel; su blanco y los controles de zoom miden 44px. El estado inicial explica cómo seleccionar y comparar. Alcance y privacidad continúan en bloques separados por filetes.

### Tabla comparativa territorial

Superficie blanca, borde de línea y radio de tarjeta. El encabezado combina título de 20px, contexto y búsqueda; debajo, Todos / Sin registros / Con cifras protegidas conservan `aria-pressed`, altura mínima 34px en escritorio (44px en teléfono) y selección de acento suave. El filtro Sin registros se refiere a personas registradas, con independencia del color del mapa.

Encabezados ordenables de 11px, `aria-sort`, cifra tabular y acción de siguiente nivel por fila. Los nombres son botones con altura mínima 62px y foco visible; seleccionarlos enfoca la ficha. Hover usa superficie-2 y selección usa acento suave. La lectura de cifras protegidas permanece textual y esas filas no se ordenan como cantidades. El estado sin coincidencias ofrece Mostrar todos los territorios; carga y error conservan texto explícito. En teléfono se mantienen nombre, Registradas y Referidas sin desplazamiento horizontal; los nombres largos pueden envolver. Las etiquetas del mapa evitan colisiones y el detalle completo permanece accesible en la tabla.

Cero se muestra con tono neutro y `0`; el dato protegido usa rayado y `Protegido`. `—` expresa una cifra todavía no disponible. El bloque `Sin vereda asignada` separa datos históricos o faltantes sin afirmar que sean urbanos. Esta semántica es parte del componente y debe mantenerse en todos sus estados.

### Vista cartográfica y búsqueda global

Mapa de la red es la vista inicial. Los botones Mapa de la red / Vías y entorno y Calles / Satélite comparten el selector segmentado existente: contenedor blanco con filete y radio de 8px, botones de altura mínima 38px y radio de 5px, texto de 12px y estado activo en acento suave con peso 600. La selección se comunica con `aria-pressed`; el foco conserva el contorno de acento de 2px y separación de 3px.

En teléfono, vistas de mapa, filtros de tabla y acciones principales alcanzan un blanco mínimo de 44px. Los botones de Aplicar, Seleccionar y Limpiar del selector también alcanzan 44px; las etiquetas removibles conservan blancos de 24px, mejora pendiente declarada en la auditoría. No extender esa medida compacta a controles principales nuevos.

La búsqueda de veredas acepta nombre, municipio o código desde dos caracteres, sin distinguir mayúsculas ni tildes, y ofrece hasta ocho resultados. Cada resultado muestra vereda, municipio y código y abre su territorio. La ficha territorial conserva cifra y estado protegido, y añade código, municipio, área aproximada en hectáreas y vigencia de referencia, con filas compactas de 11px. Los nombres de ruta y los identificadores no cambian por adaptar el texto visible al español de Colombia; SUMA mantiene la misma voz y el campo «Pregúntale a SUMA…».

### Vías y entorno

La base inicial es Calles. Límites y Nombres parten activos; Red férrea parte desactivada. Las casillas nativas usan acento forestal y tamaño de 16px. Los nombres permanentes aparecen desde zoom 12 cuando hay hasta 60 áreas; etiquetas blancas con tinta verde y tamaño de 10px mantienen su contraste sobre ambas bases.

Consultar zona visible se habilita desde zoom 13, dentro del ámbito cartográfico y para una caja de hasta 0,16° por eje. El botón conserva la cápsula neutra del sistema; durante la consulta muestra progreso y queda deshabilitado. Un recuadro discontinuo delimita la consulta completada. Los estados de carga, falla de imágenes, error de consulta y cobertura parcial se explican por texto, sin alterar la identidad visual.

Las categorías viales combinan casilla, trazo de color, nombre y cantidad tabular de 11px. Buscar vía filtra los nombres del conjunto consultado; seleccionar una fila enfoca el tramo y abre su ficha. Las filas de corredores férreos son botones equivalentes disponibles por teclado, con `aria-pressed`, fondo de acento suave al seleccionar y detalle accesible fuera del mapa. El listado es departamental: no implica presencia de ambos corredores en el municipio seleccionado.

La ficha de tramo usa superficie blanca, filete superior, título de 17px y atributos de 12px: tipo, superficie, estado reportado, regularidad, puente, túnel, ancho, referencia y fuente cuando existen. Su aparición se anuncia con `aria-live`; Cerrar ficha mantiene el botón neutro. Los valores desconocidos permanecen explícitos, sin inferir pavimentación necesaria ni operación de trenes.

Fuentes de infraestructura y descarga conserva el patrón desplegable de procedencia: enlaces de acento, atribución cartográfica legible, licencia y alcance consultables. Descargar límites GeoJSON exporta exclusivamente geometrías y propiedades públicas, atribución, licencia y vigencias; no incluye cifras ni registros de personas.

## Do's and Don'ts

### Do:

- **Do** extender Geist, las superficies neutras y el acento existente en nuevas vistas de la app.
- **Do** conservar foco visible, cifras tabulares y texto que explique estados reservados.
- **Do** mantener la escala de cantidad y su leyenda consistentes entre mapa y tabla.
- **Do** mostrar procedencia y alcance consultables en la superficie territorial.
- **Do** mantener nombres, cantidades y filas accesibles junto a los colores y trazos de infraestructura.
- **Do** conservar la vista Mapa de la red predeterminada y extender sus primitivas en Vías y entorno.
- **Do** conservar separación entre tarjetas y dos series independientes con escala común en el gráfico territorial.

### Don't:

- **Don't** mostrar una cifra protegida o faltante como cero.
- **Don't** aplicar fondos de alarma a avisos informativos.
- **Don't** introducir otra identidad visual en la landing o en politica mediante este documento.
- **Don't** presentar datos sintéticos de las capturas como contenido de producción.
- **Don't** interpretar una categoría de superficie o un trazado férreo como necesidad de obra u operación actual.
- **Don't** tomar el diseño de Apps Script como autoridad visual para la app Kaizen.
- **Don't** dibujar barras para cifras protegidas ni presentar las mediciones locales como garantías de Core Web Vitals en producción.
