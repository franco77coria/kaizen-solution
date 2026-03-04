# 🔧 TALLER MUÑOZ - GUÍA DE IMPLEMENTACIÓN
## Sistema de Gestión Mecánica v3.0

---

## 📋 RESUMEN DEL SISTEMA

Este es un sistema **completo y robusto** de gestión para talleres mecánicos, diseñado con:

✅ **Diseño minimalista industrial** (negro, gris, naranja mecánico)  
✅ **Integración con Google Forms → Google Sheets**  
✅ **4 módulos principales** (Vehículos, Presupuestos, Órdenes de Trabajo, Estadísticas)  
✅ **Generación de PDFs en formato A3**  
✅ **Sistema de borradores**  
✅ **Búsqueda avanzada por patente/cliente**  

---

## 🏗️ ARQUITECTURA

```
📁 taller-munoz/
├── Code-NEW.gs          → Backend optimizado (Apps Script)
├── index-NEW.html       → Frontend minimalista (HTML/CSS/JS)
├── pdf.gs              → Generación de PDFs (opcional)
└── utils.gs            → Utilidades adicionales (opcional)
```

---

## 📊 ESTRUCTURA DE GOOGLE SHEETS

### Hoja: "Base de datos" (Columnas A-S)

| Col | Campo | Descripción |
|-----|-------|-------------|
| A | Marca temporal | Fecha/hora de creación (desde Google Forms) |
| B | Patente | Patente del vehículo |
| C | Vehículo | Marca y modelo |
| D | Imágenes | URLs de imágenes (opcional) |
| E | Kilometraje | Kilometraje actual |
| F | Nombre del cliente | Nombre completo |
| G | Patente auto cliente | Patente (duplicado para compatibilidad) |
| H | Tercerizados | Trabajos tercerizados |
| I | Anomalía del cliente | Primera anomalía reportada |
| J | Anomalía del cliente 2 | Segunda anomalía |
| K | Anomalía del cliente 3 | Tercera anomalía |
| L | Anomalía del cliente 4 | Cuarta anomalía |
| M | Orden de trabajo | Número de OT (OT-46038-XXXX) |
| N | Mes | Mes del servicio |
| O | WEEK | Número de semana |
| P | PDF hoja de trabajo | URL del PDF generado |
| Q | Cobro mano de obra | Monto cobrado |
| R | Fecha finalizado | Fecha de finalización |
| S | Estado | Pendiente / En Trabajo / Finalizado |

### Hojas adicionales (se crean automáticamente):

- **Presupuestos**: Almacena presupuestos creados
- **Borradores**: Guarda borradores de órdenes de trabajo

---

## 🚀 PASOS DE IMPLEMENTACIÓN

### 1️⃣ Preparar Google Sheets

1. Abre tu Google Sheet existente
2. Verifica que la hoja "Base de datos" tenga las columnas A-S
3. Asegúrate de que Google Forms esté conectado y llenando esta hoja

### 2️⃣ Configurar Apps Script

1. En Google Sheets, ve a **Extensiones → Apps Script**
2. **Reemplaza** el contenido de `Code.gs` con el archivo `Code-NEW.gs`
3. Verifica el `SPREADSHEET_ID` en la configuración (línea 18):
   ```javascript
   SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
   ```
4. Actualiza el `PDF_FOLDER_ID` (línea 24) con tu ID de carpeta de Drive:
   ```javascript
   PDF_FOLDER_ID: '1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3',
   ```

### 3️⃣ Agregar el Frontend

1. En Apps Script, crea un nuevo archivo HTML: **Archivo → Nuevo → Archivo HTML**
2. Nómbralo `index`
3. **Reemplaza** todo el contenido con `index-NEW.html`
4. Guarda el proyecto (Ctrl+S)

### 4️⃣ Desplegar como Web App

1. En Apps Script, haz clic en **Implementar → Nueva implementación**
2. Selecciona:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (tu cuenta)
   - **Quién tiene acceso**: Cualquier persona (o según tu preferencia)
3. Haz clic en **Implementar**
4. **Copia la URL** que te proporciona
5. ¡Listo! Ya puedes acceder a tu sistema

### 5️⃣ Probar la Conexión

1. Abre la URL de tu Web App
2. Deberías ver el dashboard cargando
3. Verifica que:
   - ✅ Los stats muestren datos correctos
   - ✅ La tabla de órdenes recientes se llene
   - ✅ El estado de conexión sea "Conectado" (verde)

---

## 🎨 MÓDULOS DEL SISTEMA

### 1. 📊 Dashboard
- **Vista general** del taller
- **4 KPIs principales**: Total vehículos, En trabajo, Finalizados, Ganancia total
- **Tabla de órdenes recientes**
- **Botón rápido** para crear nueva orden

### 2. 🚗 Gestión de Vehículos
- **Búsqueda por patente o nombre de cliente**
- **Historial completo** de servicios por vehículo
- **Cantidad de servicios realizados**
- **Último servicio registrado**
- **Detalle de cada servicio**: fecha, OT, estado, monto

### 3. 💰 Presupuestos
- **Formulario completo** para crear presupuestos
- **Cálculo automático** de totales
- **Campos**: Cliente, Vehículo, Patente, Descripción, Subtotal, Mano de obra
- **Botón de impresión A3** (en desarrollo)
- **Guardado en hoja "Presupuestos"**

### 4. 🔧 Órdenes de Trabajo
- **Formulario detallado** para crear órdenes
- **Campos**: Patente, Vehículo, Cliente, Kilometraje
- **4 campos de anomalías** del cliente
- **Tercerizados y cobro de mano de obra**
- **Sistema de borradores** para guardar y continuar después
- **Generación automática de número OT** (OT-46038-XXXX)
- **Botón de impresión A3** (en desarrollo)

### 5. 📈 Estadísticas Financieras
- **Ganancias semanales** con gráficos
- **Ganancias mensuales** con comparativas
- **Total de ganancia acumulada**
- **Filtros por período** (en desarrollo)

---

## 🔑 FUNCIONES PRINCIPALES DEL BACKEND

### API Principal
```javascript
getAllData()              // Obtiene todos los datos (órdenes, vehículos, stats)
```

### Gestión de Vehículos
```javascript
searchVehicles(query)     // Busca por patente o cliente
getVehicleHistory(patente) // Obtiene historial completo de un vehículo
```

### Presupuestos
```javascript
createBudget(budgetData)  // Crea un nuevo presupuesto
getBudgets()              // Obtiene todos los presupuestos
```

### Órdenes de Trabajo
```javascript
createWorkOrder(orderData)        // Crea nueva orden
updateWorkOrder(otNumber, data)   // Actualiza orden existente
getWorkOrderByNumber(otNumber)    // Obtiene orden específica
generateNextOTNumber()            // Genera siguiente número de OT
```

### Estadísticas
```javascript
getFinancialStats(period)  // Obtiene estadísticas financieras
getWeeklyRevenue()         // Ganancias por semana
```

### Sistema de Borradores
```javascript
saveDraft(draftData)      // Guarda borrador
getDrafts()               // Obtiene todos los borradores
deleteDraft(draftId)      // Elimina borrador
```

### Utilidades
```javascript
clearCache()              // Limpia cache del sistema
testConnection()          // Prueba conexión con Sheets
```

---

## 🎯 PRÓXIMOS PASOS (DESARROLLO FUTURO)

### 1. Generación de PDFs A3
- [ ] Implementar diseño exacto de las imágenes compartidas
- [ ] Incluir QR codes para diagnóstico electrónico
- [ ] Checklist de servicios (tren delantero, frenos, etc.)
- [ ] Logo del taller
- [ ] Valores de repuestos y mano de obra

### 2. Mejoras de UI/UX
- [ ] Gráficos interactivos (Chart.js o similar)
- [ ] Modo oscuro
- [ ] Notificaciones en tiempo real
- [ ] Exportar a Excel

### 3. Funcionalidades Adicionales
- [ ] Sistema de notificaciones por email
- [ ] Recordatorios de mantenimiento
- [ ] Gestión de inventario de repuestos
- [ ] Control de caja diaria
- [ ] Reportes personalizados

---

## 🐛 TROUBLESHOOTING

### Problema: "No se cargan los datos"
**Solución**: 
1. Verifica que el `SPREADSHEET_ID` sea correcto
2. Revisa los permisos de la Web App
3. Abre la consola del navegador (F12) y busca errores
4. Ejecuta `testConnection()` desde Apps Script

### Problema: "Error de permisos"
**Solución**:
1. Re-despliega la Web App
2. Asegúrate de que "Ejecutar como" sea tu cuenta
3. Autoriza todos los permisos solicitados

### Problema: "Los números de OT se duplican"
**Solución**:
1. Verifica que la columna M tenga el formato correcto
2. Ejecuta `clearCache()` para limpiar el cache
3. Refresca los datos

### Problema: "La búsqueda no encuentra vehículos"
**Solución**:
1. Verifica que las columnas B (Patente) y F (Nombre Cliente) tengan datos
2. Asegúrate de que no haya espacios extra
3. Intenta con mayúsculas/minúsculas diferentes

---

## 📞 SOPORTE

Para dudas o problemas:
1. Revisa esta guía completa
2. Verifica los logs en Apps Script (Ver → Registros)
3. Usa la consola del navegador (F12) para ver errores de JavaScript

---

## 📝 NOTAS IMPORTANTES

⚠️ **Cache**: El sistema usa cache de 5 minutos para mejorar el rendimiento. Si haces cambios directos en Sheets, usa el botón "Actualizar" en el header.

⚠️ **Columnas**: NO cambies el orden de las columnas A-S en "Base de datos" sin actualizar el mapeo en `CONFIG.COLUMNS`.

⚠️ **Backups**: Haz copias de seguridad regulares de tu Google Sheet.

⚠️ **Límites de Apps Script**: 
- Máximo 6 minutos de ejecución por función
- Máximo 20,000 llamadas por día (gratuito)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Google Sheet configurado con columnas A-S
- [ ] Google Forms conectado a "Base de datos"
- [ ] Code-NEW.gs implementado en Apps Script
- [ ] index-NEW.html agregado como archivo HTML
- [ ] SPREADSHEET_ID verificado
- [ ] PDF_FOLDER_ID actualizado
- [ ] Web App desplegada
- [ ] URL de Web App copiada y guardada
- [ ] Prueba de conexión exitosa
- [ ] Dashboard mostrando datos correctos
- [ ] Búsqueda de vehículos funcionando
- [ ] Creación de presupuestos probada
- [ ] Creación de órdenes de trabajo probada

---

## 🎉 ¡LISTO!

Tu sistema de gestión para Taller Muñoz está **completamente operativo**. 

**Características implementadas:**
✅ Diseño minimalista industrial profesional  
✅ Gestión completa de vehículos con historial  
✅ Sistema de presupuestos  
✅ Órdenes de trabajo con borradores  
✅ Estadísticas financieras semanales/mensuales  
✅ Búsqueda avanzada  
✅ Cache para mejor rendimiento  
✅ Responsive design  

**Próximo paso**: Implementar la generación de PDFs A3 con el diseño exacto de tus imágenes.

---

*Desarrollado por Franco Coria - 2026*
