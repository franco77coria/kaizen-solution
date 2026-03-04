# Manual de Usuario: Panel de WhatsApp (Kaizen Solution)

Bienvenido al sistema avanzado de gestión de WhatsApp Business de Kaizen Solution. Esta herramienta te permitirá manejar todas tus comunicaciones por WhatsApp desde un solo lugar, combinando la atención al cliente manual con el poder de los envíos masivos y la Inteligencia Artificial.

A continuación, encontrarás una guía paso a paso de todas las herramientas a tu disposición.

---

## 1. El Panorama General (Dashboard)

Al ingresar a la sección de WhatsApp, lo primero que verás es el **Dashboard Principal**. Es tu panel de control gerencial.

### ¿Qué puedes ver aquí?
- **Rendimiento de Cuenta:** Verás un indicador de "Calidad WABA" (Verde, Amarillo, Rojo). Esto indica tu reputación oficial ante Meta (WhatsApp).
- **Tarjetas Superiores:** Te muestran rápidamente cuántos mensajes entraron, cuántos salieron, la cantidad de contactos guardados y la tasa de respuesta de tus clientes.
- **Rendimiento de Campañas Masivas:** Un conteo histórico de todos los mensajes automatizados generados, entregados, leídos y aquellos que fallaron (ejemplo, números inexistentes).
- **Visibilidad Financiera (Burn Rate):** ¡Tu billetera digital! Te muestra cuánto has gastado en envíos masivos.
  - El **Costo Meta** calcula los cobros por "Conversación de Marketing" o "Utilidad".
  - El **Costo ElevenLabs** suma los centavos gastados en clonar voces con Inteligencia Artificial.
- **Filtro de Fecha Local:** En la esquina superior derecha, puedes filtrar todas estas métricas para ver solo lo que pasó Hoy, en los Últimos 7 o 30 días, o históricamente.

> **💡 Truco:** Usa la **🧮 Calculadora de Presupuesto Dinámica** ubicada debajo de las gráficas financieras. Te permite ingresar variables como _Cantidad de Personas_ a targetear y _Longitud del Audio IA_ para que estimes un presupuesto seguro en dólares antes de invertir en una campaña publicitaria.

---

## 2. Atención al Cliente (Mensajes CRM)

Esta es tu bandeja de entrada manual para conversar de uno a uno.

### Funcionalidades Clave de Conversación:
- **Lista de Contactos (Izquierda):** Verás todas las personas que alguna vez te escribieron, ordenadas por sus últimos mensajes. Un punto luminoso te avisará de mensajes no leídos.
- **Envío de Archivos Multimedia (Clip 📎):** En la barra de escritura, puedes subir imágenes (jpg, png) o documentos (PDF, Docx). Tu cliente lo recibirá tal cual como si enviaras una foto desde tu celular personal.
- **Modo Audio IA (Botón 🎙️ / ⌨️):** ¡La magia ocurre aquí! Si cambias al 'Modo Audio IA', la barra dejará de pedirte un texto normal. Al tipear tu respuesta (ej: _"Hola Juan, tu turno está agendado"_), el sistema no enviará un texto aburrido. Generará una nota de voz realista, pausada y empática simulando a una persona y el cliente recibirá un audio jugable, no un archivo adjunto extraño. Asegúrate de elegir tu "Voz de Agente" favorita en el desplegable que se asoma arriba de tu teclado.

---

## 3. Base de Datos de Contactos

Tu libreta de direcciones centralizada.

- **Importador CSV:** Puedes subir un Excel (.csv) masivo con cientos de números de clientes de antiguas campañas. El sistema detecta prefijos, formatea si les falta el código de país (ej. +54 o +52) y los asigna automáticamente a un grupo objetivo.
- **Etiquetas y Listas:** Puedes agrupar a tus clientes (ej. "Pacientes Recurrentes", "Prospectos Septiembre", "VIPs"). Estas listas son cruciales luego para disparar las Campañas Masivas.

---

## 4. Plantillas de Meta (Templates)

Para que Meta (el dueño de WhatsApp) no te bloquee por enviar SPAM comercial, el primer mensaje a una persona fuera de una ventana de 24 horas debe estar pre-aprobado. 

- En la sección **Plantillas**, verás los textos modelo autorizados en tu cuenta de Meta Business Manager (ej. _"Hola {{1}}, tu pedido {{2}} ha llegado"_).
- Solo puedes "sincronizarlas" aquí; el proceso de aprobación legal ocurre siempre en Facebook/Meta.

---

## 5. El Motor de Campañas Masivas (Enviar masivo)

El núcleo del negocio. Aquí creas las transmisiones automatizadas para nutrir listas enteras de Excel (tus prospectos o clientes).

### ¿Cómo lanzar una campaña de Plantilla de Texto?
1. Elige una Lista pre-cargada.
2. Selecciona "Plantilla Texto" como tipo de campaña.
3. Elige el formato autorizado en Meta.
4. **Mapeo:** Si el saludo dice `{{1}}`, el sistema te dirá "_¿Qué columna de tu Excel representa {{1}}?_". Simplemente en el desplegable escoges "Nombre" o "Apellido" para que el envío mande mensajes hiper-personalizados.

### ¿Cómo lanzar una campaña de Audio IA con Inteligencia Artificial?
¿Qué pasaría si pudieras mandar 500 audios explicativos distintos a 500 prospectos y que _a cada uno el audio lo llame por su nombre personal_?
1. Escoge "Audio IA" como tipo.
2. Escoge a tu Actor de Voz desde ElevenLabs.
3. Escribe tu guión, por ejemplo: _"¡Hola mi querido {nombre}! Te comento que nos ha ingresado un pago de {monto}."_
4. El sistema mapeará _{nombre}_ y _{monto}_ con tus columnas de Excel. Antes de enviarse, nuestra IA regenerará un archivo MP3 en la nube individualizado para cada número, con voces humanas reales.  

> **💡 Novedad:** Una vez rellenados los datos, verás un cartel luminoso abajo con una  **Inversión Estimada**. Podrás usar un botón mágico llamado **"Dry-Run" o "Enviar Prueba a Mi WA"** para probar la campaña en tu propio celular primero, certificando los audios y variables, sin gastar créditos de Meta.

_Nota: Si un usuario responde con la palabra STOP, el bot lo bloqueará automáticamente para respetar las leyes vigentes de desuscripción de Marketing, evitando bloqueos por reporte de SPAM._
