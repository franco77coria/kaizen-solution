# 🚀 Guía Rápida: Actualizar Apps Script

## ⚡ Pasos para Aplicar la Solución

### 1️⃣ Abrir Google Apps Script
1. Ve a tu Google Sheet de Taller Muñoz
2. Menú: **Extensiones** → **Apps Script**

### 2️⃣ Actualizar el Archivo Code.gs
1. En el editor de Apps Script, abre el archivo `Code.gs`
2. Busca la función `getAllData()` (aproximadamente línea 1164)
3. Reemplaza toda la función con esta versión actualizada:

```javascript
function getAllData() {
  try {
    Logger.log('getAllData: Iniciando...');
    
    Logger.log('getAllData: Obteniendo work orders...');
    const workOrdersResult = getWorkOrders({});
    
    Logger.log('getAllData: Work orders obtenidas: ' + (workOrdersResult.data ? workOrdersResult.data.length : 0));
    
    // Cargar TODOS los registros
    const workOrders = workOrdersResult.success && workOrdersResult.data ? 
      workOrdersResult.data : [];
    
    Logger.log('getAllData: Calculando vehículos...');
    const vehicles = extractVehicles(workOrders);
    
    Logger.log('getAllData: Calculando estadísticas...');
    const stats = calculateStats(workOrders);
    
    Logger.log('getAllData: Obteniendo presupuestos...');
    const budgetsResult = getBudgets({});
    const budgets = budgetsResult.success ? (budgetsResult.data || []) : [];
    
    const result = {
      success: true,
      workOrders: workOrders,
      budgets: budgets,
      vehicles: vehicles,
      stats: stats,
      drafts: []
    };
    
    Logger.log('getAllData: Completado exitosamente');
    return result;

  } catch (error) {
    Logger.log('getAllData ERROR: ' + error.toString());
    return { 
      success: false, 
      error: error.toString(),
      workOrders: [],
      budgets: [],
      vehicles: [],
      stats: null
    };
  }
}
```

### 3️⃣ Guardar y Desplegar
1. **Guardar**: Ctrl+S o botón "Guardar proyecto"
2. **Desplegar**: 
   - Botón "Implementar" → "Administrar implementaciones"
   - Click en ✏️ (editar) en tu implementación activa
   - Cambiar "Nueva versión" en el dropdown
   - Click "Implementar"

### 4️⃣ Verificar
1. Abre tu Web App (URL de implementación)
2. Espera ~2 minutos para que cargue
3. Verifica que:
   - ✅ No aparezca error de cache
   - ✅ Se carguen las 1766 órdenes
   - ✅ Todas las funcionalidades funcionen

## 🔍 ¿Qué Cambió?

### ❌ Antes (con error)
```javascript
// Intentar cache
const cached = getCachedData('allData');
if (cached) return cached;

// ... obtener datos ...

// ❌ ESTO FALLABA
setCachedData('allData', result);
```

### ✅ Después (sin error)
```javascript
// Sin cache - datos frescos siempre
const workOrdersResult = getWorkOrders({});
// ... procesar datos ...
return result; // ✅ Retorna directamente
```

## 📊 Logs Esperados

Después de la actualización, en **Ejecuciones** deberías ver:

```
✅ getAllData: Iniciando...
✅ getAllData: Obteniendo work orders...
✅ getAllData: Work orders obtenidas: 1766
✅ getAllData: Calculando vehículos...
✅ getAllData: Calculando estadísticas...
✅ getAllData: Obteniendo presupuestos...
✅ getAllData: Completado exitosamente
```

**Sin el error**: ~~Cache failed: Exception: Argumento demasiado grande~~

## ⚠️ Notas Importantes

- **Tiempo de carga**: ~2 minutos es normal para 1766 registros
- **Sin pérdida de datos**: Todos los registros se cargan
- **Cache deshabilitado**: Pero el sistema funciona perfectamente sin él
- **Rendimiento**: Aceptable para tu volumen de datos

## 🆘 Si Tienes Problemas

1. **Error al guardar**: Verifica que estés editando el archivo correcto
2. **No se actualiza**: Asegúrate de crear una "Nueva versión" al desplegar
3. **Sigue con error**: Verifica que hayas reemplazado toda la función
4. **Otros errores**: Revisa los logs en "Ejecuciones" para más detalles

---

**¿Listo?** Sigue los pasos y tu sistema funcionará sin errores! 🎉
