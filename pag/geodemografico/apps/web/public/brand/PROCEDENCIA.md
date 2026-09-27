# Símbolo Kaizen Solution para el asistente

Asset seleccionado: `kaizen-symbol.png`, PNG RGB de 1254 × 1254 píxeles. Reconstrucción del emblema de la izquierda del JPEG aportado por el usuario, sin wordmark ni tagline. Se conservan como referencia visual el círculo, flecha ascendente, circuitos, engranaje y barras en navy, teal y naranja. No es un calco vectorial certificado ni el original editable de marca.

Uso: botón flotante circular blanco, abajo a la derecha; 64 px en escritorio y 56 px en móvil, imagen proporcional y foco visible. Fondo blanco integrado, no transparente. La versión sobre blanco fue seleccionada por sus bordes más limpios; no usar las pruebas transparentes previas. Las especificaciones de interacción y accesibilidad están en la sección 16 del plan técnico.

Origen: `C:/Users/Usuario/OneDrive/Escritorio/kaizen.jpeg`. El archivo original no fue sobrescrito.

Método: herramienta integrada `image_gen`; edición/reconstrucción guiada por la imagen original. No se usó CLI ni una API key local. Revisión visual: símbolo completo, sin palabras, márgenes alrededor y sin recortes. No se afirma identidad píxel a píxel ni equivalencia SVG.

Prompt final utilizado:

```text
Using the attached original Kaizen Solution logo as the edit reference, reconstruct only its left circular emblem as an exceptionally clean high-resolution app icon. REMOVE all wordmark and tagline text completely. WHITE SOLID BACKGROUND, pure #FFFFFF, NOT transparent. Emblem centered on a square canvas with 10 percent white margin on all four sides. Faithfully retain teal upper circular outline, dark navy lower circular outline, sweeping navy upward arrow across the circle, navy circuit nodes and gear, and rising navy/orange bar chart in lower right. Simplify hairline details for readability at 64 pixels. Flat solid navy #183454, teal #50A997, orange #F29A39 fills only. Immaculate smooth vector-like edges, pure white clear gaps between shapes. No gradients, textures, colored artifacts, blur, shadows, highlights, letters, caption, extra border, UI mockup or watermark. Produce one standalone clean brand symbol ready to display on a white circular chat-launcher button.
```

Integración: copiar a assets estáticos de la aplicación, versionar/cachear como imagen pública de marca y aplicar `object-fit: contain`. Esa política de caché corresponde solo al logo; los gráficos/mapas privados usan endpoints autenticados sin caché compartida. No confundir el logo generado con mapas: los mapas deben producirse determinísticamente desde geometría y cifras verificadas.
