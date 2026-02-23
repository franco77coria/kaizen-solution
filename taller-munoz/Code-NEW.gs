/**
 * ============================================
 * TALLER MUÑOZ - SISTEMA DE GESTIÓN MECÁNICA
 * Google Apps Script Backend v3.0
 * @author Franco Coria
 * @date 2026-02-07
 * ============================================
 */

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  SHEETS: {
    DATABASE: 'Base de datos',
    BUDGETS: 'Presupuestos',
    DRAFTS: 'Borradores'
  },
  PDF_FOLDER_ID: '1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3',
  CACHE_DURATION: 300,
  OT_PREFIX: 'OT-46038-',
  
  // Mapeo de columnas de la hoja "Base de datos" (A-S)
  COLUMNS: {
    MARCA_TEMPORAL: 0,      // A
    PATENTE: 1,             // B
    VEHICULO: 2,            // C
    IMAGENES: 3,            // D
    KILOMETRAJE: 4,         // E
    NOMBRE_CLIENTE: 5,      // F
    PATENTE_CLIENTE: 6,     // G (parece duplicado, verificar)
    TERCERIZADOS: 7,        // H
    ANOMALIA_1: 8,          // I
    ANOMALIA_2: 9,          // J
    ANOMALIA_3: 10,         // K
    ANOMALIA_4: 11,         // L
    ORDEN_TRABAJO: 12,      // M
    MES: 13,                // N
    WEEK: 14,               // O
    PDF_HOJA_TRABAJO: 15,   // P
    COBRO_MANO_OBRA: 16,    // Q
    FECHA_FINALIZADO: 17,   // R
    ESTADO: 18              // S
  }
};

// ============================================
// ENTRY POINT - WEB APP
// ============================================

function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('index');
    return template.evaluate()
      .setTitle('Taller Muñoz - Sistema de Gestión')
      .setFaviconUrl('https://img.icons8.com/fluency/48/car-service.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return HtmlService.createHtmlOutput('<h1>Error al cargar la aplicación</h1><p>' + error.toString() + '</p>');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// UTILIDADES GENERALES
// ============================================

function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Hoja "${sheetName}" creada automáticamente`);
  }
  
  return sheet;
}

function formatCurrency(amount) {
  if (!amount || isNaN(amount)) return '$0';
  return '$' + Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getCurrentDate() {
  const now = new Date();
  return Utilities.formatDate(now, 'America/Bogota', 'dd/MM/yyyy');
}

function getCurrentDateTime() {
  const now = new Date();
  return Utilities.formatDate(now, 'America/Bogota', 'dd/MM/yyyy HH:mm:ss');
}

function generateNextOTNumber() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    let maxNumber = 0;
    
    for (let i = 1; i < data.length; i++) {
      const otNumber = data[i][CONFIG.COLUMNS.ORDEN_TRABAJO];
      if (otNumber && typeof otNumber === 'string') {
        const match = otNumber.match(/OT-46038-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) maxNumber = num;
        }
      }
    }
    
    const nextNumber = String(maxNumber + 1).padStart(4, '0');
    return `${CONFIG.OT_PREFIX}${nextNumber}`;
  } catch (error) {
    Logger.log('Error generando OT: ' + error.toString());
    return `${CONFIG.OT_PREFIX}0001`;
  }
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
    return true;
  } catch (error) {
    Logger.log('Error en cache: ' + error.toString());
    return false;
  }
}

function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['allOrders', 'stats', 'vehicles']);
    return { success: true, message: 'Cache limpiado correctamente' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================
// API - OBTENER TODOS LOS DATOS
// ============================================

function getAllData() {
  try {
    // Intentar obtener de cache primero
    const cached = getCachedData('allData');
    if (cached) {
      Logger.log('Datos obtenidos de cache');
      return cached;
    }
    
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        orders: [],
        stats: {
          total: 0,
          enTrabajo: 0,
          finalizados: 0,
          totalGanancia: 0
        },
        vehicles: []
      };
    }
    
    const orders = [];
    const vehiclesMap = new Map();
    
    let totalGanancia = 0;
    let enTrabajo = 0;
    let finalizados = 0;
    
    // Procesar cada fila (saltando header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const order = {
        id: i,
        marcaTemporal: row[CONFIG.COLUMNS.MARCA_TEMPORAL] || '',
        patente: row[CONFIG.COLUMNS.PATENTE] || '',
        vehiculo: row[CONFIG.COLUMNS.VEHICULO] || '',
        imagenes: row[CONFIG.COLUMNS.IMAGENES] || '',
        kilometraje: row[CONFIG.COLUMNS.KILOMETRAJE] || '',
        nombreCliente: row[CONFIG.COLUMNS.NOMBRE_CLIENTE] || '',
        patenteCliente: row[CONFIG.COLUMNS.PATENTE_CLIENTE] || '',
        tercerizados: row[CONFIG.COLUMNS.TERCERIZADOS] || '',
        anomalia1: row[CONFIG.COLUMNS.ANOMALIA_1] || '',
        anomalia2: row[CONFIG.COLUMNS.ANOMALIA_2] || '',
        anomalia3: row[CONFIG.COLUMNS.ANOMALIA_3] || '',
        anomalia4: row[CONFIG.COLUMNS.ANOMALIA_4] || '',
        ordenTrabajo: row[CONFIG.COLUMNS.ORDEN_TRABAJO] || '',
        mes: row[CONFIG.COLUMNS.MES] || '',
        week: row[CONFIG.COLUMNS.WEEK] || '',
        pdfHojaTrabajo: row[CONFIG.COLUMNS.PDF_HOJA_TRABAJO] || '',
        cobroManoObra: row[CONFIG.COLUMNS.COBRO_MANO_OBRA] || 0,
        fechaFinalizado: row[CONFIG.COLUMNS.FECHA_FINALIZADO] || '',
        estado: row[CONFIG.COLUMNS.ESTADO] || 'Pendiente'
      };
      
      orders.push(order);
      
      // Estadísticas
      if (order.estado === 'En Trabajo') enTrabajo++;
      if (order.estado === 'Finalizado') finalizados++;
      if (order.cobroManoObra && !isNaN(order.cobroManoObra)) {
        totalGanancia += Number(order.cobroManoObra);
      }
      
      // Agrupar por vehículo
      const patente = order.patente || order.patenteCliente;
      if (patente) {
        if (!vehiclesMap.has(patente)) {
          vehiclesMap.set(patente, {
            patente: patente,
            vehiculo: order.vehiculo,
            cliente: order.nombreCliente,
            servicios: [],
            totalServicios: 0,
            ultimoServicio: order.marcaTemporal
          });
        }
        
        const vehicle = vehiclesMap.get(patente);
        vehicle.servicios.push({
          fecha: order.marcaTemporal,
          ordenTrabajo: order.ordenTrabajo,
          estado: order.estado,
          monto: order.cobroManoObra
        });
        vehicle.totalServicios++;
      }
    }
    
    const result = {
      success: true,
      orders: orders,
      stats: {
        total: orders.length,
        enTrabajo: enTrabajo,
        finalizados: finalizados,
        totalGanancia: totalGanancia
      },
      vehicles: Array.from(vehiclesMap.values())
    };
    
    // Guardar en cache
    setCachedData('allData', result);
    
    return result;
    
  } catch (error) {
    Logger.log('Error en getAllData: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      orders: [],
      stats: { total: 0, enTrabajo: 0, finalizados: 0, totalGanancia: 0 },
      vehicles: []
    };
  }
}

// ============================================
// API - GESTIÓN DE VEHÍCULOS
// ============================================

function searchVehicles(query) {
  try {
    if (!query || query.trim() === '') {
      return { success: false, message: 'Debe ingresar una patente o nombre de cliente' };
    }
    
    const allData = getAllData();
    if (!allData.success) {
      return { success: false, message: 'Error al obtener datos' };
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Buscar en vehículos
    const matchingVehicles = allData.vehicles.filter(v => 
      (v.patente && v.patente.toLowerCase().includes(queryLower)) ||
      (v.cliente && v.cliente.toLowerCase().includes(queryLower))
    );
    
    return {
      success: true,
      results: matchingVehicles,
      count: matchingVehicles.length
    };
    
  } catch (error) {
    Logger.log('Error en searchVehicles: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getVehicleHistory(patente) {
  try {
    if (!patente) {
      return { success: false, message: 'Debe especificar una patente' };
    }
    
    const allData = getAllData();
    if (!allData.success) {
      return { success: false, message: 'Error al obtener datos' };
    }
    
    const vehicle = allData.vehicles.find(v => 
      v.patente && v.patente.toLowerCase() === patente.toLowerCase()
    );
    
    if (!vehicle) {
      return { success: false, message: 'Vehículo no encontrado' };
    }
    
    // Obtener todas las órdenes de este vehículo
    const orders = allData.orders.filter(o => 
      (o.patente && o.patente.toLowerCase() === patente.toLowerCase()) ||
      (o.patenteCliente && o.patenteCliente.toLowerCase() === patente.toLowerCase())
    );
    
    return {
      success: true,
      vehicle: vehicle,
      history: orders.sort((a, b) => new Date(b.marcaTemporal) - new Date(a.marcaTemporal))
    };
    
  } catch (error) {
    Logger.log('Error en getVehicleHistory: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ============================================
// API - PRESUPUESTOS
// ============================================

function createBudget(budgetData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BUDGETS);
    
    // Si la hoja está vacía, crear headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Fecha',
        'Cliente',
        'Vehículo',
        'Patente',
        'Items',
        'Subtotal',
        'Mano de Obra',
        'Total',
        'Estado',
        'PDF'
      ]);
    }
    
    const budgetNumber = `PRES-${new Date().getTime()}`;
    
    sheet.appendRow([
      getCurrentDateTime(),
      budgetData.cliente || '',
      budgetData.vehiculo || '',
      budgetData.patente || '',
      JSON.stringify(budgetData.items || []),
      budgetData.subtotal || 0,
      budgetData.manoObra || 0,
      budgetData.total || 0,
      'Pendiente',
      ''
    ]);
    
    clearCache();
    
    return {
      success: true,
      message: 'Presupuesto creado correctamente',
      budgetNumber: budgetNumber
    };
    
  } catch (error) {
    Logger.log('Error en createBudget: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getBudgets() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BUDGETS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, budgets: [] };
    }
    
    const budgets = [];
    
    for (let i = 1; i < data.length; i++) {
      budgets.push({
        id: i,
        fecha: data[i][0],
        cliente: data[i][1],
        vehiculo: data[i][2],
        patente: data[i][3],
        items: data[i][4],
        subtotal: data[i][5],
        manoObra: data[i][6],
        total: data[i][7],
        estado: data[i][8],
        pdf: data[i][9]
      });
    }
    
    return { success: true, budgets: budgets };
    
  } catch (error) {
    Logger.log('Error en getBudgets: ' + error.toString());
    return { success: false, message: error.toString(), budgets: [] };
  }
}

// ============================================
// API - ESTADÍSTICAS FINANCIERAS
// ============================================

function getFinancialStats(period = 'month') {
  try {
    const allData = getAllData();
    if (!allData.success) {
      return { success: false, message: 'Error al obtener datos' };
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let weeklyData = {};
    let monthlyData = {};
    
    allData.orders.forEach(order => {
      if (!order.cobroManoObra || isNaN(order.cobroManoObra)) return;
      
      const monto = Number(order.cobroManoObra);
      const fecha = new Date(order.marcaTemporal);
      
      // Estadísticas semanales
      const weekKey = order.week || getWeekNumber(fecha);
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { week: weekKey, total: 0, count: 0 };
      }
      weeklyData[weekKey].total += monto;
      weeklyData[weekKey].count++;
      
      // Estadísticas mensuales
      const monthKey = order.mes || fecha.toLocaleString('es', { month: 'long', year: 'numeric' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0, count: 0 };
      }
      monthlyData[monthKey].total += monto;
      monthlyData[monthKey].count++;
    });
    
    return {
      success: true,
      weekly: Object.values(weeklyData).sort((a, b) => a.week - b.week),
      monthly: Object.values(monthlyData),
      totalGanancia: allData.stats.totalGanancia
    };
    
  } catch (error) {
    Logger.log('Error en getFinancialStats: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// API - ÓRDENES DE TRABAJO
// ============================================

function createWorkOrder(orderData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const otNumber = generateNextOTNumber();
    
    const newRow = Array(19).fill(''); // 19 columnas (A-S)
    
    newRow[CONFIG.COLUMNS.MARCA_TEMPORAL] = getCurrentDateTime();
    newRow[CONFIG.COLUMNS.PATENTE] = orderData.patente || '';
    newRow[CONFIG.COLUMNS.VEHICULO] = orderData.vehiculo || '';
    newRow[CONFIG.COLUMNS.IMAGENES] = orderData.imagenes || '';
    newRow[CONFIG.COLUMNS.KILOMETRAJE] = orderData.kilometraje || '';
    newRow[CONFIG.COLUMNS.NOMBRE_CLIENTE] = orderData.nombreCliente || '';
    newRow[CONFIG.COLUMNS.PATENTE_CLIENTE] = orderData.patente || '';
    newRow[CONFIG.COLUMNS.TERCERIZADOS] = orderData.tercerizados || '';
    newRow[CONFIG.COLUMNS.ANOMALIA_1] = orderData.anomalia1 || '';
    newRow[CONFIG.COLUMNS.ANOMALIA_2] = orderData.anomalia2 || '';
    newRow[CONFIG.COLUMNS.ANOMALIA_3] = orderData.anomalia3 || '';
    newRow[CONFIG.COLUMNS.ANOMALIA_4] = orderData.anomalia4 || '';
    newRow[CONFIG.COLUMNS.ORDEN_TRABAJO] = otNumber;
    newRow[CONFIG.COLUMNS.MES] = new Date().toLocaleString('es', { month: 'long', year: 'numeric' });
    newRow[CONFIG.COLUMNS.WEEK] = getWeekNumber(new Date());
    newRow[CONFIG.COLUMNS.PDF_HOJA_TRABAJO] = '';
    newRow[CONFIG.COLUMNS.COBRO_MANO_OBRA] = orderData.cobroManoObra || 0;
    newRow[CONFIG.COLUMNS.FECHA_FINALIZADO] = '';
    newRow[CONFIG.COLUMNS.ESTADO] = 'En Trabajo';
    
    sheet.appendRow(newRow);
    clearCache();
    
    return {
      success: true,
      message: 'Orden de trabajo creada correctamente',
      otNumber: otNumber
    };
    
  } catch (error) {
    Logger.log('Error en createWorkOrder: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function updateWorkOrder(otNumber, updateData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][CONFIG.COLUMNS.ORDEN_TRABAJO] === otNumber) {
        rowIndex = i + 1; // +1 porque getRange es 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'Orden de trabajo no encontrada' };
    }
    
    // Actualizar campos específicos
    if (updateData.estado !== undefined) {
      sheet.getRange(rowIndex, CONFIG.COLUMNS.ESTADO + 1).setValue(updateData.estado);
    }
    if (updateData.cobroManoObra !== undefined) {
      sheet.getRange(rowIndex, CONFIG.COLUMNS.COBRO_MANO_OBRA + 1).setValue(updateData.cobroManoObra);
    }
    if (updateData.fechaFinalizado !== undefined) {
      sheet.getRange(rowIndex, CONFIG.COLUMNS.FECHA_FINALIZADO + 1).setValue(updateData.fechaFinalizado);
    }
    if (updateData.pdfHojaTrabajo !== undefined) {
      sheet.getRange(rowIndex, CONFIG.COLUMNS.PDF_HOJA_TRABAJO + 1).setValue(updateData.pdfHojaTrabajo);
    }
    
    clearCache();
    
    return {
      success: true,
      message: 'Orden de trabajo actualizada correctamente'
    };
    
  } catch (error) {
    Logger.log('Error en updateWorkOrder: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getWorkOrderByNumber(otNumber) {
  try {
    const allData = getAllData();
    if (!allData.success) {
      return { success: false, message: 'Error al obtener datos' };
    }
    
    const order = allData.orders.find(o => o.ordenTrabajo === otNumber);
    
    if (!order) {
      return { success: false, message: 'Orden de trabajo no encontrada' };
    }
    
    return { success: true, order: order };
    
  } catch (error) {
    Logger.log('Error en getWorkOrderByNumber: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ============================================
// SISTEMA DE BORRADORES
// ============================================

function saveDraft(draftData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Fecha', 'Datos', 'Tipo']);
    }
    
    const draftId = `DRAFT-${new Date().getTime()}`;
    
    sheet.appendRow([
      draftId,
      getCurrentDateTime(),
      JSON.stringify(draftData),
      draftData.tipo || 'orden'
    ]);
    
    return {
      success: true,
      message: 'Borrador guardado correctamente',
      draftId: draftId
    };
    
  } catch (error) {
    Logger.log('Error en saveDraft: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

function getDrafts() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, drafts: [] };
    }
    
    const drafts = [];
    
    for (let i = 1; i < data.length; i++) {
      drafts.push({
        id: data[i][0],
        fecha: data[i][1],
        datos: JSON.parse(data[i][2] || '{}'),
        tipo: data[i][3]
      });
    }
    
    return { success: true, drafts: drafts };
    
  } catch (error) {
    Logger.log('Error en getDrafts: ' + error.toString());
    return { success: false, message: error.toString(), drafts: [] };
  }
}

function deleteDraft(draftId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === draftId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Borrador eliminado correctamente' };
      }
    }
    
    return { success: false, message: 'Borrador no encontrado' };
    
  } catch (error) {
    Logger.log('Error en deleteDraft: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

// ============================================
// TESTING & DEBUGGING
// ============================================

function testConnection() {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    
    return {
      success: true,
      message: 'Conexión exitosa',
      spreadsheetName: ss.getName(),
      sheetName: sheet.getName(),
      rows: sheet.getLastRow(),
      columns: sheet.getLastColumn()
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}
