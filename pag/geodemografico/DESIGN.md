---
name: "Geodemográfico · Kaizen"
description: "Sistema visual de consulta y operación territorial de la app."
colors:
  tinta: "#15171a"
  tinta-2: "#4b5157"
  tinta-3: "#858b90"
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
---

# Design System: Geodemográfico · Kaizen

## Overview

**Creative North Star: "Personas en el territorio del altiplano"**

Este nombre descriptivo proviene del comentario del sistema de tokens; no constituye una identidad nueva ni una metáfora aprobada por entrevista. La app usa un marco neutro, tipografía Geist y un acento verde forestal para que la información territorial conserve la prioridad. Su carácter es sobrio, compacto y legible, adecuado para consultar y operar datos agregados.

Este documento registra el sistema implementado de la app en modo **Operate**. La autoridad visual es el código existente y su extensión territorial, sin una comp aprobada. Las capturas de revisión usan datos sintéticos. El alcance visual es la app; la landing y `politica` conservan sus sistemas existentes. La composición particular del mapa y su contrato de datos viven en [.impeccable/mapa-territorial.md](.impeccable/mapa-territorial.md).

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

### Neutral

- **Tinta:** texto principal; tinta-2 organiza la información secundaria; tinta-3 acompaña detalles discretos.
- **Lienzo:** fondo general. Superficie contiene controles y paneles; superficie-2 identifica estados y selección.
- **Línea y línea fuerte:** divisiones estructurales y estados hover.
- **Fondo cartográfico y dato-cero:** separan la base del mapa y las áreas sin registros.

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

- **Display:** total territorial; en teléfono baja a 40px.
- **Headline:** encabezado de la superficie territorial, con tamaño fluido.
- **Title:** título de la cartografía; en teléfono baja a 20px.
- **Body:** lectura general y ayudas. Los campos base usan 16px en teléfono y el tamaño de cuerpo a partir de 720px.
- **Label:** campos y contexto; las leyendas y procedencia cartográfica usan un nivel auxiliar de 11px.

**The Cifra Rule.** Usar cifras tabulares para totales, comparaciones y filas; conservar texto explícito para los estados que no tienen un número publicable.

## Layout

El shell es mobile-first, con contenido centrado de 1120px y barra superior de 56px. La base tiene padding de 24px 16px 112px; a partir de 900px usa 32px 24px 96px. Ese espacio inferior acompaña las acciones del teléfono y no debe perderse en nuevas superficies.

La superficie territorial amplía el máximo a 1480px. En escritorio usa cartografía flexible y panel de 330px; hasta 1000px el panel baja a 290px. Hasta 760px, cartografía y panel se apilan, y los cuatro filtros forman una grilla de dos columnas. El mapa tiene altura de 560px en escritorio y 360px en teléfono. A partir de 1100px el contenido territorial usa padding de 36px 32px 60px.

Los selectores múltiples conservan la grilla de cuatro columnas en escritorio y dos en teléfono; sus etiquetas seleccionadas se envuelven debajo del disparador. El desplegable es fijo: mide como máximo 340px de ancho, deja 16px a los lados y se desplaza hacia arriba cuando falta espacio inferior, reservando 96px bajo el panel. Su altura máxima es `calc(100dvh - 128px)`; la lista interna desplaza hasta 280px y la acción Aplicar queda al pie del panel. Estos valores proceden de `SelectorMultiple.tsx` y `mapa.css`; las capturas `multi-desktop.png` y `multi-mobile.png` registran la misma selección en ambos tamaños.

Los grupos reutilizan separaciones pequeñas en controles y padding mayor en paneles. Evitar imponer una grilla nueva a todas las pantallas: la vista territorial es una extensión más amplia, mientras Panorama conserva el contenedor y las primitivas comunes.

## Elevation & Depth

La estructura se reconoce por tonos, filetes y separación, con poca sombra en reposo. Los menús flotantes usan la sombra flotante del sistema. Los controles y tooltip cartográficos tienen sombras menores propias, documentadas en el sidecar. La barra del shell es translúcida con blur de 12px; no extender ese material a todas las tarjetas.

**The Superficie Rule.** Los paneles de lectura se separan por fondo y borde; reservar la elevación perceptible para elementos superpuestos.

Las transiciones de estados usan la curva del sistema y la duración rápida; la aparición del shell usa la duración media con un desplazamiento de 4px. `prefers-reduced-motion` reduce transiciones y animaciones. No añadir movimiento decorativo al dibujo cartográfico.

## Shapes

Las tarjetas tienen esquinas suaves y un filete de un píxel. Los botones y enlaces de navegación son cápsulas; los campos son rectángulos suaves. Las primitivas usan la escala de radios del frontmatter. La superficie territorial conserva sus variantes implementadas: campos más ajustados, filtros de radio intermedio y contenedor principal con el radio de tarjeta.

La cartografía conserva las siluetas de su fuente; no reemplazar áreas reales con círculos ni redondear sus límites. Los iconos de acciones usan trazos simples, tamaño explícito y no se estiran con el ancho del control.

## Components

### Buttons

Cápsulas compactas con texto de peso medio y altura consistente. Primario usa acento y sobre-acento; neutro usa superficie y borde; fantasma conserva fondo transparente y texto secundario. Hover cambia fondo y filete; disabled baja opacidad. La variante grande usa 42px de altura y la acción inferior del teléfono 44px. Foco visible con contorno de acento; no eliminarlo para mejorar una captura.

### Inputs / Fields

Campos con etiqueta encima, ancho flexible y mínimo de ancho cero para contenerse. Los campos base usan fondo de superficie, borde y halo de foco. La búsqueda territorial integra un icono y un contorno en focus-within. Los filtros territoriales usan el selector múltiple descrito abajo; las casillas y la entrada adicional de mes conservan controles nativos.

### SelectorMultiple

Componente reutilizado por provincias, municipios/alcaldías, medidas y meses. Disparador de altura mínima 44px, texto de 13px, filete de línea fuerte y radio propio; hover usa superficie-2 y borde de acento. El contador usa cifras tabulares de 11px. Se muestran dos etiquetas removibles y `+n` para el resto; cada etiqueta trunca su texto y conserva el nombre completo en title. La eliminación se aplica de inmediato, respetando el mínimo del componente.

El panel elevado abre con foco en búsqueda. Busca sin distinguir mayúsculas ni tildes, también por grupo; las selecciones ya aplicadas aparecen primero. Las filas de casillas nativas tienen altura mínima 44px, casilla de 16px y fondo suave de acento al marcar. Seleccionar todos/resultados y Limpiar editan un borrador; Aplicar confirma el conjunto. Su botón tiene altura mínima 36px y usa acento, hover oscuro y opacidad reducida cuando no alcanza el mínimo. La búsqueda señala foco con un filete inferior de acento; los demás controles conservan contorno visible. La flecha gira en 160ms ease-out, sin transición con movimiento reducido.

Escape descarta el borrador y devuelve foco al disparador; también lo devuelve Aplicar. Las flechas arriba/abajo recorren casillas, y Tab usa el orden nativo. Clic exterior, salida del foco, resize o scroll externo cierran el panel sin confirmar; el scroll interno permanece disponible. Al reabrir, el borrador parte de la selección aplicada.

En el mapa, las provincias acotan los municipios y eliminan selecciones municipales fuera de alcance. Meses ofrece los últimos 24 meses y una entrada nativa para añadir otros. Medidas exige al menos una selección; cuando hay dos, sus totales se muestran por separado en botones de altura mínima 42px, con `aria-pressed` y acento suave para la medida que colorea el mapa. No sumar esos totales entre sí.

### Cards / Containers

Superficie blanca en claro, radio de tarjeta, borde de línea y padding de tarjeta. Los títulos y ayudas comparten línea cuando el espacio lo permite. Los estados vacíos usan texto centrado y separación; los avisos informativos usan el filete lateral.

### Navigation

La navegación superior usa texto pequeño y cápsula neutra para la página activa. Aparece desde 900px; en teléfono la acción principal dispone de barra inferior. Las migas territoriales se pueden envolver y mantienen peso y contraste más fuertes para la ubicación actual.

### Badge

La insignia del shell es una cápsula pequeña en acento con cifra tabular y texto sobre-acento. Es un indicador de cantidad, no un filtro territorial.

### Mapa y lista territorial

Una superficie compartida reúne mapa y detalle equivalente. La lista ofrece las mismas cifras y acciones por teclado. Las filas usan divisores, punto de escala y cifra tabular; hover y selección reciben superficie-2. Las etiquetas del mapa evitan colisiones y el detalle completo permanece en la lista.

Cero se muestra con tono neutro y `0`; el dato protegido usa rayado y `Protegido`. `—` expresa una cifra todavía no disponible. El bloque `Sin vereda asignada` separa datos históricos o faltantes sin afirmar que sean urbanos. Esta semántica es parte del componente y debe mantenerse en todos sus estados.

## Do's and Don'ts

### Do:

- **Do** extender Geist, las superficies neutras y el acento existente en nuevas vistas de la app.
- **Do** conservar foco visible, cifras tabulares y texto que explique estados reservados.
- **Do** mantener la escala de cantidad y su leyenda consistentes entre mapa y lista.
- **Do** mostrar procedencia y alcance consultables en la superficie territorial.

### Don't:

- **Don't** mostrar una cifra protegida o faltante como cero.
- **Don't** aplicar fondos de alarma a avisos informativos.
- **Don't** introducir otra identidad visual en la landing o en politica mediante este documento.
- **Don't** presentar datos sintéticos de las capturas como contenido de producción.
