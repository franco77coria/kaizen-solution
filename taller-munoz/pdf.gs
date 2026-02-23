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
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
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
    if (!sheet) {
      return { success: false, error: "No se encontró la hoja: " + CONFIG.SHEETS.DATABASE };
    }
    
    // Validar que hay datos
    if (sheet.getLastRow() < 2) {
       return { success: true, count: 0, data: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    Logger.log('Headers found: ' + JSON.stringify(headers));
    
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

// (API - PRESUPUESTOS Removed - Using separate Budget Management section)


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
        const patente = String(row[3] || '');
        const cliente = String(row[8] || '');
      
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
// SISTEMA DE BORRADORES
// ============================================

/**
 * Guarda un borrador de orden de trabajo
 */
function saveDraft(data) {
  try {
    const ss = getSpreadsheet();
    let draftsSheet = ss.getSheetByName('Borradores');
    
    // Crear hoja de borradores si no existe
    if (!draftsSheet) {
      draftsSheet = ss.insertSheet('Borradores');
      draftsSheet.appendRow([
        'ID Borrador', 'Fecha Guardado', 'Patente', 'Marca', 'Modelo', 
        'Cliente', 'Datos JSON'
      ]);
    }
    
    const draftId = data.draftId || 'DRAFT-' + new Date().getTime();
    const timestamp = getCurrentDateTime();
    
    // Buscar si ya existe el borrador
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
      // Actualizar borrador existente
      draftsSheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      // Crear nuevo borrador
      draftsSheet.appendRow(row);
    }
    
    return {
      success: true,
      draftId: draftId,
      message: 'Borrador guardado correctamente'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene todos los borradores
 */
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
    
    return {
      success: true,
      data: drafts
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

/**
 * Obtiene un borrador específico
 */
function getDraft(draftId) {
  try {
    const result = getDrafts();
    if (!result.success) return result;
    
    const draft = result.data.find(d => d.draftId === draftId);
    
    if (!draft) {
      return {
        success: false,
        error: 'Borrador no encontrado'
      };
    }
    
    return {
      success: true,
      data: draft
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Elimina un borrador
 */
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
        return {
          success: true,
          message: 'Borrador eliminado'
        };
      }
    }
    
    return {
      success: false,
      error: 'Borrador no encontrado'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Convierte un borrador en orden de trabajo final
 */
function convertDraftToWorkOrder(draftId) {
  try {
    const draftResult = getDraft(draftId);
    if (!draftResult.success) return draftResult;
    
    const draftData = draftResult.data.data;
    
    // Crear la orden de trabajo
    const result = createWorkOrder(draftData);
    
    if (result.success) {
      // Eliminar el borrador
      deleteDraft(draftId);
    }
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
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
// GENERACIÓN DE PDFs
// ============================================

/**
 * Genera PDF de una orden de trabajo y lo guarda en Drive
 * Integrado con el sistema existente
 */
function generarPDFyGuardarEnBaseDeDatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaTrabajo = ss.getSheetByName(CONFIG.SHEETS.WORK_SHEET);
  var baseDatos = ss.getSheetByName(CONFIG.SHEETS.DATABASE);

  if (!hojaTrabajo || !baseDatos) {
    Logger.log("No se encontró una de las hojas.");
    return { success: false, error: "Hojas no encontradas" };
  }

  // Esperar y forzar actualización
  Utilities.sleep(500);
  SpreadsheetApp.flush();

  var valores = hojaTrabajo.getRange("K4:K5").getValues(); 
  var nombreArchivo = valores.flat().join(" ").trim();
  var otBuscar = hojaTrabajo.getRange("K11").getValue().toString().trim();

  Logger.log("Nombre archivo: " + nombreArchivo);
  Logger.log("OT a buscar: " + otBuscar);

  if (!nombreArchivo || !otBuscar) {
    return { 
      success: false, 
      error: "Asegurate de haber completado correctamente los datos en K4, K5 y K11." 
    };
  }

  var folder = DriveApp.getFolderById("1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3"); 
  var urlPDF = exportarHojaComoPDF(ss.getId(), hojaTrabajo.getSheetId(), nombreArchivo, folder);

  if (!urlPDF) {
    Logger.log("No se pudo generar el PDF.");
    return { success: false, error: "Hubo un problema al generar el PDF." };
  }

  var datosBase = baseDatos.getRange("M:M").getValues();

  for (var i = 0; i < datosBase.length; i++) {
    if (datosBase[i][0].toString().trim() === otBuscar) {
      // Columna P: Link al PDF
      baseDatos.getRange(i + 1, 16).setValue('=HYPERLINK("' + urlPDF + '"; "' + nombreArchivo + '.pdf")');
      
      // Columnas Q y R: Copiar valores de E71:F72
      var valoresCopiar = hojaTrabajo.getRange("E71:F72").getValues();
      baseDatos.getRange(i + 1, 17, 2, 2).setValues(valoresCopiar);

      // Columna S: Copiar valor de K7
      var valorK7 = hojaTrabajo.getRange("K7").getValue();
      baseDatos.getRange(i + 1, 18).setValue(valorK7);
      
      clearCache();
      
      return { 
        success: true, 
        message: "Genial, la orden fue cerrada con éxito!",
        pdfUrl: urlPDF
      };
    }
  }

  return { 
    success: false, 
    error: "No se encontró la OT " + otBuscar + " en la base de datos." 
  };
}

/**
 * Genera PDF de un presupuesto y lo registra
 */
function generarPDFPresupuestoYRegistrar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaPresupuesto = ss.getSheetByName(CONFIG.SHEETS.BUDGET);
  var hojaRegistro = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);

  if (!hojaPresupuesto || !hojaRegistro) {
    return { 
      success: false, 
      error: "No se encontró la hoja 'Presupuesto' o 'Registro presupuesto'." 
    };
  }

  Utilities.sleep(500);
  SpreadsheetApp.flush();

  var tituloA1 = (hojaPresupuesto.getRange("A1").getDisplayValue() || "").toString().trim();
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  var nombreArchivo = (tituloA1 ? tituloA1 : "Presupuesto_" + timestamp).replace(/[\\/:*?"<>|]/g, "-");

  var folder = DriveApp.getFolderById("1O5t5ed5oKIepkFlFOdVsxXopiQGmMBj3");

  var urlPDF = exportarHojaComoPDF(ss.getId(), hojaPresupuesto.getSheetId(), nombreArchivo, folder);
  if (!urlPDF) {
    return { success: false, error: "Hubo un problema al generar el PDF." };
  }

  var ahora = new Date();
  var formulaLink = '=HYPERLINK("' + urlPDF + '"; "' + nombreArchivo + '.pdf")';
  hojaRegistro.appendRow([ahora, nombreArchivo, formulaLink]);

  clearCache();

  return { 
    success: true, 
    message: "Presupuesto exportado y registrado con éxito.",
    pdfUrl: urlPDF
  };
}

/**
 * Exporta una hoja como PDF
 */
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

/**
 * Genera PDF desde la app web (nuevo método integrado)
 */
function generateWorkOrderPDF(otNumber) {
  try {
    // Primero obtener los datos de la OT
    const result = getWorkOrderByNumber(otNumber);
    if (!result.success) {
      return result;
    }

    const order = result.data;
    
    // Actualizar la hoja de trabajo con los datos de la OT
    const ss = getSpreadsheet();
    const hojaTrabajo = ss.getSheetByName(CONFIG.SHEETS.WORK_SHEET);
    
    // Llenar los campos necesarios para el PDF
    hojaTrabajo.getRange("K4").setValue(order.patente);
    hojaTrabajo.getRange("K5").setValue(order.marca + " " + order.modelo);
    hojaTrabajo.getRange("K11").setValue(order.otNumber);
    hojaTrabajo.getRange("K7").setValue(order.cliente);
    
    // Generar el PDF
    return generarPDFyGuardarEnBaseDeDatos();
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Genera PDF de presupuesto desde la app web
 */
function generateBudgetPDF(budgetNumber) {
  try {
    const result = getBudgets({});
    if (!result.success) return result;
    
    const budget = result.data.find(b => b.budgetNumber === budgetNumber);
    if (!budget) {
      return {
        success: false,
        error: 'Presupuesto no encontrado'
      };
    }

    return generarPDFPresupuestoYRegistrar();
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// ORDENAMIENTO DE BASE DE DATOS
// ============================================

/**
 * Ordena la base de datos por fecha (más reciente primero)
 */
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
    rango.sort({column: 1, ascending: false}); // Más reciente primero
    
    clearCache();
    
    return { success: true, message: "Base de datos ordenada correctamente" };
    
  } catch (error) {
    Logger.log("Error ordenando: " + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Ajusta la estructura de la base de datos si es necesario
 */
function ajustarBaseDeDatos() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Headers esperados
    const expectedHeaders = [
      'Marca temporal',
      'Número OT',
      'Tipo',
      'Patente',
      'Marca',
      'Modelo',
      'Kilometraje',
      'Próximo Service',
      'Cliente',
      'Teléfono',
      'Email',
      'Fecha Entrada',
      'Fecha Salida',
      'Anomalía Cliente',
      'Descargo Taller',
      'Repuestos',
      'Mano de Obra',
      'Total',
      'Estado',
      'PDF URL'
    ];
    
    // Verificar si faltan columnas
    const missingHeaders = [];
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (!headers[i] || headers[i] !== expectedHeaders[i]) {
        missingHeaders.push(expectedHeaders[i]);
      }
    }
    
    if (missingHeaders.length > 0) {
      // Agregar headers faltantes
      const lastCol = sheet.getLastColumn();
      for (let i = 0; i < missingHeaders.length; i++) {
        sheet.getRange(1, lastCol + i + 1).setValue(missingHeaders[i]);
      }
      
      return {
        success: true,
        message: "Base de datos ajustada. Columnas agregadas: " + missingHeaders.join(", ")
      };
    }
    
    return {
      success: true,
      message: "Base de datos ya está correctamente estructurada"
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// DIAGNÓSTICO
// ============================================

function checkSystemStatus() {
  const result = {
    success: true,
    checks: []
  };
  
  // 1. Check Spreadsheet Access
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    result.checks.push({ name: 'Spreadsheet Access', status: 'OK', details: ss.getName() });
  } catch (e) {
    result.checks.push({ name: 'Spreadsheet Access', status: 'ERROR', details: e.toString() });
    result.success = false;
    return result;
  }
  
  // 2. Check Sheets Existence
  const requiredSheets = [
    CONFIG.SHEETS.DATABASE,
    CONFIG.SHEETS.WORK_SHEET,
    CONFIG.SHEETS.BUDGET_LOG
  ];
  
  requiredSheets.forEach(sheetName => {
    const sheet = getSheet(sheetName);
    if (sheet) {
      result.checks.push({ 
        name: `Sheet: ${sheetName}`, 
        status: 'OK', 
        details: `${sheet.getLastRow()} rows` 
      });
    } else {
      result.checks.push({ 
        name: `Sheet: ${sheetName}`, 
        status: 'ERROR', 
        details: 'Not found' 
      });
      result.success = false;
    }
  });
  
  return result;
}

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
  
  // Test 4: Verificar estructura de base de datos
  const ajuste = ajustarBaseDeDatos();
  Logger.log('Ajuste BD: ' + JSON.stringify(ajuste));
  
  Logger.log('=== TESTS COMPLETADOS ===');
}

// ============================================
// BUDGET MANAGEMENT
// ============================================

/**
 * Crea un nuevo presupuesto
 */
function createBudget(data) {
  try {
    const ss = getSpreadsheet();
    const budgetLogSheet = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);
    
    if (!budgetLogSheet) {
      return {
        success: false,
        error: 'Hoja de registro de presupuestos no encontrada'
      };
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
      '',  // Kilometraje
      '',  // Próximo Service
      data.cliente || '',
      data.telefono || '',
      data.email || '',
      '',  // Fecha Entrada
      '',  // Fecha Salida
      data.descripcion || '',
      '',  // Descargo Taller
      data.repuestos || 0,
      data.manoObra || 0,
      data.total || 0,
      'Pendiente',
      ''   // PDF URL
    ];
    
    budgetLogSheet.appendRow(row);
    
    return {
      success: true,
      budgetNumber: budgetNumber,
      message: 'Presupuesto creado correctamente'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene todos los presupuestos
 */
function getBudgets(options = {}) {
  try {
    const ss = getSpreadsheet();
    const budgetLogSheet = ss.getSheetByName(CONFIG.SHEETS.BUDGET_LOG);
    
    if (!budgetLogSheet) {
      return {
        success: true,
        data: [],
        count: 0
      };
    }
    
    const data = budgetLogSheet.getDataRange().getValues();
    const headers = data[0];
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
    
    return {
      success: true,
      data: budgets,
      count: budgets.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: [],
      count: 0
    };
  }
}

/**
 * Genera PDF de presupuesto
 */
function generateBudgetPDF(budgetNumber) {
  try {
    // Similar a generateWorkOrderPDF pero para presupuestos
    return generarPDFPresupuestoYRegistrar();
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}
