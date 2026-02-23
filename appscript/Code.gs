/**
 * Sistema de Gestión Taller Muñoz
 * Google Apps Script Backend
 * @author Franco Coria
 * @version 1.0.0
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  SHEET_ID: '1eAkdprOYBCJLs1APEyNUydMAJsQ5MioN0mNbqDF3fyI',
  SHEETS: {
    WORK_SHEET: 'Hoja de trabajo',
    BUDGET: 'Presupuesto',
    BUDGET_LOG: 'Registro presupuesto',
    VEHICLES: 'Vehiculos',
    DATABASE: 'Base de datos',
    EARNINGS: 'Ganancia'
  },
  CACHE_DURATION: 300, // 5 minutos
  OT_PREFIX: 'OT-46038-'
};

// ============================================
// ENTRY POINTS
// ============================================

/**
 * Sirve la aplicación web (frontend)
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Taller Muñoz - Sistema de Gestión')
    .setFaviconUrl('https://img.icons8.com/fluency/48/wrench.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Include helper para cargar archivos HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// UTILIDADES GENERALES
// ============================================

/**
 * Obtiene el spreadsheet activo
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

/**
 * Obtiene una hoja específica
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada`);
  }
  return sheet;
}

/**
 * Genera el siguiente número de OT
 */
function generateNextOTNumber() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    // Buscar el último número de OT
    let maxNumber = 0;
    for (let i = 1; i < data.length; i++) {
      const otNumber = data[i][1]; // Columna B (Número OT)
      if (otNumber && typeof otNumber === 'string' && otNumber.startsWith(CONFIG.OT_PREFIX)) {
        const number = parseInt(otNumber.replace(CONFIG.OT_PREFIX, ''));
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }
    
    const nextNumber = maxNumber + 1;
    return CONFIG.OT_PREFIX + String(nextNumber).padStart(4, '0');
    
  } catch (error) {
    Logger.log('Error generando número OT: ' + error);
    return CONFIG.OT_PREFIX + '0001';
  }
}

/**
 * Formatea un número como moneda
 */
function formatCurrency(amount) {
  return '$' + Number(amount).toLocaleString('es-CO');
}

/**
 * Obtiene la fecha actual en formato colombiano
 */
function getCurrentDate() {
  return Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy');
}

/**
 * Obtiene la fecha y hora actual
 */
function getCurrentDateTime() {
  return Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm:ss');
}

// ============================================
// API - ÓRDENES DE TRABAJO
// ============================================

/**
 * Crea una nueva orden de trabajo
 */
function createWorkOrder(data) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const otNumber = generateNextOTNumber();
    const timestamp = getCurrentDateTime();
    
    // Preparar fila de datos
    const row = [
      timestamp,                    // A: Marca temporal
      otNumber,                     // B: Número OT
      'Trabajo',                    // C: Tipo
      data.patente || '',           // D: Patente
      data.marca || '',             // E: Marca
      data.modelo || '',            // F: Modelo
      data.kilometraje || '',       // G: Kilometraje
      data.proximoService || '',    // H: Próximo Service
      data.cliente || '',           // I: Cliente
      data.telefono || '',          // J: Teléfono
      data.email || '',             // K: Email
      data.fechaEntrada || getCurrentDate(),  // L: Fecha Entrada
      data.fechaSalida || '',       // M: Fecha Salida
      data.anomaliaCliente || '',   // N: Anomalía Cliente
      data.descargoTaller || '',    // O: Descargo Taller
      JSON.stringify(data.repuestos || []),  // P: Repuestos (JSON)
      data.manoObra || 0,           // Q: Mano de Obra
      data.total || 0,              // R: Total
      data.estado || 'Pendiente',   // S: Estado
      ''                            // T: PDF URL
    ];
    
    // Agregar fila al final
    sheet.appendRow(row);
    
    // Limpiar caché
    clearCache();
    
    return {
      success: true,
      otNumber: otNumber,
      message: 'Orden de trabajo creada exitosamente'
    };
    
  } catch (error) {
    Logger.log('Error creando OT: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene todas las órdenes de trabajo
 */
function getWorkOrders(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const workOrders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Solo órdenes de trabajo (no presupuestos)
      if (row[2] !== 'Trabajo') continue;
      
      const order = {
        timestamp: row[0],
        otNumber: row[1],
        tipo: row[2],
        patente: row[3],
        marca: row[4],
        modelo: row[5],
        kilometraje: row[6],
        proximoService: row[7],
        cliente: row[8],
        telefono: row[9],
        email: row[10],
        fechaEntrada: row[11],
        fechaSalida: row[12],
        anomaliaCliente: row[13],
        descargoTaller: row[14],
        repuestos: row[15] ? JSON.parse(row[15]) : [],
        manoObra: row[16],
        total: row[17],
        estado: row[18],
        pdfUrl: row[19],
        rowIndex: i + 1
      };
      
      // Aplicar filtros
      if (filters.patente && order.patente !== filters.patente) continue;
      if (filters.cliente && !order.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) continue;
      if (filters.estado && order.estado !== filters.estado) continue;
      
      workOrders.push(order);
    }
    
    return {
      success: true,
      count: workOrders.length,
      data: workOrders
    };
    
  } catch (error) {
    Logger.log('Error obteniendo OTs: ' + error);
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

/**
 * Obtiene una orden de trabajo específica por número
 */
function getWorkOrderByNumber(otNumber) {
  try {
    const result = getWorkOrders({});
    if (!result.success) return result;
    
    const order = result.data.find(o => o.otNumber === otNumber);
    
    if (!order) {
      return {
        success: false,
        error: 'Orden de trabajo no encontrada'
      };
    }
    
    return {
      success: true,
      data: order
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Actualiza una orden de trabajo
 */
function updateWorkOrder(otNumber, data) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const allData = sheet.getDataRange().getValues();
    
    // Buscar la fila
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][1] === otNumber) {
        rowIndex = i + 1; // +1 porque las filas empiezan en 1
        break;
      }
    }
    
    if (rowIndex === -1) {
      return {
        success: false,
        error: 'Orden de trabajo no encontrada'
      };
    }
    
    // Actualizar campos específicos
    if (data.fechaSalida !== undefined) sheet.getRange(rowIndex, 13).setValue(data.fechaSalida);
    if (data.descargoTaller !== undefined) sheet.getRange(rowIndex, 15).setValue(data.descargoTaller);
    if (data.repuestos !== undefined) sheet.getRange(rowIndex, 16).setValue(JSON.stringify(data.repuestos));
    if (data.manoObra !== undefined) sheet.getRange(rowIndex, 17).setValue(data.manoObra);
    if (data.total !== undefined) sheet.getRange(rowIndex, 18).setValue(data.total);
    if (data.estado !== undefined) sheet.getRange(rowIndex, 19).setValue(data.estado);
    if (data.pdfUrl !== undefined) sheet.getRange(rowIndex, 20).setValue(data.pdfUrl);
    
    clearCache();
    
    return {
      success: true,
      message: 'Orden de trabajo actualizada'
    };
    
  } catch (error) {
    Logger.log('Error actualizando OT: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// API - PRESUPUESTOS
// ============================================

/**
 * Crea un nuevo presupuesto
 */
function createBudget(data) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const budgetNumber = generateNextOTNumber(); // Usar mismo formato
    const timestamp = getCurrentDateTime();
    
    const row = [
      timestamp,
      budgetNumber,
      'Presupuesto',
      data.patente || '',
      data.marca || '',
      data.modelo || '',
      data.kilometraje || '',
      data.proximoService || '',
      data.cliente || '',
      data.telefono || '',
      data.email || '',
      getCurrentDate(),
      '',
      data.descripcion || '',
      '',
      JSON.stringify(data.repuestos || []),
      data.manoObra || 0,
      data.total || 0,
      'Presupuesto',
      ''
    ];
    
    sheet.appendRow(row);
    clearCache();
    
    return {
      success: true,
      budgetNumber: budgetNumber,
      message: 'Presupuesto creado exitosamente'
    };
    
  } catch (error) {
    Logger.log('Error creando presupuesto: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene todos los presupuestos
 */
function getBudgets(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    const budgets = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (row[2] !== 'Presupuesto') continue;
      
      const budget = {
        timestamp: row[0],
        budgetNumber: row[1],
        tipo: row[2],
        patente: row[3],
        marca: row[4],
        modelo: row[5],
        cliente: row[8],
        telefono: row[9],
        descripcion: row[13],
        repuestos: row[15] ? JSON.parse(row[15]) : [],
        manoObra: row[16],
        total: row[17],
        pdfUrl: row[19],
        rowIndex: i + 1
      };
      
      budgets.push(budget);
    }
    
    return {
      success: true,
      count: budgets.length,
      data: budgets
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

// ============================================
// API - VEHÍCULOS
// ============================================

/**
 * Obtiene el historial de un vehículo por patente
 */
function getVehicleHistory(patente) {
  try {
    const result = getWorkOrders({ patente: patente });
    
    if (!result.success) return result;
    
    // Ordenar por fecha descendente
    const history = result.data.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Calcular estadísticas
    const stats = {
      totalServicios: history.length,
      costoPromedio: history.length > 0 ? 
        history.reduce((sum, h) => sum + (h.total || 0), 0) / history.length : 0,
      ultimoServicio: history.length > 0 ? history[0].fechaEntrada : null,
      kilometrajeActual: history.length > 0 ? history[0].kilometraje : 0
    };
    
    return {
      success: true,
      patente: patente,
      stats: stats,
      history: history
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Busca vehículos por patente o cliente
 */
function searchVehicles(query) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    const vehicles = new Map();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const patente = row[3];
      const cliente = row[8];
      
      // Filtrar por query
      if (query && query.trim() !== '') {
        const q = query.toLowerCase();
        if (!patente.toLowerCase().includes(q) && !cliente.toLowerCase().includes(q)) {
          continue;
        }
      }
      
      if (!vehicles.has(patente)) {
        vehicles.set(patente, {
          patente: patente,
          marca: row[4],
          modelo: row[5],
          cliente: cliente,
          ultimoServicio: row[11],
          serviciosCount: 1
        });
      } else {
        const v = vehicles.get(patente);
        v.serviciosCount++;
        vehicles.set(patente, v);
      }
    }
    
    return {
      success: true,
      count: vehicles.size,
      data: Array.from(vehicles.values())
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

// ============================================
// API - ANÁLISIS FINANCIERO
// ============================================

/**
 * Obtiene estadísticas financieras generales
 */
function getFinancialStats(dateRange = {}) {
  try {
    const result = getWorkOrders({});
    if (!result.success) return result;
    
    let orders = result.data;
    
    // Filtrar por rango de fechas si se proporciona
    if (dateRange.from || dateRange.to) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.fechaEntrada);
        if (dateRange.from && orderDate < new Date(dateRange.from)) return false;
        if (dateRange.to && orderDate > new Date(dateRange.to)) return false;
        return true;
      });
    }
    
    // Calcular estadísticas
    const totalIngresos = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalManoObra = orders.reduce((sum, o) => sum + (o.manoObra || 0), 0);
    const totalRepuestos = orders.reduce((sum, o) => {
      const repuestos = o.repuestos || [];
      return sum + repuestos.reduce((s, r) => s + (r.precio || 0), 0);
    }, 0);
    
    const completados = orders.filter(o => o.estado === 'Completado').length;
    const pendientes = orders.filter(o => o.estado === 'Pendiente').length;
    
    return {
      success: true,
      stats: {
        totalTrabajos: orders.length,
        totalIngresos: totalIngresos,
        totalManoObra: totalManoObra,
        totalRepuestos: totalRepuestos,
        promedioTicket: orders.length > 0 ? totalIngresos / orders.length : 0,
        completados: completados,
        pendientes: pendientes,
        margenGanancia: totalIngresos > 0 ? ((totalManoObra / totalIngresos) * 100).toFixed(2) : 0
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene ingresos semanales para gráficos
 */
function getWeeklyRevenue() {
  try {
    const result = getWorkOrders({});
    if (!result.success) return result;
    
    const weeklyData = {};
    
    result.data.forEach(order => {
      if (!order.fechaEntrada) return;
      
      const date = new Date(order.fechaEntrada);
      const weekKey = getWeekKey(date);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          semana: weekKey,
          ingresos: 0,
          cantidad: 0
        };
      }
      
      weeklyData[weekKey].ingresos += order.total || 0;
      weeklyData[weekKey].cantidad += 1;
    });
    
    const weeks = Object.values(weeklyData).sort((a, b) => 
      a.semana.localeCompare(b.semana)
    );
    
    return {
      success: true,
      data: weeks
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene la clave de semana para una fecha
 */
function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Obtiene el número de semana del año
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// CACHE HELPERS
// ============================================

function getCachedData(key) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  return cached ? JSON.parse(cached) : null;
}

function setCachedData(key, data) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), CONFIG.CACHE_DURATION);
  } catch (e) {
    Logger.log('Cache failed: ' + e);
  }
}

function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['workOrders', 'budgets', 'vehicles', 'financialStats']);
  } catch (e) {
    Logger.log('Clear cache failed: ' + e);
  }
}

// ============================================
// FUNCIONES DE TESTING
// ============================================

/**
 * Función de prueba para verificar el backend
 */
function testBackend() {
  Logger.log('=== INICIANDO TESTS ===');
  
  // Test 1: Generar número de OT
  const otNumber = generateNextOTNumber();
  Logger.log('Nuevo número OT: ' + otNumber);
  
  // Test 2: Obtener órdenes de trabajo
  const orders = getWorkOrders({});
  Logger.log('Total órdenes: ' + orders.count);
  
  // Test 3: Estadísticas financieras
  const stats = getFinancialStats({});
  Logger.log('Estadísticas: ' + JSON.stringify(stats.stats));
  
  Logger.log('=== TESTS COMPLETADOS ===');
}
