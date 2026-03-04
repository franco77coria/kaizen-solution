/**
 * ===================================================
 * TALLER MUÑOZ - SISTEMA DE GESTIÓN COMPLETO
 * Google Apps Script Backend
 * @author Franco Coria
 * @version 2.0.0
 * ===================================================
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
  PDF_FOLDER_ID: '1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3',
  CACHE_DURATION: 300,
  OT_PREFIX: 'OT-46038-'
};

// ============================================
// WEB APP - ENTRY POINTS
// ============================================

function doGet(e) {
  try {
    // Intentar cargar desde archivo index.html
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Taller Muñoz - Sistema de Gestión')
      .setFaviconUrl('https://img.icons8.com/fluency/48/wrench.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    // Si no existe index.html, mostrar mensaje de error útil
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Taller Muñoz - Configuración</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              background: #1a1a2e;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: #242444;
              border: 1px solid #3d3d66;
              border-radius: 12px;
              padding: 40px;
              max-width: 600px;
              text-align: center;
            }
            h1 {
              color: #5b3f86;
              margin-bottom: 20px;
            }
            .error {
              background: rgba(220, 53, 69, 0.1);
              border: 1px solid #dc3545;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .steps {
              text-align: left;
              background: #2d2d55;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .steps ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .steps li {
              margin: 10px 0;
              line-height: 1.6;
            }
            code {
              background: #1a1a2e;
              padding: 2px 6px;
              border-radius: 4px;
              color: #ffc107;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚙️ Configuración Requerida</h1>
            <div class="error">
              <strong>❌ Error:</strong> No se encontró el archivo <code>index.html</code>
            </div>
            <div class="steps">
              <h3>📋 Pasos para solucionar:</h3>
              <ol>
                <li>En el editor de Apps Script, haz clic en el <strong>+</strong> junto a "Archivos"</li>
                <li>Selecciona <strong>HTML</strong></li>
                <li>Nómbralo <code>index</code> (sin extensión)</li>
                <li>Copia y pega el contenido de tu archivo <code>index.html</code> local</li>
                <li>Guarda y vuelve a desplegar</li>
              </ol>
            </div>
            <p style="color: #b0b0c0; margin-top: 20px;">
              Backend funcionando correctamente ✅<br>
              Solo falta agregar el archivo HTML
            </p>
          </div>
        </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(html)
      .setTitle('Taller Muñoz - Configuración')
      .setFaviconUrl('https://img.icons8.com/fluency/48/wrench.png');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// UTILIDADES GENERALES
// ============================================

function getSpreadsheet() {
  // Usar el spreadsheet activo (el que contiene este script)
  return SpreadsheetApp.getActiveSpreadsheet();
  
  // Si necesitas usar un spreadsheet diferente, descomenta esta línea:
  // return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada`);
  }
  return sheet;
}

function generateNextOTNumber() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    let maxNumber = 0;
    for (let i = 1; i < data.length; i++) {
      const otNumber = data[i][1];
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

function formatCurrency(amount) {
  return '$' + Number(amount).toLocaleString('es-AR');
}

function getCurrentDate() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy');
}

function getCurrentDateTime() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
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
// FUNCIONES AUXILIARES PARA FRONTEND
// ============================================

function extractVehicles(orders) {
  const vehicleMap = new Map();
  
  orders.forEach(order => {
    const patente = order.patente || '';
    if (!patente) return;
    
    if (!vehicleMap.has(patente)) {
      vehicleMap.set(patente, {
        patente: patente,
        vehiculo: order.vehiculo || '',
        cliente: order.cliente || '',
        serviciosCount: 1,
        ultimoServicio: order.timestamp || ''
      });
    } else {
      const vehicle = vehicleMap.get(patente);
      vehicle.serviciosCount++;
      vehicleMap.set(patente, vehicle);
    }
  });
  
  return Array.from(vehicleMap.values());
}

function calculateStats(orders) {
  const completados = orders.filter(o => o.estado === 'Finalizado').length;
  const pendientes = orders.filter(o => o.estado === 'Trabajando' || o.estado === 'Pendiente').length;
  const totalManoObra = orders.reduce((sum, o) => sum + (parseFloat(o.manoObra) || 0), 0);
  
  return {
    totalTrabajos: orders.length,
    completados: completados,
    pendientes: pendientes,
    totalManoObra: totalManoObra,
    promedioTicket: completados > 0 ? totalManoObra / completados : 0
  };
}

// ============================================
// API PRINCIPAL - GET ALL DATA
// ============================================

// ============================================
// API - ÓRDENES DE TRABAJO
// ============================================

function createWorkOrder(data) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const otNumber = generateNextOTNumber();
    const timestamp = getCurrentDateTime();
    
    // Estructura del CSV:
    // Marca temporal, Patente, Vehiculo, Imagenes, Kilometraje, Nombre del cliente,
    // Patente auto cliente, Tercerizados, Anomalia del cliente, Anomalia del cliente 2,
    // Anomalia del cliente 3, Anomalia del cliente 4, Orden de trabajo, Mes, WEEK,
    // PDF hoja de trabajo, Cobro mano de obra, Fecha finalizado, Estado, fecha, Semana
    
    const now = new Date();
    const mes = now.toLocaleString('es-AR', { month: 'long' }).toUpperCase();
    const week = getWeekNumber(now);
    const fecha = Utilities.formatDate(now, 'America/Argentina/Buenos_Aires', 'yyMMdd');
    
    // Crear referencia combinada patente-vehiculo-cliente
    const patenteAutoCliente = `${data.patente || ''} | ${data.marca || ''} | ${data.cliente || ''}`.toUpperCase();
    
    const row = [
      timestamp,                    // 0: Marca temporal
      data.patente || '',          // 1: Patente
      data.marca || '',            // 2: Vehiculo
      '',                          // 3: Imagenes
      data.kilometraje || '',      // 4: Kilometraje
      data.cliente || '',          // 5: Nombre del cliente
      patenteAutoCliente,          // 6: Patente auto cliente
      '',                          // 7: Tercerizados
      data.anomaliaCliente || '',  // 8: Anomalia del cliente
      '',                          // 9: Anomalia del cliente 2
      '',                          // 10: Anomalia del cliente 3
      '',                          // 11: Anomalia del cliente 4
      otNumber,                    // 12: Orden de trabajo
      mes,                         // 13: Mes
      week,                        // 14: WEEK
      '',                          // 15: PDF hoja de trabajo
      0,                           // 16: Cobro mano de obra
      '',                          // 17: Fecha finalizado
      data.estado || 'Trabajando', // 18: Estado
      fecha,                       // 19: fecha
      week                         // 20: Semana
    ];
    
    sheet.appendRow(row);
    clearCache();
    
    return {
      success: true,
      otNumber: otNumber,
      message: 'Orden de trabajo creada exitosamente'
    };
    
  } catch (error) {
    Logger.log('Error creando OT: ' + error);
    return { success: false, error: error.toString() };
  }
}

function getWorkOrders(filters) {
  filters = filters || {};
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    
    if (sheet.getLastRow() < 2) {
      return { success: true, count: 0, data: [] };
    }

    const data = sheet.getDataRange().getValues();
    const workOrders = [];
    
    // Columnas del CSV:
    // 0: Marca temporal
    // 1: Patente
    // 2: Vehiculo
    // 3: Imagenes
    // 4: Kilometraje
    // 5: Nombre del cliente
    // 6: Patente auto cliente
    // 7: Tercerizados
    // 8: Anomalia del cliente
    // 9: Anomalia del cliente 2
    // 10: Anomalia del cliente 3
    // 11: Anomalia del cliente 4
    // 12: Orden de trabajo
    // 13: Mes
    // 14: WEEK
    // 15: PDF hoja de trabajo
    // 16: Cobro mano de obra
    // 17: Fecha finalizado
    // 18: Estado
    // 19: fecha
    // 20: Semana
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Combinar todas las anomalías
      const anomalias = [
        row[8] || '',
        row[9] || '',
        row[10] || '',
        row[11] || ''
      ].filter(a => a && a.toString().trim() !== '').join(', ');
      
      // Limpiar mano de obra (remover $ y convertir a número)
      let manoObra = 0;
      if (row[16]) {
        const manoObraStr = row[16].toString().replace(/[$.,]/g, '');
        manoObra = parseInt(manoObraStr) || 0;
      }
      
      const order = {
        timestamp: row[0],
        patente: row[1] ? row[1].toString().trim() : '',
        vehiculo: row[2] || '',
        imagenes: row[3] || '',
        kilometraje: row[4] || 0,
        cliente: row[5] ? row[5].toString().trim() : '',
        patenteAutoCliente: row[6] || '',
        tercerizados: row[7] || '',
        anomalia: anomalias,
        otNumber: row[12] || '',
        mes: row[13] || '',
        week: row[14] || '',
        pdfUrl: row[15] ? `https://drive.google.com/file/d/${extractDriveId(row[15])}/view` : null,
        manoObra: manoObra,
        fechaFinalizado: row[17] || '',
        estado: row[18] || 'Pendiente',
        fecha: row[19] || '',
        semana: row[20] || '',
        rowIndex: i + 1
      };
      
      // Aplicar filtros
      if (filters.patente && order.patente.toLowerCase() !== filters.patente.toLowerCase()) continue;
      if (filters.cliente && !order.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) continue;
      if (filters.estado && order.estado !== filters.estado) continue;
      
      workOrders.push(order);
    }
    
    return { success: true, count: workOrders.length, data: workOrders };
    
  } catch (error) {
    Logger.log('Error obteniendo OTs: ' + error);
    return { success: false, error: error.toString(), data: [] };
  }
}

// Función auxiliar para extraer ID de Drive de un nombre de archivo PDF
function extractDriveId(pdfName) {
  // Si ya es una URL, extraer el ID
  if (pdfName && pdfName.toString().includes('drive.google.com')) {
    const match = pdfName.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : pdfName;
  }
  // Si es solo el nombre del archivo, buscar en la carpeta
  try {
    const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    const files = folder.getFilesByName(pdfName);
    if (files.hasNext()) {
      return files.next().getId();
    }
  } catch (e) {
    Logger.log('Error buscando archivo: ' + e);
  }
  return null;
}

function getWorkOrderByNumber(otNumber) {
  try {
    const result = getWorkOrders({});
    if (!result.success) return result;
    
    const order = result.data.find(o => o.otNumber === otNumber);
    
    if (!order) {
      return { success: false, error: 'Orden de trabajo no encontrada' };
    }
    
    return { success: true, data: order };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateWorkOrder(otNumber, data) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const allData = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][1] === otNumber) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Orden de trabajo no encontrada' };
    }
    
    if (data.fechaSalida !== undefined) sheet.getRange(rowIndex, 13).setValue(data.fechaSalida);
    if (data.descargoTaller !== undefined) sheet.getRange(rowIndex, 15).setValue(data.descargoTaller);
    if (data.repuestos !== undefined) sheet.getRange(rowIndex, 16).setValue(JSON.stringify(data.repuestos));
    if (data.manoObra !== undefined) sheet.getRange(rowIndex, 17).setValue(data.manoObra);
    if (data.total !== undefined) sheet.getRange(rowIndex, 18).setValue(data.total);
    if (data.estado !== undefined) sheet.getRange(rowIndex, 19).setValue(data.estado);
    if (data.pdfUrl !== undefined) sheet.getRange(rowIndex, 20).setValue(data.pdfUrl);
    
    clearCache();
    
    return { success: true, message: 'Orden de trabajo actualizada' };
    
  } catch (error) {
    Logger.log('Error actualizando OT: ' + error);
    return { success: false, error: error.toString() };
  }
}

// ============================================
// API - VEHÍCULOS
// ============================================

function getVehicleHistory(patente) {
  try {
    const result = getWorkOrders({ patente: patente });
    
    if (!result.success) return result;
    
    const history = result.data.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    const stats = {
      totalServicios: history.length,
      costoPromedio: history.length > 0 ? 
        history.reduce((sum, h) => sum + (h.total || 0), 0) / history.length : 0,
      ultimoServicio: history.length > 0 ? history[0].fechaEntrada : null,
      kilometrajeActual: history.length > 0 ? history[0].kilometraje : 0
    };
    
    return { success: true, patente: patente, stats: stats, history: history };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function searchVehicles(query) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    
    const vehicles = new Map();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const patente = String(row[3] || '');
      const cliente = String(row[8] || '');
      
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
    
    return { success: true, count: vehicles.size, data: Array.from(vehicles.values()) };
    
  } catch (error) {
    return { success: false, error: error.toString(), data: [] };
  }
}

// ============================================
// API - PRESUPUESTOS
// ============================================

function createBudget(data) {
  try {
    const ss = getSpreadsheet();
    const budgetLogSheet = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);
    
    if (!budgetLogSheet) {
      return { success: false, error: 'Hoja de registro de presupuestos no encontrada' };
    }
    
    const budgetNumber = 'PRES-' + new Date().getTime();
    const timestamp = getCurrentDateTime();
    
    const row = [
      timestamp,
      budgetNumber,
      data.tipo || 'Presupuesto',
      data.patente || '',
      data.marca || '',
      data.modelo || '',
      '',
      '',
      data.cliente || '',
      data.telefono || '',
      data.email || '',
      '',
      '',
      data.descripcion || '',
      '',
      data.repuestos || 0,
      data.manoObra || 0,
      data.total || 0,
      'Pendiente',
      ''
    ];
    
    budgetLogSheet.appendRow(row);
    
    return { success: true, budgetNumber: budgetNumber, message: 'Presupuesto creado correctamente' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getBudgets(options) {
  options = options || {};
  try {
    const ss = getSpreadsheet();
    const budgetLogSheet = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);
    
    if (!budgetLogSheet) {
      return { success: true, data: [], count: 0 };
    }
    
    const data = budgetLogSheet.getDataRange().getValues();
    const budgets = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const budget = {
        timestamp: row[0],
        budgetNumber: row[1],
        tipo: row[2],
        patente: row[3],
        marca: row[4],
        modelo: row[5],
        cliente: row[8],
        telefono: row[9],
        email: row[10],
        descripcion: row[13],
        repuestos: row[15],
        manoObra: row[16],
        total: row[17],
        estado: row[18],
        pdfUrl: row[19]
      };
      budgets.push(budget);
    }
    
    return { success: true, data: budgets, count: budgets.length };
    
  } catch (error) {
    return { success: false, error: error.toString(), data: [], count: 0 };
  }
}

// ============================================
// API - ANÁLISIS FINANCIERO
// ============================================

function getFinancialStats(dateRange) {
  dateRange = dateRange || {};
  try {
    const result = getWorkOrders({});
    if (!result.success) return result;
    
    let orders = result.data;
    
    if (dateRange.from || dateRange.to) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.fechaEntrada);
        if (dateRange.from && orderDate < new Date(dateRange.from)) return false;
        if (dateRange.to && orderDate > new Date(dateRange.to)) return false;
        return true;
      });
    }
    
    const totalIngresos = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalManoObra = orders.reduce((sum, o) => sum + (o.manoObra || 0), 0);
    const totalRepuestos = orders.reduce((sum, o) => {
      const repuestos = o.repuestos || [];
      return sum + (Array.isArray(repuestos) ? repuestos.reduce((s, r) => s + (r.precio || 0), 0) : 0);
    }, 0);
    
    const completados = orders.filter(o => o.estado === 'Completado' || o.estado === 'Finalizado').length;
    const pendientes = orders.filter(o => o.estado === 'Pendiente' || o.estado === 'Trabajando').length;
    
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
    return { success: false, error: error.toString() };
  }
}

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
        weeklyData[weekKey] = { semana: weekKey, ingresos: 0, cantidad: 0 };
      }
      
      weeklyData[weekKey].ingresos += order.total || 0;
      weeklyData[weekKey].cantidad += 1;
    });
    
    const weeks = Object.values(weeklyData).sort((a, b) => a.semana.localeCompare(b.semana));
    
    return { success: true, data: weeks };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// SISTEMA DE BORRADORES
// ============================================

function saveDraft(data) {
  try {
    const ss = getSpreadsheet();
    let draftsSheet = ss.getSheetByName('Borradores');
    
    if (!draftsSheet) {
      draftsSheet = ss.insertSheet('Borradores');
      draftsSheet.appendRow(['ID Borrador', 'Fecha Guardado', 'Patente', 'Marca', 'Modelo', 'Cliente', 'Datos JSON']);
    }
    
    const draftId = data.draftId || 'DRAFT-' + new Date().getTime();
    const timestamp = getCurrentDateTime();
    
    const allData = draftsSheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === draftId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const row = [
      draftId,
      timestamp,
      data.patente || '',
      data.marca || '',
      data.modelo || '',
      data.cliente || '',
      JSON.stringify(data)
    ];
    
    if (rowIndex > 0) {
      draftsSheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      draftsSheet.appendRow(row);
    }
    
    return { success: true, draftId: draftId, message: 'Borrador guardado correctamente' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDrafts() {
  try {
    const ss = getSpreadsheet();
    const draftsSheet = ss.getSheetByName('Borradores');
    
    if (!draftsSheet) {
      return { success: true, data: [] };
    }
    
    const data = draftsSheet.getDataRange().getValues();
    const drafts = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      drafts.push({
        draftId: row[0],
        fechaGuardado: row[1],
        patente: row[2],
        marca: row[3],
        modelo: row[4],
        cliente: row[5],
        data: JSON.parse(row[6])
      });
    }
    
    return { success: true, data: drafts };
    
  } catch (error) {
    return { success: false, error: error.toString(), data: [] };
  }
}

function getDraft(draftId) {
  try {
    const result = getDrafts();
    if (!result.success) return result;
    
    const draft = result.data.find(d => d.draftId === draftId);
    
    if (!draft) {
      return { success: false, error: 'Borrador no encontrado' };
    }
    
    return { success: true, data: draft };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function deleteDraft(draftId) {
  try {
    const ss = getSpreadsheet();
    const draftsSheet = ss.getSheetByName('Borradores');
    
    if (!draftsSheet) {
      return { success: false, error: 'No hay borradores' };
    }
    
    const data = draftsSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === draftId) {
        draftsSheet.deleteRow(i + 1);
        return { success: true, message: 'Borrador eliminado' };
      }
    }
    
    return { success: false, error: 'Borrador no encontrado' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function convertDraftToWorkOrder(draftId) {
  try {
    const draftResult = getDraft(draftId);
    if (!draftResult.success) return draftResult;
    
    const draftData = draftResult.data.data;
    const result = createWorkOrder(draftData);
    
    if (result.success) {
      deleteDraft(draftId);
    }
    
    return result;
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// GENERACIÓN DE PDFs
// ============================================

function generarPDFyGuardarEnBaseDeDatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaTrabajo = ss.getSheetByName(CONFIG.SHEETS.WORK_SHEET);
  var baseDatos = ss.getSheetByName(CONFIG.SHEETS.DATABASE);

  if (!hojaTrabajo || !baseDatos) {
    Logger.log("No se encontró una de las hojas.");
    return { success: false, error: "Hojas no encontradas" };
  }

  Utilities.sleep(500);
  SpreadsheetApp.flush();

  var valores = hojaTrabajo.getRange("K4:K5").getValues(); 
  var nombreArchivo = valores.flat().join(" ").trim();
  var otBuscar = hojaTrabajo.getRange("K11").getValue().toString().trim();

  Logger.log("Nombre archivo: " + nombreArchivo);
  Logger.log("OT a buscar: " + otBuscar);

  if (!nombreArchivo || !otBuscar) {
    return { success: false, error: "Asegurate de haber completado correctamente los datos en K4, K5 y K11." };
  }

  var folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID); 
  var urlPDF = exportarHojaComoPDF(ss.getId(), hojaTrabajo.getSheetId(), nombreArchivo, folder);

  if (!urlPDF) {
    Logger.log("No se pudo generar el PDF.");
    return { success: false, error: "Hubo un problema al generar el PDF." };
  }

  var datosBase = baseDatos.getRange("M:M").getValues();

  for (var i = 0; i < datosBase.length; i++) {
    if (datosBase[i][0].toString().trim() === otBuscar) {
      baseDatos.getRange(i + 1, 16).setValue('=HYPERLINK("' + urlPDF + '"; "' + nombreArchivo + '.pdf")');
      
      var valoresCopiar = hojaTrabajo.getRange("E71:F72").getValues();
      baseDatos.getRange(i + 1, 17, 2, 2).setValues(valoresCopiar);

      var valorK7 = hojaTrabajo.getRange("K7").getValue();
      baseDatos.getRange(i + 1, 18).setValue(valorK7);
      
      clearCache();
      
      return { success: true, message: "Genial, la orden fue cerrada con éxito!", pdfUrl: urlPDF };
    }
  }

  return { success: false, error: "No se encontró la OT " + otBuscar + " en la base de datos." };
}

function generarPDFPresupuestoYRegistrar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaPresupuesto = ss.getSheetByName(CONFIG.SHEETS.BUDGET);
  var hojaRegistro = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);

  if (!hojaPresupuesto || !hojaRegistro) {
    return { success: false, error: "No se encontró la hoja 'Presupuesto' o 'Registro presupuesto'." };
  }

  Utilities.sleep(500);
  SpreadsheetApp.flush();

  var tituloA1 = (hojaPresupuesto.getRange("A1").getDisplayValue() || "").toString().trim();
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  var nombreArchivo = (tituloA1 ? tituloA1 : "Presupuesto_" + timestamp).replace(/[\\/:*?"<>|]/g, "-");

  var folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);

  var urlPDF = exportarHojaComoPDF(ss.getId(), hojaPresupuesto.getSheetId(), nombreArchivo, folder);
  if (!urlPDF) {
    return { success: false, error: "Hubo un problema al generar el PDF." };
  }

  var ahora = new Date();
  var formulaLink = '=HYPERLINK("' + urlPDF + '"; "' + nombreArchivo + '.pdf")';
  hojaRegistro.appendRow([ahora, nombreArchivo, formulaLink]);

  clearCache();

  return { success: true, message: "Presupuesto exportado y registrado con éxito.", pdfUrl: urlPDF };
}

function exportarHojaComoPDF(spreadsheetId, sheetId, nombreArchivo, folder) {
  var url = "https://docs.google.com/spreadsheets/d/" + spreadsheetId + 
            "/export?format=pdf&gid=" + sheetId + 
            "&portrait=true" + 
            "&size=A3" + 
            "&scale=3" + 
            "&fitw=true" + 
            "&top_margin=0.2&bottom_margin=0.2" +
            "&left_margin=0.2&right_margin=0.2" +
            "&horizontal_alignment=CENTER";

  var opciones = {
    muteHttpExceptions: true,
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken()
    }
  };

  try {
    var respuesta = UrlFetchApp.fetch(url, opciones);
    var blob = respuesta.getBlob().setName(nombreArchivo + ".pdf");
    var archivo = folder.createFile(blob);
    return archivo.getUrl();
  } catch (e) {
    Logger.log("Error al exportar PDF: " + e.message);
    return null;
  }
}

function generateWorkOrderPDF(otNumber) {
  try {
    const result = getWorkOrderByNumber(otNumber);
    if (!result.success) {
      return result;
    }

    const order = result.data;
    
    const ss = getSpreadsheet();
    const hojaTrabajo = ss.getSheetByName(CONFIG.SHEETS.WORK_SHEET);
    
    hojaTrabajo.getRange("K4").setValue(order.patente);
    hojaTrabajo.getRange("K5").setValue(order.marca + " " + order.modelo);
    hojaTrabajo.getRange("K11").setValue(order.otNumber);
    hojaTrabajo.getRange("K7").setValue(order.cliente);
    
    return generarPDFyGuardarEnBaseDeDatos();
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generateBudgetPDF(budgetNumber) {
  try {
    return generarPDFPresupuestoYRegistrar();
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// ORDENAMIENTO Y AJUSTE DE BASE DE DATOS
// ============================================

function ordenar() {
  try {
    const hoja = getSheet(CONFIG.SHEETS.DATABASE);
    const ultimaFila = hoja.getLastRow();
    const ultimaColumna = hoja.getLastColumn();

    if (ultimaFila <= 1) {
      Logger.log("⚠️ No hay suficientes filas para ordenar.");
      return { success: false, error: "No hay suficientes filas" };
    }

    const rango = hoja.getRange(2, 1, ultimaFila - 1, ultimaColumna);
    rango.sort({column: 1, ascending: false});
    
    clearCache();
    
    return { success: true, message: "Base de datos ordenada correctamente" };
    
  } catch (error) {
    Logger.log("Error ordenando: " + error);
    return { success: false, error: error.toString() };
  }
}

function ajustarBaseDeDatos() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const expectedHeaders = [
      'Marca temporal', 'Número OT', 'Tipo', 'Patente', 'Marca', 'Modelo',
      'Kilometraje', 'Próximo Service', 'Cliente', 'Teléfono', 'Email',
      'Fecha Entrada', 'Fecha Salida', 'Anomalía Cliente', 'Descargo Taller',
      'Repuestos', 'Mano de Obra', 'Total', 'Estado', 'PDF URL'
    ];
    
    const missingHeaders = [];
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (!headers[i] || headers[i] !== expectedHeaders[i]) {
        missingHeaders.push(expectedHeaders[i]);
      }
    }
    
    if (missingHeaders.length > 0) {
      const lastCol = sheet.getLastColumn();
      for (let i = 0; i < missingHeaders.length; i++) {
        sheet.getRange(1, lastCol + i + 1).setValue(missingHeaders[i]);
      }
      
      return { success: true, message: "Base de datos ajustada. Columnas agregadas: " + missingHeaders.join(", ") };
    }
    
    return { success: true, message: "Base de datos ya está correctamente estructurada" };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// DIAGNÓSTICO Y TEST
// ============================================

function checkSystemStatus() {
  const result = { success: true, checks: [] };
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    result.checks.push({ name: 'Spreadsheet Access', status: 'OK', details: ss.getName() });
  } catch (e) {
    result.checks.push({ name: 'Spreadsheet Access', status: 'ERROR', details: e.toString() });
    result.success = false;
    return result;
  }
  
  const requiredSheets = [CONFIG.SHEETS.DATABASE, CONFIG.SHEETS.WORK_SHEET, CONFIG.SHEETS.BUDGET_LOG];
  
  requiredSheets.forEach(sheetName => {
    try {
      const sheet = getSheet(sheetName);
      result.checks.push({ name: `Sheet: ${sheetName}`, status: 'OK', details: `${sheet.getLastRow()} rows` });
    } catch (e) {
      result.checks.push({ name: `Sheet: ${sheetName}`, status: 'ERROR', details: 'Not found' });
      result.success = false;
    }
  });
  
  return result;
}

function testBackend() {
  Logger.log('=== INICIANDO TESTS ===');
  
  const otNumber = generateNextOTNumber();
  Logger.log('Nuevo número OT: ' + otNumber);
  
  const orders = getWorkOrders({});
  Logger.log('Total órdenes: ' + orders.count);
  
  const stats = getFinancialStats({});
  Logger.log('Estadísticas: ' + JSON.stringify(stats.stats));
  
  const ajuste = ajustarBaseDeDatos();
  Logger.log('Ajuste BD: ' + JSON.stringify(ajuste));
  
  Logger.log('=== TESTS COMPLETADOS ===');
}

// ============================================
// FUNCIÓN UNIFICADA - CARGAR TODOS LOS DATOS
// ============================================

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

// ============================================
// MENÚ PERSONALIZADO
// ============================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔧 Taller Muñoz')
    .addItem('📄 Generar PDF Orden de Trabajo', 'menuGenerarPDFOrden')
    .addItem('📋 Generar PDF Presupuesto', 'menuGenerarPDFPresupuesto')
    .addSeparator()
    .addItem('🔄 Ordenar Base de Datos', 'ordenar')
    .addItem('🛠️ Ajustar Estructura BD', 'ajustarBaseDeDatos')
    .addItem('🗑️ Limpiar Cache', 'clearCache')
    .addSeparator()
    .addItem('🩺 Diagnóstico del Sistema', 'menuDiagnostico')
    .addItem('🧪 Ejecutar Tests', 'testBackend')
    .addSeparator()
    .addItem('🌐 Abrir Web App', 'abrirWebApp')
    .addToUi();
}

function menuGenerarPDFOrden() {
  const result = generarPDFyGuardarEnBaseDeDatos();
  const ui = SpreadsheetApp.getUi();
  
  if (result.success) {
    ui.alert('✅ Éxito', result.message + '\n\nURL: ' + result.pdfUrl, ui.ButtonSet.OK);
  } else {
    ui.alert('❌ Error', result.error, ui.ButtonSet.OK);
  }
}

function menuGenerarPDFPresupuesto() {
  const result = generarPDFPresupuestoYRegistrar();
  const ui = SpreadsheetApp.getUi();
  
  if (result.success) {
    ui.alert('✅ Éxito', result.message + '\n\nURL: ' + result.pdfUrl, ui.ButtonSet.OK);
  } else {
    ui.alert('❌ Error', result.error, ui.ButtonSet.OK);
  }
}

function menuDiagnostico() {
  const result = checkSystemStatus();
  const ui = SpreadsheetApp.getUi();
  
  let message = 'Estado del Sistema:\n\n';
  result.checks.forEach(check => {
    const icon = check.status === 'OK' ? '✅' : '❌';
    message += `${icon} ${check.name}: ${check.details}\n`;
  });
  
  ui.alert(result.success ? '✅ Sistema OK' : '⚠️ Problemas Detectados', message, ui.ButtonSet.OK);
}

function abrirWebApp() {
  const url = ScriptApp.getService().getUrl();
  const html = '<script>window.open("' + url + '");google.script.host.close();</script>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setHeight(1).setWidth(1),
    'Abriendo...'
  );
}
