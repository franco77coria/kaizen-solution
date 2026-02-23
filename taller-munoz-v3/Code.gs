/**
 * ============================================
 * TALLER MUÑOZ - SISTEMA DE GESTIÓN MECÁNICA
 * Google Apps Script Backend v5.0
 * @author Franco Coria
 * @date 2026-02-08
 * ============================================
 */

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
  COLUMNS: {
    MARCA_TEMPORAL: 0, PATENTE: 1, VEHICULO: 2, IMAGENES: 3,
    KILOMETRAJE: 4, NOMBRE_CLIENTE: 5, PATENTE_CLIENTE: 6,
    TERCERIZADOS: 7, ANOMALIA_1: 8, ANOMALIA_2: 9,
    ANOMALIA_3: 10, ANOMALIA_4: 11, ORDEN_TRABAJO: 12,
    MES: 13, WEEK: 14, PDF_HOJA_TRABAJO: 15,
    COBRO_MANO_OBRA: 16, FECHA_FINALIZADO: 17, ESTADO: 18, COSTO_REPUESTOS: 19,
    CHECK_GENERAL: 20
  }
};

// ============================================
// ENTRY POINT
// ============================================
function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Taller Muñoz - Sistema de Gestión')
      .setFaviconUrl('https://img.icons8.com/fluency/48/car-service.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput('<h1>Error</h1><p>' + error.toString() + '</p>');
  }
}

// ============================================
// UTILIDADES
// ============================================
function getSpreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === CONFIG.SHEETS.BUDGETS) sheet.appendRow(['Fecha','Cliente','Vehículo','Patente','Items','Subtotal','Mano de Obra','Total','Estado','PDF']);
    else if (name === CONFIG.SHEETS.DRAFTS) sheet.appendRow(['ID','Fecha','Datos','Tipo']);
  }
  return sheet;
}

function getCurrentDateTime() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
}

function parseMoney(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).replace(/[^\d.,-]/g, '');
  if (str.includes(',') && !str.includes('.')) str = str.replace(',', '.');
  else if (str.includes('.') && str.includes(',')) {
    if (str.indexOf(',') > str.indexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 1 && parts[parts.length-1].length === 3) str = str.replace(/\./g, '');
  }
  return parseFloat(str) || 0;
}

function isRowEmpty(row) { return !row || !row.some(c => c && String(c).trim() !== ''); }

function findColumnIndex(headers, ...names) {
  for (const n of names) {
    const idx = headers.findIndex(h => h && String(h).trim().toLowerCase() === n.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const n of names) {
    const idx = headers.findIndex(h => h && String(h).toLowerCase().includes(n.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function safeDate(val) {
  if (!val) return '';
  // Fix: instanceof Date puede fallar en GAS; usar duck typing
  if (val instanceof Date || (typeof val === 'object' && typeof val.getTime === 'function')) {
    try { return val.toISOString(); } catch(e) { return String(val); }
  }
  return String(val);
}

function generateNextOTNumber() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return CONFIG.OT_PREFIX + '0001';
    const data = sheet.getRange(2, CONFIG.COLUMNS.ORDEN_TRABAJO + 1, lastRow - 1, 1).getValues();
    let max = 0;
    data.forEach(r => {
      if (r[0] && typeof r[0] === 'string') {
        const m = r[0].match(/OT-\d+-(\d+)/);
        if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
      }
    });
    return CONFIG.OT_PREFIX + String(max + 1).padStart(4, '0');
  } catch (e) { return CONFIG.OT_PREFIX + '0001'; }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// CACHE - FIX: No cache si data > 100KB
// ============================================
function clearCache() {
  try {
    CacheService.getScriptCache().removeAll(['allData','stats','vehicles','pdf_library']);
    return { success: true };
  } catch(e) { return { success: false }; }
}

// ============================================
// API PRINCIPAL - getAllData
// FIX: NO usar cache para datos grandes (causa null)
// ============================================
function getAllData() {
  try {
    // #region agent log - DEBUG: log sheet names and connection
    const ss = getSpreadsheet();
    const sheetNames = ss.getSheets().map(s => s.getName());
    Logger.log('DEBUG_H1: Available sheets: ' + JSON.stringify(sheetNames));
    Logger.log('DEBUG_H1: Looking for sheet: "' + CONFIG.SHEETS.DATABASE + '"');
    // #endregion

    const sheet = getSheet(CONFIG.SHEETS.DATABASE);

    // #region agent log - DEBUG: sheet found check
    Logger.log('DEBUG_H2: Sheet found: ' + sheet.getName() + ', lastRow: ' + sheet.getLastRow());
    // #endregion

    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      // #region agent log
      Logger.log('DEBUG_H2: Sheet empty or header-only, returning empty data');
      // #endregion
      return { success: true, orders: [], stats: { total: 0, enTrabajo: 0, finalizados: 0, pendientes: 0, totalGanancia: 0 }, vehicles: [],
        _debug: { sheets: sheetNames, sheetUsed: sheet.getName(), lastRow: lastRow, hint: 'Sheet empty or header-only' }
      };
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];

    // #region agent log - DEBUG: log headers found and data dimensions
    Logger.log('DEBUG_H3: Headers found: ' + JSON.stringify(headers));
    Logger.log('DEBUG_H3: Data dimensions: rows=' + allData.length + ', cols=' + (allData[0] ? allData[0].length : 0));
    // Check for non-string values in first data row
    if (allData.length > 1) {
      const sampleRow = allData[1];
      const types = sampleRow.map((v, i) => i + ':' + typeof v + (v instanceof Date ? '(Date)' : '') + (v === null ? '(null)' : ''));
      Logger.log('DEBUG_H3: Row 1 value types: ' + types.join(', '));
    }
    // #endregion
    
    const col = {
      fecha: findColumnIndex(headers, 'Marca temporal'),
      patente: findColumnIndex(headers, 'Patente'),
      vehiculo: findColumnIndex(headers, 'Vehiculo', 'Vehículo'),
      imagenes: findColumnIndex(headers, 'Imagenes'),
      km: findColumnIndex(headers, 'Kilometraje'),
      cliente: findColumnIndex(headers, 'Nombre del cliente', 'Nombre Cliente'),
      patenteCliente: findColumnIndex(headers, 'Patente auto cliente'),
      tercerizados: findColumnIndex(headers, 'Tercerizados'),
      a1: findColumnIndex(headers, 'Anomalia del cliente', 'Anomalía 1'),
      a2: findColumnIndex(headers, 'Anomalia del cliente 2', 'Anomalía 2'),
      a3: findColumnIndex(headers, 'Anomalia del cliente 3'),
      a4: findColumnIndex(headers, 'Anomalia del cliente 4'),
      ot: findColumnIndex(headers, 'Orden de trabajo'),
      mes: findColumnIndex(headers, 'Mes'),
      week: findColumnIndex(headers, 'WEEK'),
      pdf: findColumnIndex(headers, 'PDF hoja de trabajo'),
      cobro: findColumnIndex(headers, 'Cobro mano de obra'),
      fechaFin: findColumnIndex(headers, 'Fecha finalizado'),
      estado: findColumnIndex(headers, 'Estado'),
      costoRepuestos: findColumnIndex(headers, 'Cobro repuesto', 'Costo repuestos', 'Cobro Repuesto'),
      checkGeneral: findColumnIndex(headers, 'Check general')
    };
    
    const orders = [];
    const vehiclesMap = new Map();
    let totalGanancia = 0, enTrabajo = 0, finalizados = 0, pendientes = 0, totalCostoRepuestos = 0;
    
    // Autos por dia (últimos 30 días)
    const autosPorDia = {};
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (isRowEmpty(row)) continue;
      
      const patente = col.patente !== -1 ? String(row[col.patente] || '').trim() : '';
      const cliente = col.cliente !== -1 ? String(row[col.cliente] || '').trim() : '';
      if (!patente && !cliente) continue;
      
      const cobro = col.cobro !== -1 ? parseMoney(row[col.cobro]) : 0;
      const costoRepuesto = col.costoRepuestos !== -1 ? parseMoney(row[col.costoRepuestos]) : 0;
      const estado = col.estado !== -1 ? String(row[col.estado] || '').trim() : '';
      const estadoLower = estado.toLowerCase();
      const fecha = col.fecha !== -1 ? row[col.fecha] : '';
      
      const order = {
        id: i + 1,
        marcaTemporal: safeDate(fecha),
        patente: patente,
        vehiculo: col.vehiculo !== -1 ? String(row[col.vehiculo] || '').trim() : '',
        kilometraje: col.km !== -1 ? String(row[col.km] || '') : '',
        nombreCliente: cliente,
        patenteCliente: col.patenteCliente !== -1 ? String(row[col.patenteCliente] || '').trim() : '',
        tercerizados: col.tercerizados !== -1 ? String(row[col.tercerizados] || '') : '',
        anomalia1: col.a1 !== -1 ? String(row[col.a1] || '') : '',
        anomalia2: col.a2 !== -1 ? String(row[col.a2] || '') : '',
        anomalia3: col.a3 !== -1 ? String(row[col.a3] || '') : '',
        anomalia4: col.a4 !== -1 ? String(row[col.a4] || '') : '',
        ordenTrabajo: col.ot !== -1 ? String(row[col.ot] || '') : '',
        mes: col.mes !== -1 ? String(row[col.mes] || '') : '',
        pdfHojaTrabajo: col.pdf !== -1 ? String(row[col.pdf] || '') : '',
        cobroManoObra: cobro,
        costoRepuestos: costoRepuesto,
        checkGeneral: col.checkGeneral !== -1 ? String(row[col.checkGeneral] || '') : '',
        fechaFinalizado: col.fechaFin !== -1 ? safeDate(row[col.fechaFin]) : '',
        estado: estado || 'Pendiente'
      };
      
      orders.push(order);
      
      // Stats
      if (estadoLower === 'trabajando' || estadoLower.includes('trabajo')) enTrabajo++;
      else if (estadoLower === 'finalizado' || estadoLower === 'entregado') finalizados++;
      else pendientes++;
      
      if (cobro && !isNaN(cobro)) totalGanancia += cobro;
      if (costoRepuesto && !isNaN(costoRepuesto)) totalCostoRepuestos += costoRepuesto;
      
      // Autos por día (últimos 30 días)
      if (fecha) {
        const d = fecha instanceof Date ? fecha : new Date(fecha);
        if (!isNaN(d.getTime()) && d >= hace30) {
          const dayKey = d.toISOString().substring(0, 10);
          autosPorDia[dayKey] = (autosPorDia[dayKey] || 0) + 1;
        }
      }
      
      // Vehicle grouping
      const plateKey = patente || order.patenteCliente;
      if (plateKey) {
        if (!vehiclesMap.has(plateKey.toUpperCase())) {
          vehiclesMap.set(plateKey.toUpperCase(), {
            patente: plateKey, vehiculo: order.vehiculo, cliente: cliente,
            totalServicios: 0, ultimoServicio: order.marcaTemporal
          });
        }
        const v = vehiclesMap.get(plateKey.toUpperCase());
        v.totalServicios++;
        if (order.marcaTemporal > v.ultimoServicio) v.ultimoServicio = order.marcaTemporal;
      }
    }
    
    // Promedio autos por día
    const diasConDatos = Object.keys(autosPorDia).length || 1;
    const totalAutosUlt30 = Object.values(autosPorDia).reduce((s,v) => s+v, 0);
    const promedioPorDia = Math.round((totalAutosUlt30 / diasConDatos) * 10) / 10;
    
    // Top clientes
    const clienteCount = {};
    orders.forEach(o => {
      if (o.nombreCliente) {
        const c = o.nombreCliente.toLowerCase().trim();
        clienteCount[c] = (clienteCount[c] || 0) + 1;
      }
    });
    const topClientes = Object.entries(clienteCount)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));
    
    const result = {
      success: true,
      orders: orders,
      stats: {
        total: orders.length,
        enTrabajo: enTrabajo,
        finalizados: finalizados,
        pendientes: pendientes,
        totalGanancia: totalGanancia,
        totalCostoRepuestos: totalCostoRepuestos,
        promedioPorDia: promedioPorDia,
        vehiculosUnicos: vehiclesMap.size,
        topClientes: topClientes,
        autosPorDia: autosPorDia
      },
      vehicles: Array.from(vehiclesMap.values())
    };

    // #region agent log - DEBUG: payload size and serialization check
    try {
      const jsonStr = JSON.stringify(result);
      const payloadSize = jsonStr.length;
      Logger.log('DEBUG_H4_FIX: Payload size = ' + payloadSize + ' bytes (' + Math.round(payloadSize/1024) + ' KB), orders=' + orders.length + ', vehicles=' + result.vehicles.length);
      // If payload > 1MB, log a sample of a problematic order
      if (payloadSize > 500000) {
        Logger.log('DEBUG_H4_WARN: Payload large! Sample order[0]: ' + JSON.stringify(orders[0]).length + ' bytes');
        Logger.log('DEBUG_H4_WARN: Sample order[0] data: ' + JSON.stringify(orders[0]));
      }
    } catch(serErr) {
      Logger.log('DEBUG_H4_ERR: JSON.stringify FAILED: ' + serErr.toString());
    }
    // #endregion

    return result;
    
  } catch (error) {
    // #region agent log - DEBUG: capture full error
    Logger.log('DEBUG_H5: Error en getAllData: ' + error.toString() + ' | Stack: ' + (error.stack || 'N/A'));
    // #endregion
    return {
      success: false,
      error: error.toString(),
      _debugStack: error.stack || 'N/A',
      orders: [],
      stats: { total: 0, enTrabajo: 0, finalizados: 0, pendientes: 0, totalGanancia: 0, promedioPorDia: 0, vehiculosUnicos: 0, topClientes: [], autosPorDia: {} },
      vehicles: []
    };
  }
}

// ============================================
// VEHÍCULOS
// ============================================
function searchVehicles(query) {
  try {
    if (!query) return { success: true, vehicles: [] };
    query = query.toString().toLowerCase().trim();
    
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colP = findColumnIndex(headers, 'Patente');
    const colC = findColumnIndex(headers, 'Nombre del cliente', 'Nombre Cliente');
    const colV = findColumnIndex(headers, 'Vehiculo', 'Vehículo');
    const colF = findColumnIndex(headers, 'Marca temporal');
    
    if (colP === -1) return { success: false, message: 'No se encontró columna Patente', vehicles: [] };
    
    const map = new Map();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;
      const p = String(row[colP] || '').trim();
      const c = colC !== -1 ? String(row[colC] || '').trim() : '';
      const v = colV !== -1 ? String(row[colV] || '').trim() : '';
      if (!p) continue;
      if (!p.toLowerCase().includes(query) && !c.toLowerCase().includes(query) && !v.toLowerCase().includes(query)) continue;
      
      const key = p.toUpperCase();
      if (!map.has(key)) {
        map.set(key, { patente: p, vehiculo: v, cliente: c, serviciosCount: 1, ultimoServicio: safeDate(colF !== -1 ? row[colF] : '') });
      } else {
        const x = map.get(key);
        x.serviciosCount++;
        const f = safeDate(colF !== -1 ? row[colF] : '');
        if (f && f > x.ultimoServicio) x.ultimoServicio = f;
      }
    }
    
    return { success: true, vehicles: Array.from(map.values()), count: map.size };
  } catch (error) {
    return { success: false, message: error.toString(), vehicles: [] };
  }
}

function getVehicleHistory(patente) {
  try {
    if (!patente) return { success: false, message: 'Debe especificar una patente' };
    
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const col = {
      patente: findColumnIndex(headers, 'Patente'),
      patenteC: findColumnIndex(headers, 'Patente auto cliente'),
      vehiculo: findColumnIndex(headers, 'Vehiculo', 'Vehículo'),
      cliente: findColumnIndex(headers, 'Nombre del cliente', 'Nombre Cliente'),
      fecha: findColumnIndex(headers, 'Marca temporal'),
      km: findColumnIndex(headers, 'Kilometraje'),
      a1: findColumnIndex(headers, 'Anomalia del cliente'),
      a2: findColumnIndex(headers, 'Anomalia del cliente 2'),
      a3: findColumnIndex(headers, 'Anomalia del cliente 3'),
      a4: findColumnIndex(headers, 'Anomalia del cliente 4'),
      ot: findColumnIndex(headers, 'Orden de trabajo'),
      estado: findColumnIndex(headers, 'Estado'),
      cobro: findColumnIndex(headers, 'Cobro mano de obra'),
      pdf: findColumnIndex(headers, 'PDF hoja de trabajo'),
      tercerizados: findColumnIndex(headers, 'Tercerizados'),
      costoRepuestos: findColumnIndex(headers, 'Cobro repuesto', 'Costo repuestos', 'Cobro Repuesto')
    };
    
    const history = [];
    let vehiculo = '', cliente = '';
    const pLower = patente.toLowerCase();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;
      
      const rP = col.patente !== -1 ? String(row[col.patente] || '').trim().toLowerCase() : '';
      const rPC = col.patenteC !== -1 ? String(row[col.patenteC] || '').trim().toLowerCase() : '';
      
      if (rP !== pLower && !rPC.includes(pLower)) continue;
      
      if (!vehiculo && col.vehiculo !== -1) vehiculo = String(row[col.vehiculo] || '');
      if (!cliente && col.cliente !== -1) cliente = String(row[col.cliente] || '');
      
      history.push({
        ordenTrabajo: col.ot !== -1 ? row[col.ot] : '',
        marcaTemporal: safeDate(col.fecha !== -1 ? row[col.fecha] : ''),
        kilometraje: col.km !== -1 ? row[col.km] : '',
        anomalia1: col.a1 !== -1 ? (row[col.a1] || '') : '',
        anomalia2: col.a2 !== -1 ? (row[col.a2] || '') : '',
        anomalia3: col.a3 !== -1 ? (row[col.a3] || '') : '',
        anomalia4: col.a4 !== -1 ? (row[col.a4] || '') : '',
        anomalias: [col.a1 !== -1 ? row[col.a1] : '', col.a2 !== -1 ? row[col.a2] : '', col.a3 !== -1 ? row[col.a3] : '', col.a4 !== -1 ? row[col.a4] : ''].filter(a => a && String(a).trim()).join(', '),
        estado: col.estado !== -1 ? row[col.estado] : '',
        cobroManoObra: col.cobro !== -1 ? row[col.cobro] : 0,
        costoRepuestos: col.costoRepuestos !== -1 ? row[col.costoRepuestos] : 0,
        pdfUrl: col.pdf !== -1 ? row[col.pdf] : '',
        tercerizados: col.tercerizados !== -1 ? (row[col.tercerizados] || '') : ''
      });
    }
    
    if (history.length === 0) return { success: false, message: 'No se encontró historial para: ' + patente };
    
    history.sort((a, b) => {
      const dA = a.marcaTemporal ? new Date(a.marcaTemporal) : new Date(0);
      const dB = b.marcaTemporal ? new Date(b.marcaTemporal) : new Date(0);
      return dB - dA;
    });
    
    const stats = {
      totalServicios: history.length,
      costoTotal: history.reduce((s, h) => s + parseMoney(h.cobroManoObra), 0),
      costoPromedio: 0,
      kilometrajeActual: history[0].kilometraje || 0
    };
    stats.costoPromedio = stats.totalServicios > 0 ? stats.costoTotal / stats.totalServicios : 0;
    
    return { success: true, patente, vehiculo, cliente, stats, history };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getVehicleListForAutocomplete(query) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colP = findColumnIndex(headers, 'Patente');
    const colC = findColumnIndex(headers, 'Nombre del cliente', 'Nombre Cliente');
    const colV = findColumnIndex(headers, 'Vehiculo', 'Vehículo');
    
    const suggestions = [], seen = new Set();
    query = query ? query.toString().toLowerCase().trim() : '';
    
    for (let i = 1; i < data.length && suggestions.length < 15; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;
      const p = colP !== -1 ? String(row[colP] || '').trim() : '';
      if (!p) continue;
      const key = p.toUpperCase();
      if (seen.has(key)) continue;
      const c = colC !== -1 ? String(row[colC] || '').trim() : '';
      const v = colV !== -1 ? String(row[colV] || '').trim() : '';
      if (!query || p.toLowerCase().includes(query) || c.toLowerCase().includes(query) || v.toLowerCase().includes(query)) {
        seen.add(key);
        suggestions.push({ patente: key, cliente: c, vehiculo: v, label: p + ' - ' + c + ' (' + v + ')', value: p });
      }
    }
    return { success: true, suggestions };
  } catch (e) { return { success: false, suggestions: [] }; }
}

// ============================================
// ESTADÍSTICAS
// ============================================
function getFinancialStats(filters) {
  try {
    filters = filters || {};
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const colF = findColumnIndex(headers, 'Marca temporal');
    const colE = findColumnIndex(headers, 'Estado');
    const colCo = findColumnIndex(headers, 'Cobro mano de obra');
    const colCl = findColumnIndex(headers, 'Nombre del cliente', 'Nombre Cliente');
    const colV = findColumnIndex(headers, 'Vehiculo', 'Vehículo');
    const colP = findColumnIndex(headers, 'Patente');
    
    let orders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;
      const order = {};
      headers.forEach((h, idx) => { const v = row[idx]; order[h] = v instanceof Date ? v.toISOString() : v; });
      if (colF !== -1 && !order[headers[colF]] && colP !== -1 && !order[headers[colP]]) continue;
      orders.push(order);
    }
    
    let filtered = orders;
    
    if (filters.from || filters.to) {
      const fh = colF !== -1 ? headers[colF] : null;
      if (fh) filtered = filtered.filter(o => {
        const d = new Date(o[fh]); if (isNaN(d.getTime())) return true;
        if (filters.from && d < new Date(filters.from)) return false;
        if (filters.to) { const nt = new Date(filters.to); nt.setDate(nt.getDate()+1); if (d >= nt) return false; }
        return true;
      });
    }
    
    if (filters.estado && filters.estado !== 'todos') {
      const eh = colE !== -1 ? headers[colE] : null;
      if (eh) filtered = filtered.filter(o => String(o[eh] || '').trim().toLowerCase() === filters.estado.toLowerCase());
    }
    
    if (filters.cliente) {
      const ch = colCl !== -1 ? headers[colCl] : null;
      if (ch) { const cl = filters.cliente.toLowerCase(); filtered = filtered.filter(o => String(o[ch] || '').toLowerCase().includes(cl)); }
    }
    
    if (filters.vehiculo) {
      const vh = colV !== -1 ? headers[colV] : null;
      const ph = colP !== -1 ? headers[colP] : null;
      const vl = filters.vehiculo.toLowerCase();
      filtered = filtered.filter(o => (vh && String(o[vh]||'').toLowerCase().includes(vl)) || (ph && String(o[ph]||'').toLowerCase().includes(vl)));
    }
    
    const ch = colCo !== -1 ? headers[colCo] : null;
    const eh = colE !== -1 ? headers[colE] : null;
    const totalIngresos = filtered.reduce((s,o) => s + parseMoney(ch ? o[ch] : 0), 0);
    let completados = 0, enTrabajo = 0, pendientes = 0;
    filtered.forEach(o => {
      const e = eh ? String(o[eh]||'').trim().toLowerCase() : '';
      if (e === 'finalizado' || e === 'entregado') completados++;
      else if (e === 'trabajando' || e.includes('trabajo')) enTrabajo++;
      else pendientes++;
    });
    
    return {
      success: true,
      stats: { totalTrabajos: filtered.length, totalIngresos, promedioTicket: filtered.length > 0 ? totalIngresos / filtered.length : 0, completados, enTrabajo, pendientes },
      data: filtered,
      unfilteredCount: orders.length
    };
  } catch (error) {
    return { success: false, message: error.toString(), stats: { totalTrabajos:0, totalIngresos:0, promedioTicket:0, completados:0, enTrabajo:0, pendientes:0 }, data: [], unfilteredCount:0 };
  }
}

// ============================================
// ÓRDENES DE TRABAJO
// ============================================
function getOpenWorkOrders() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return { success: true, orders: [], count: 0 };
    const headers = data[0];
    
    const openOrders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;
      
      const order = {};
      headers.forEach((header, index) => {
        const val = row[index];
        const safe = val instanceof Date ? val.toISOString() : val;
        order[header] = safe;
        const h = String(header).trim().toLowerCase();
        if (h.includes('orden de trabajo')) order.ordenTrabajo = safe;
        else if (h.includes('marca temporal')) order.marcaTemporal = safe;
        else if (h.includes('nombre') && h.includes('cliente')) order.nombreCliente = safe;
        else if (h === 'vehiculo' || h === 'vehículo') order.vehiculo = safe;
        else if (h === 'patente') order.patente = safe;
        else if (h === 'estado') order.estado = safe;
        else if (h.includes('kilometraje')) order.kilometraje = safe;
        else if (h.includes('cobro')) order.cobroManoObra = parseMoney(safe);
        else if (h.includes('anomalia') || h.includes('anomalía')) {
          if (h.includes('2')) order.anomalia2 = safe;
          else if (h.includes('3')) order.anomalia3 = safe;
          else if (h.includes('4')) order.anomalia4 = safe;
          else order.anomalia1 = safe;
        }
        else if (h.includes('tercerizados')) order.tercerizados = safe;
        else if (h.includes('patente auto') || h.includes('patente cliente')) order.patenteCliente = safe;
        else if (h.includes('patente auto') || h.includes('patente cliente')) order.patenteCliente = safe;
        else if (h.includes('pdf')) order.pdfHojaTrabajo = safe;
        else if (h.includes('check general')) order.checkGeneral = safe;
      });
      
      if (!order.ordenTrabajo && !order.patente && !order.nombreCliente) continue;
      const estado = String(order.estado || '').trim().toLowerCase();
      if (estado === 'finalizado' || estado === 'entregado') continue;
      if (estado === '') continue;
      
      order.rowIndex = i + 1;
      openOrders.push(order);
    }
    
    openOrders.sort((a, b) => {
      const sA = String(a.estado || '').toLowerCase();
      const sB = String(b.estado || '').toLowerCase();
      const wA = sA.includes('trabajo'); const wB = sB.includes('trabajo');
      if (wA && !wB) return -1; if (!wA && wB) return 1;
      return new Date(b.marcaTemporal || 0).getTime() - new Date(a.marcaTemporal || 0).getTime();
    });
    
    return { success: true, orders: openOrders, count: openOrders.length };
  } catch (error) {
    return { success: false, message: error.toString(), orders: [] };
  }
}

function createWorkOrder(orderData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const otNumber = generateNextOTNumber();
    const newRow = Array(21).fill('');
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
    newRow[CONFIG.COLUMNS.COBRO_MANO_OBRA] = orderData.cobroManoObra || 0;
    newRow[CONFIG.COLUMNS.ESTADO] = 'Trabajando';
    sheet.appendRow(newRow);
    clearCache();
    return { success: true, message: 'Orden creada', otNumber };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateWorkOrder(otNumber, updates) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const otCol = findColumnIndex(headers, 'Orden de trabajo');
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (otCol !== -1 && data[i][otCol] === otNumber) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return { success: false, message: 'Orden no encontrada: ' + otNumber };
    
    const fieldMap = {
      'estado': 'Estado', 'cobroManoObra': 'Cobro mano de obra',
      'tercerizados': 'Tercerizados', 'comentariosTaller': 'Tercerizados',
      'fechaFinalizado': 'Fecha finalizado', 'pdfHojaTrabajo': 'PDF hoja de trabajo',
      'costoRepuestos': 'Cobro repuesto', 'checkGeneral': 'Check general'
    };
    
    Object.keys(updates).forEach(field => {
      const header = fieldMap[field] || field;
      let ci = headers.findIndex(h => String(h).trim().toLowerCase() === header.toLowerCase());
      if (ci === -1) ci = headers.findIndex(h => String(h).toLowerCase().includes(header.toLowerCase()));
      if (ci !== -1) sheet.getRange(rowIndex, ci + 1).setValue(updates[field]);
    });
    
    const estado = updates['estado'] || updates['Estado'];
    if (estado && estado.toLowerCase() === 'finalizado') {
      const fc = findColumnIndex(headers, 'Fecha finalizado');
      if (fc !== -1) sheet.getRange(rowIndex, fc + 1).setValue(getCurrentDateTime());
    }
    
    clearCache();
    return { success: true, message: 'Orden actualizada' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getWorkOrderData(otNumber) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DATABASE);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const otCol = findColumnIndex(headers, 'Orden de trabajo');
    for (let i = 1; i < data.length; i++) {
      if (otCol !== -1 && data[i][otCol] === otNumber) {
        const orderData = {};
        headers.forEach((h, idx) => { orderData[h] = data[i][idx]; });
        orderData.rowIndex = i + 1;
        return { success: true, order: orderData };
      }
    }
    return { success: false, message: 'Orden no encontrada' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function getWorkOrderByNumber(otNumber) {
  try {
    const r = getAllData();
    if (!r.success) return { success: false, message: 'Error al obtener datos' };
    const order = r.orders.find(o => o.ordenTrabajo === otNumber);
    return order ? { success: true, order } : { success: false, message: 'Orden no encontrada' };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function completeWorkOrder(otNumber, comentariosTaller, cobroManoObra, valorRepuestos, checkGeneral) {
  try {
    const updates = {
      'estado': 'Finalizado',
      'comentariosTaller': comentariosTaller || '',
      'cobroManoObra': cobroManoObra || 0
    };
    if (valorRepuestos) updates['valorRepuestos'] = valorRepuestos;
    if (checkGeneral) updates['checkGeneral'] = checkGeneral;
    
    const ur = updateWorkOrder(otNumber, updates);
    if (!ur.success) return ur;
    
    let pdfResult = { success: false };
    try { pdfResult = generateWorkOrderPDF(otNumber); } catch(e) {}
    
    return { success: true, message: 'Orden finalizada', pdfGenerated: pdfResult.success, pdfUrl: pdfResult.pdfUrl || null };
  } catch (error) { return { success: false, message: error.toString() }; }
}

// ============================================
// PRESUPUESTOS
// ============================================
function createBudget(budgetData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BUDGETS);
    const num = 'PRES-' + new Date().getTime();
    let items = '';
    if (Array.isArray(budgetData.items)) items = JSON.stringify(budgetData.items);
    else items = budgetData.items || '';
    
    sheet.appendRow([getCurrentDateTime(), budgetData.cliente||'', budgetData.vehiculo||'', budgetData.patente||'', items, budgetData.subtotal||0, budgetData.manoObra||0, budgetData.total||0, 'Pendiente', '']);
    clearCache();
    return { success: true, message: 'Presupuesto creado', budgetNumber: num };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function getBudgets() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.BUDGETS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, budgets: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const budgets = data.map((r, i) => ({
      id: i+2, fecha: r[0], cliente: r[1], vehiculo: r[2], patente: r[3],
      items: r[4], subtotal: r[5], manoObra: r[6], total: r[7], estado: r[8], pdf: r[9]
    }));
    return { success: true, budgets };
  } catch (error) { return { success: false, message: error.toString(), budgets: [] }; }
}

// ============================================
// BORRADORES
// ============================================
function saveDraft(draftData) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    const id = 'DRAFT-' + new Date().getTime();
    sheet.appendRow([id, getCurrentDateTime(), JSON.stringify(draftData), draftData.tipo || 'orden']);
    return { success: true, message: 'Borrador guardado', draftId: id };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function getDrafts() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, drafts: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    const drafts = [];
    data.forEach(r => { try { drafts.push({ id: r[0], fecha: r[1], datos: JSON.parse(r[2]||'{}'), tipo: r[3] }); } catch(e){} });
    return { success: true, drafts };
  } catch (e) { return { success: false, drafts: [] }; }
}

function deleteDraft(draftId) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.DRAFTS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === draftId) { sheet.deleteRow(i + 1); return { success: true }; }
    }
    return { success: false, message: 'No encontrado' };
  } catch (e) { return { success: false, message: e.toString() }; }
}

// ============================================
// PDFs
// ============================================
function getPDFLibrary(limit) {
  try {
    limit = limit || 50;
    if (!CONFIG.PDF_FOLDER_ID) return { success: false, message: 'PDF_FOLDER_ID no configurado', pdfs: [] };
    const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    const files = folder.getFiles();
    const pdfs = [];
    let count = 0;
    while (files.hasNext() && count < limit) {
      const file = files.next();
      if (file.getMimeType() === 'application/pdf') {
        pdfs.push({ id: file.getId(), name: file.getName(), url: file.getUrl(), downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(), dateCreated: file.getDateCreated().toISOString(), size: file.getSize(), type: file.getName().toLowerCase().includes('ot-') ? 'Orden' : file.getName().toLowerCase().includes('pres') ? 'Presupuesto' : 'Documento' });
        count++;
      }
    }
    pdfs.sort((a,b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    return { success: true, pdfs, count: pdfs.length };
  } catch (error) { return { success: false, message: error.toString(), pdfs: [] }; }
}

function searchPDFs(query) {
  try {
    const lib = getPDFLibrary();
    if (!lib.success) return lib;
    const q = query.toLowerCase().trim();
    return { success: true, pdfs: lib.pdfs.filter(p => p.name.toLowerCase().includes(q)), count: 0 };
  } catch (e) { return { success: false, pdfs: [] }; }
}

function exportarHojaComoPDF(ssId, sheetId, nombre, folder) {
  try {
    const url = "https://docs.google.com/spreadsheets/d/" + ssId + "/export?format=pdf&gid=" + sheetId + "&portrait=true&size=A3&scale=3&fitw=true&top_margin=0.2&bottom_margin=0.2&left_margin=0.2&right_margin=0.2";
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() } });
    return folder.createFile(r.getBlob().setName(nombre + ".pdf")).getUrl();
  } catch (e) { return null; }
}

/* ============================================
   PDF SYSTEM - UPDATED
   ============================================ */
function getLogoBase64() {
  const id = "1Yf2XFVVNGqONy-kjxRYSQnWgtaYXlVHf";
  
  // 1. Intento directo con DriveApp (si el script corre como propietario)
  try {
    const file = DriveApp.getFileById(id);
    const blob = file.getBlob();
    return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
  } catch (e) {}

  // 2. Intentos vía URL pública (varios endpoints)
  const urls = [
    "https://drive.google.com/uc?export=view&id=" + id,
    "https://lh3.googleusercontent.com/d/" + id, // Enlace directo a contenido
    "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000" // Thumbnail de alta calidad
  ];

  for (let i = 0; i < urls.length; i++) {
    try {
      const r = UrlFetchApp.fetch(urls[i], { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) {
         const type = r.getBlob().getContentType();
         if (type.indexOf("image") !== -1) {
             return "data:" + type + ";base64," + Utilities.base64Encode(r.getBlob().getBytes());
         }
      }
    } catch(e) {}
  }

  // 3. FALLBACK FINAL: Generar Logo SVG Vectorial (Nunca falla)
  // Un diseño simple estilo racing para que siempre haya un logo visible.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">' +
    '<style>.t{font-family:sans-serif;font-weight:900;font-style:italic}</style>' +
    '<text x="10" y="70" class="t" font-size="60" fill="#d32f2f" letter-spacing="-2">MUNOZ</text>' +
    '<text x="210" y="70" class="t" font-size="60" fill="#000" letter-spacing="-2">Competicion</text>' +
    '<path d="M10,80 L380,80" stroke="black" stroke-width="4" stroke-dasharray="20,10"/>' + 
    '<path d="M10,80 L180,80" stroke="#d32f2f" stroke-width="4"/>' +
    '</svg>';
    
  return "data:image/svg+xml;base64," + Utilities.base64Encode(Utilities.newBlob(svg).getBytes());
}

function buildPdfData(type, id, inputData) {
  const logo = getLogoBase64();
  const fmt = n => parseMoney(n).toLocaleString('es-AR', {minimumFractionDigits: 0});
  
  if (type === 'orden') {
    const od = getWorkOrderData(id);
    if (!od.success) throw new Error(od.message || 'Error datos orden');
    const order = od.order;
    const checkParts = (order['Check general'] || '').split('|');
    const checkedItems = checkParts[0].split(',').map(s => s.trim()).filter(s => s);
    const checkComment = checkParts.length > 1 ? checkParts.slice(1).join('|').trim() : '';

    return {
      logo: logo, type: 'orden',
      tipo: 'ORDEN DE TRABAJO',
      numero: id,
      fecha: order['Marca temporal'] ? new Date(order['Marca temporal']).toLocaleDateString('es-AR') : '-',
      cliente: order['Nombre del cliente'] || '',
      patenteCliente: order['Patente auto cliente'] || '',
      vehiculo: order['Vehículo'] || order['Vehiculo'] || '',
      patente: order['Patente'] || '',
      kilometraje: order['Kilometraje'] || '',
      checkItems: ['Tren delantero', 'Tren trasero', 'Neumáticos', 'Luces', 'Aceite', 'Filtro de aire', 'Filtro de nafta', 'Filtro de aceite', 'Filtro habitáculo', 'Grasas y aditivos', 'Frenos', 'Suspensión', 'Embrague', 'Escape', 'Batería'],
      checkedItems: checkedItems,
      checkComment: checkComment,
      anomalias: [order['Anomalia del cliente'], order['Anomalia del cliente 2'], order['Anomalia del cliente 3'], order['Anomalia del cliente 4']].filter(a => a).join('<br>'),
      tercerizados: (order['Tercerizados'] || '').replace(/\n/g, '<br>'),
      manoObra: fmt(order['Cobro mano de obra'] || 0),
      costoRepuestos: fmt(order['Cobro repuesto'] || 0),
      total: fmt((parseMoney(order['Cobro mano de obra']||0) + parseMoney(order['Cobro repuesto']||0)))
    };
  } else if (type === 'presupuesto') {
    const budgetData = inputData;
    const ts = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyyMMdd_HHmmss");
    const num = budgetData.id || ('PRES-'+ts);
    let itemsDesc = '';
    try { 
        const items = typeof budgetData.items === 'string' ? JSON.parse(budgetData.items) : budgetData.items; 
        if (Array.isArray(items)) itemsDesc = items.map(i => '- ' + i.descripcion + ' ($' + i.precio + ')').join('<br>'); // precio was mapped in index.html to precio
    } catch(e) { itemsDesc = budgetData.items || ''; }

    return {
      logo: logo, type: 'presupuesto',
      tipo: 'PRESUPUESTO',
      numero: num,
      fecha: new Date().toLocaleDateString('es-AR'),
      cliente: budgetData.cliente || '',
      patenteCliente: '',
      vehiculo: budgetData.vehiculo || '',
      patente: budgetData.patente || '',
      kilometraje: '',
      checkItems: [], checkedItems: [], checkComment: '',
      anomalias: '',
      tercerizados: itemsDesc,
      manoObra: fmt(budgetData.manoObra||0),
      costoRepuestos: fmt(budgetData.subtotal||0),
      total: fmt(budgetData.total||0)
    };
  }
}

function renderPdfHtml(data) {
  const html = HtmlService.createTemplateFromFile('pdf_template');
  html.data = data;
  return html.evaluate().getContent();
}

function getPreviewHtml(type, id, inputData) {
  try {
    const data = buildPdfData(type, id, inputData);
    return { success: true, html: renderPdfHtml(data) };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function generatePdfFromHtmlContent(content, filename) {
    if (!CONFIG.PDF_FOLDER_ID) throw new Error('PDF_FOLDER_ID faltante');
    const folder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    const blob = Utilities.newBlob(content, 'text/html', filename + '.html');
    const pdf = folder.createFile(blob.getAs('application/pdf').setName(filename + '.pdf'));
    return pdf.getUrl();
}

function generateWorkOrderPDF(otNumber) {
  try {
    const data = buildPdfData('orden', otNumber);
    const html = renderPdfHtml(data);
    const url = generatePdfFromHtmlContent(html, otNumber);
    updateWorkOrder(otNumber, { 'pdfHojaTrabajo': url });
    return { success: true, pdfUrl: url };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function generateBudgetPDF(budgetData) {
  try {
    const data = buildPdfData('presupuesto', null, budgetData);
    const html = renderPdfHtml(data);
    const ts = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', "yyyyMMdd_HHmmss");
    const url = generatePdfFromHtmlContent(html, 'Presupuesto_' + (budgetData.cliente||'').replace(/\s/g,'_') + '_' + ts);
    return { success: true, pdfUrl: url };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function previewWorkOrderPDF(otNumber) { return generateWorkOrderPDF(otNumber); }

function testConnection() {
  try {
    const ss = getSpreadsheet(); const sh = getSheet(CONFIG.SHEETS.DATABASE);
    return { success: true, rows: sh.getLastRow(), columns: sh.getLastColumn(), timestamp: getCurrentDateTime() };
  } catch (e) { return { success: false, message: e.toString() }; }
}
