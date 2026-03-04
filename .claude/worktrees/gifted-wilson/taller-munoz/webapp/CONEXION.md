# 🔌 Configuración de Conexión - Taller Muñoz

## ✅ Estado Actual

El sistema está **100% configurado** para conectarse a tu Google Sheets con la hoja **"Base de datos"**.

---

## 📋 Estructura de la Base de Datos

Tu hoja "Base de datos" tiene las siguientes columnas (21 columnas):

| # | Columna | Descripción |
|---|---------|-------------|
| 0 | Marca temporal | Fecha y hora del registro |
| 1 | Patente | Patente del vehículo |
| 2 | Vehiculo | Marca y modelo |
| 3 | Imagenes | URLs de imágenes (opcional) |
| 4 | Kilometraje | Kilometraje actual |
| 5 | Nombre del cliente | Nombre del cliente |
| 6 | Patente auto cliente | Referencia combinada (PATENTE \| VEHICULO \| CLIENTE) |
| 7 | Tercerizados | Trabajos tercerizados |
| 8 | Anomalia del cliente | Problema principal |
| 9 | Anomalia del cliente 2 | Problema adicional |
| 10 | Anomalia del cliente 3 | Problema adicional |
| 11 | Anomalia del cliente 4 | Problema adicional |
| 12 | Orden de trabajo | Número de OT (ej: OT-46038-0000) |
| 13 | Mes | Mes del trabajo (ENERO, FEBRERO, etc.) |
| 14 | WEEK | Número de semana del año |
| 15 | PDF hoja de trabajo | Nombre del archivo PDF |
| 16 | Cobro mano de obra | Monto cobrado (ej: $120.000) |
| 17 | Fecha finalizado | Fecha de finalización |
| 18 | Estado | Trabajando / Finalizado / Pendiente |
| 19 | fecha | Fecha en formato corto (46038) |
| 20 | Semana | Número de semana |

---

## 🔧 Configuración Actual en Code.gs

```javascript
const CONFIG = {
  SHEET_ID: '1eAkdprOYBCJLs1APEyNUydMAJsQ5MioN0mNbqDF3fyI',
  SHEETS: {
    WORK_SHEET: 'Hoja de trabajo',
    BUDGET: 'Presupuesto',
    BUDGET_LOG: 'Registro presupuesto',
    VEHICLES: 'Vehiculos',
    DATABASE: 'Base de datos',  // ✅ CONECTADO
    EARNINGS: 'Ganancia'
  },
  PDF_FOLDER_ID: '1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3',
  CACHE_DURATION: 300,
  OT_PREFIX: 'OT-46038-'
};
```

---

## 🚀 Pasos para Activar la Conexión

### 1. Desplegar Google Apps Script

1. Abre tu Google Sheets: `https://docs.google.com/spreadsheets/d/1eAkdprOYBCJLs1APEyNUydMAJsQ5MioN0mNbqDF3fyI`
2. Ve a **Extensiones > Apps Script**
3. **Borra todo** el código que esté en el editor
4. **Copia y pega** el contenido completo de `Code.gs`
5. Guarda el proyecto (Ctrl+S)
6. Haz clic en **Implementar > Nueva implementación**
7. Selecciona:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo
   - **Quién tiene acceso**: Cualquier persona
8. Haz clic en **Implementar**
9. **Copia la URL** que te da (algo como: `https://script.google.com/macros/s/AKfycbxxxxxxxxx/exec`)

### 2. Configurar el Frontend

1. Abre el archivo `webapp/app.js`
2. Busca la sección `CONFIG` (línea 12)
3. Reemplaza la URL:

```javascript
const CONFIG = {
    API_URL: 'PEGA_AQUI_LA_URL_DE_APPS_SCRIPT',
    SHEET_ID: '1eAkdprOYBCJLs1APEyNUydMAJsQ5MioN0mNbqDF3fyI',
    CACHE_DURATION: 5 * 60 * 1000,
    DEMO_MODE: false  // ⚠️ Cambiar a false para usar datos reales
};
```

### 3. Probar la Conexión

1. Abre `webapp/index.html` en tu navegador
2. El sistema debería cargar automáticamente
3. Verifica que:
   - Las estadísticas muestren datos reales
   - La tabla de órdenes tenga tus trabajos
   - Los filtros funcionen
   - Los PDFs se puedan abrir

---

## 📊 Mapeo de Datos

### Del CSV al Frontend

El sistema ahora mapea correctamente:

- **Patente**: Columna 1 → `order.patente`
- **Vehículo**: Columna 2 → `order.vehiculo`
- **Cliente**: Columna 5 → `order.cliente`
- **Anomalías**: Columnas 8-11 → `order.anomalia` (combinadas)
- **OT**: Columna 12 → `order.otNumber`
- **Mano de Obra**: Columna 16 → `order.manoObra` (limpia $ y convierte a número)
- **Estado**: Columna 18 → `order.estado`
- **PDF**: Columna 15 → `order.pdfUrl` (convierte nombre a URL de Drive)

### Características Especiales

1. **Anomalías Combinadas**: Las 4 columnas de anomalías se combinan en una sola separadas por comas
2. **Mano de Obra**: Se limpia el formato `$120.000` y se convierte a número `120000`
3. **PDFs**: Se busca el archivo en la carpeta de Drive y se genera la URL completa
4. **Filtros**: Funcionan con patente, cliente y estado

---

## 🎯 Funciones Disponibles

### Desde el Frontend (JavaScript)

```javascript
// Obtener todas las órdenes
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result.data);
  })
  .getWorkOrders({});

// Filtrar por estado
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result.data);
  })
  .getWorkOrders({ estado: 'Finalizado' });

// Buscar por patente
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result.data);
  })
  .getWorkOrders({ patente: 'AD 309 LU' });

// Crear nueva orden
google.script.run
  .withSuccessHandler(function(result) {
    console.log('OT creada:', result.otNumber);
  })
  .createWorkOrder({
    patente: 'ABC 123',
    marca: 'Ford Focus',
    kilometraje: 50000,
    cliente: 'Juan Pérez',
    anomaliaCliente: 'Ruido en motor',
    estado: 'Trabajando'
  });

// Obtener historial de vehículo
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result.history);
  })
  .getVehicleHistory('AD 309 LU');

// Obtener estadísticas
google.script.run
  .withSuccessHandler(function(result) {
    console.log(result.stats);
  })
  .getFinancialStats({});
```

---

## 🔍 Verificación

### Checklist de Conexión

- [ ] Code.gs copiado en Apps Script
- [ ] Apps Script desplegado como Web App
- [ ] URL copiada del despliegue
- [ ] URL pegada en `webapp/app.js`
- [ ] `DEMO_MODE` cambiado a `false`
- [ ] Archivo `index.html` abierto en navegador
- [ ] Datos cargando correctamente
- [ ] Filtros funcionando
- [ ] PDFs abriendo correctamente

### Solución de Problemas

**Si no carga datos:**
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que la URL de Apps Script sea correcta
4. Asegúrate de que `DEMO_MODE` esté en `false`

**Si dice "Error de conexión":**
1. Verifica que el Apps Script esté desplegado
2. Comprueba que el acceso sea "Cualquier persona"
3. Revisa los permisos de Google Sheets

**Si los PDFs no abren:**
1. Verifica que `PDF_FOLDER_ID` sea correcto
2. Asegúrate de que los archivos PDF estén en esa carpeta
3. Comprueba que los nombres coincidan exactamente

---

## 📱 Modo Demo vs Producción

### Modo Demo (DEMO_MODE: true)
- Usa datos de ejemplo hardcodeados
- No requiere conexión a Google Sheets
- Perfecto para probar el diseño
- No guarda cambios

### Modo Producción (DEMO_MODE: false)
- Se conecta a Google Sheets real
- Carga datos de "Base de datos"
- Permite crear nuevas órdenes
- Guarda cambios permanentemente

---

## 🎨 Personalización

### Cambiar el Prefijo de OT

En `Code.gs`, línea 26:
```javascript
OT_PREFIX: 'OT-46038-'  // Cambiar según necesites
```

### Cambiar la Carpeta de PDFs

En `Code.gs`, línea 24:
```javascript
PDF_FOLDER_ID: 'TU_FOLDER_ID_AQUI'
```

Para obtener el ID de la carpeta:
1. Abre la carpeta en Google Drive
2. Mira la URL: `https://drive.google.com/drive/folders/ESTE_ES_EL_ID`

---

## ✅ Resumen

**Todo está configurado y listo para:**
1. Leer datos de la hoja "Base de datos"
2. Mostrar órdenes de trabajo
3. Filtrar y buscar
4. Ver historial de vehículos
5. Calcular estadísticas
6. Crear nuevas órdenes
7. Abrir PDFs desde Drive

**Solo necesitas:**
1. Desplegar el Apps Script
2. Copiar la URL
3. Pegarla en `app.js`
4. Cambiar `DEMO_MODE` a `false`

---

**¡El sistema está 100% preparado para conectarse a tu Google Sheets! 🚀**
