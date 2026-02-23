/**
 * Dashboard Político - Cambio Radical Colombia
 * Google Apps Script Backend - OPTIMIZADO
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  // ID provided by user: https://docs.google.com/spreadsheets/d/1Sjceg62Q97-Bo8Y51biCBJeglTVvou3fO005GvhUfxY/edit
  SHEET_ID: '1Sjceg62Q97-Bo8Y51biCBJeglTVvou3fO005GvhUfxY', 
  SHEET_NAME: 'ENCUESTA',
  PROVINCIA_SHEET_NAME: 'PROVINCIA',
  DATOS_SHEET_NAME: 'DATOS',
  CACHE_DURATION: 300,
  // Segunda fuente de datos (Base dash)
  SHEET2_ID: '1fI81Mol5Rc8yoNdOnKWUIbJ9fd4iGodF4QOaCZRjEWY',
  SHEET2_NAME: 'Base dash',
  // Authentication
  ADMINS_SHEET_NAME: 'ADMINISTRADORES',
  SUPER_ADMIN: '1133985163f@gmail.com'
};


/**
 * Lee la hoja DATOS y retorna un mapa de municipio -> provincia
 * Columna A = Municipio, Columna B = Provincia
 */
function getProvinciaMap() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.DATOS_SHEET_NAME);
    
    if (!sheet) {
      console.warn('Hoja DATOS no encontrada');
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    const provinciaMap = {};
    
    // Columna A = Municipio, Columna B = Provincia
    for (let i = 1; i < data.length; i++) {
      const municipio = String(data[i][0] || '').trim().toUpperCase();
      const provincia = String(data[i][1] || '').trim().toUpperCase();
      
      if (municipio && provincia) {
        provinciaMap[municipio] = provincia;
      }
    }
    
    console.log('Provincias cargadas desde DATOS:', Object.keys(provinciaMap).length);
    return provinciaMap;
    
  } catch (error) {
    console.error('Error cargando provincias:', error);
    return {};
  }
}

// ============================================
// ENTRY POINTS
// ============================================

/**
 * Sirve la aplicación web (frontend)
 */
function doGet(e) {
  const page = e.parameter.page || 'dashboard';
  
  // Si es una petición de API
  if (e.parameter.api) {
    return handleApiRequest(e);
  }
  
  // Servir el HTML del dashboard
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ANALISÍS GEO-DEMOGRAFICO CAMPAÑA POLITICA')
    .setFaviconUrl('https://www.partidoliberal.org.co/favicon.ico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Maneja las peticiones de API
 */
function handleApiRequest(e) {
  try {
    const action = e.parameter.action || 'getAllData';
    let result;
    
    switch(action) {
      case 'getAllData':
        result = getAllData();
        break;
      case 'getStats':
        result = getStats();
        break;
      case 'getDepartments':
        result = getDepartments();
        break;
      case 'getProvincias':
        result = getProvincias();
        break;
      case 'getMunicipalities':
        result = getMunicipalities(e.parameter.dept);
        break;
      case 'getMunicipalitiesByProvincia':
        result = getMunicipalitiesByProvincia(e.parameter.provincia);
        break;
      case 'getFiltered':
        const filters = e.parameter.filters ? JSON.parse(e.parameter.filters) : {};
        result = getFilteredData(filters);
        break;
      case 'getDatosComparativos':
        result = getDatosComparativos();
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Include helper para cargar archivos HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================
// API FUNCTIONS - OPTIMIZADAS
// ============================================

  /**
   * Lee datos de una hoja específica y los convierte a registros
   * @param {string} sheetId - ID del spreadsheet
   * @param {string} sheetName - Nombre de la hoja
   * @param {Object} provinciaMap - Mapa de municipio -> provincia
   * @param {string} sourceLabel - Etiqueta para identificar la fuente (ej: 'Base 1', 'Base 2')
   * @returns {Array} Array de registros procesados
   */
  function readSheetRecords(sheetId, sheetName, provinciaMap, sourceLabel) {
    try {
      const ss = SpreadsheetApp.openById(sheetId);
      let sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        console.warn(`Hoja '${sheetName}' no encontrada en spreadsheet ${sheetId}. Intentando con la primera hoja.`);
        sheet = ss.getSheets()[0];
      }
      
      if (!sheet) {
        console.error(`ERROR: No se pudo obtener ningún sheet de ${sheetId}`);
        return [];
      }
      
      console.log(`[${sourceLabel}] Sheet usado: ${sheet.getName()}`);
      
      const data = sheet.getDataRange().getValues();
      console.log(`[${sourceLabel}] Filas obtenidas: ${data.length}`);
      
      if (data.length === 0) {
        return [];
      }
      
      // Normalize headers: trim spaces and ensure string
      const headers = data[0].map(h => String(h).trim());
      console.log(`[${sourceLabel}] Headers:`, headers);
      
      const records = [];
      for (let i = 1; i < data.length; i++) {
        // Skip rows where column G (TELEFONO, index 6) is empty
        const telefonoVal = data[i][6];
        if (!telefonoVal || String(telefonoVal).trim() === '' || String(telefonoVal).trim() === '0') continue;
        
        const record = {};
        headers.forEach((header, index) => {
          let value = data[i][index] || '';
          
          // Normalizar WhatsApp
          if (header === 'USA_WHATSAPP' && typeof value === 'string') {
            value = value.toLowerCase().trim().startsWith('s') ? 'Sí' : 'No';
          }
          
          // Convertir strings a mayúsculas (excepto campos especiales)
          if (typeof value === 'string' && header !== 'USA_WHATSAPP') {
            value = value.trim().toUpperCase();
          }
          
          // NO truncar - necesitamos datos completos para stats
          record[header] = value;
        });
        
        // Agregar PROVINCIA basado en el MUNICIPIO
        const municipioNorm = String(record.MUNICIPIO || '').trim().toUpperCase();
        record.PROVINCIA = provinciaMap[municipioNorm] || 'Sin Provincia';
        
        // Etiquetar la fuente de datos
        record._FUENTE = sourceLabel;
        
        records.push(record);
      }
      
      console.log(`[${sourceLabel}] Registros procesados: ${records.length}`);
      return records;
      
    } catch (error) {
      console.error(`Error leyendo hoja ${sheetName} de ${sheetId}:`, error);
      return [];
    }
  }

  function getRawDataCached() {
    const cacheKey = 'rawData_v5_dual_source';
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      console.log('✅ Usando datos cacheados (dual source)');
      return cached;
    }
    
    try {
      console.log('=== INICIO getRawDataCached (DUAL SOURCE) ===');
      
      // Cargar mapa de provincias
      const provinciaMap = getProvinciaMap();
      console.log('Mapa de provincias cargado');
      
      // ========== FUENTE 1: Spreadsheet original (ENCUESTA) ==========
      const records1 = readSheetRecords(
        CONFIG.SHEET_ID, 
        CONFIG.SHEET_NAME, 
        provinciaMap, 
        'Base Principal'
      );
      console.log('✅ Base Principal:', records1.length, 'registros');
      
      // ========== FUENTE 2: Nuevo spreadsheet (Base dash) ==========
      let records2 = [];
      try {
        records2 = readSheetRecords(
          CONFIG.SHEET2_ID, 
          CONFIG.SHEET2_NAME, 
          provinciaMap, 
          'Base Dash'
        );
        console.log('✅ Base Dash:', records2.length, 'registros');
      } catch (error) {
        console.error('⚠️ Error cargando Base Dash (continuando solo con Base Principal):', error);
      }
      
      // ========== COMBINAR AMBAS FUENTES ==========
      const allRecords = [...records1, ...records2];
      console.log('📊 TOTAL COMBINADO:', allRecords.length, 'registros', 
        `(Base Principal: ${records1.length} + Base Dash: ${records2.length})`);
      
      const result = { success: true, data: allRecords };
      
      // Cachear por 5 minutos
      setCachedData(cacheKey, result);
      console.log('=== FIN getRawDataCached (DUAL SOURCE) - SUCCESS ===');
      
      return result;
      
    } catch (error) {
      console.error('=== ERROR en getRawDataCached ===');
      console.error('Error:', error.toString());
      return { success: false, error: error.toString(), data: [] };
    }
  }

/**
 * Obtiene datos para el dashboard (stats + datos limitados para tabla)
 * OPTIMIZADO para evitar respuestas gigantes
 */
function getAllData() {
  try {
    console.log('=== INICIO getAllData ===');
    
    // Obtener datos completos (cacheados)
    const rawDataResult = getRawDataCached();
    
    if (!rawDataResult.success) {
      return {
        success: false,
        error: rawDataResult.error,
        count: 0,
        data: [],
        stats: {}
      };
    }
    
    const allRecords = rawDataResult.data;
    console.log('Total de registros:', allRecords.length);
    
    // Calcular estadísticas con TODOS los datos
    console.log('Calculando estadísticas con datos completos...');
    const statsData = calculateStats(allRecords);
    console.log('Estadísticas calculadas');
    
    // Para la tabla, enviar TODOS los registros con TODAS las columnas necesarias
    // Columnas según estructura: NOMBRE_LIDER, CC_LIDER, RELACION_PARENTESCO, A_QUIEN_REFIERE, 
    // NUMERO_DOCUMENTO, OCUPACION_NEGOCIO, TELEFONO, DEPARTAMENTO, MUNICIPIO, FECHA_NACIMIENTO, 
    // USA_WHATSAPP, FECHA_AUTORIZACION, SEXO, PROVINCIA (calculado)
    const essentialColumns = [
      'NOMBRE_LIDER',
      'CC_LIDER', 
      'RELACION_PARENTESCO', 
      'A_QUIEN_REFIERE', 
      'NUMERO_DOCUMENTO', 
      'OCUPACION_NEGOCIO', 
      'TELEFONO', 
      'DEPARTAMENTO',
      'PROVINCIA',
      'MUNICIPIO', 
      'FECHA_NACIMIENTO', 
      'USA_WHATSAPP', 
      'FECHA_AUTORIZACION', 
      'SEXO',
      'OBSERVACIONES'
    ];
    
    // Enviar TODOS los registros (sin límite) para que la paginación funcione correctamente
    const limitedRecords = allRecords.map(record => {
      const limited = {};
      essentialColumns.forEach(col => {
        if (record[col] !== undefined) {
          let value = record[col];
          // Formatear fechas si es un objeto Date
          if (value instanceof Date) {
            value = value.toISOString();
          }
          // Truncar strings muy largos (más de 200 caracteres)
          if (typeof value === 'string' && value.length > 200) {
            value = value.substring(0, 200) + '...';
          }
          limited[col] = value;
        } else {
          // Asignar string vacío si no existe para evitar undefined
          limited[col] = '';
        }
      });
      return limited;
    });
    
    console.log('Registros para tabla:', limitedRecords.length);
    
    const result = {
      success: true,
      count: limitedRecords.length,
      totalRecords: allRecords.length,
      data: limitedRecords,
      stats: statsData
    };
    
    // Log del tamaño
    try {
      const jsonSize = JSON.stringify(result).length;
      console.log('Tamaño de respuesta: ' + (jsonSize / 1024).toFixed(2) + ' KB');
    } catch (e) {
      console.error('Error calculando tamaño:', e);
    }
    
    console.log('=== FIN getAllData - SUCCESS ===');
    return result;
    
  } catch (error) {
    console.error('=== ERROR en getAllData ===');
    console.error('Error:', error.toString());
    
    return {
      success: false,
      error: error.toString(),
      count: 0,
      data: [],
      stats: {}
    };
  }
}

/**
 * Obtiene estadísticas agregadas (usa datos completos cacheados)
 */
function getStats() {
  const rawDataResult = getRawDataCached();
  
  if (!rawDataResult.success) {
    return { success: false, error: rawDataResult.error, stats: {} };
  }
  
  const stats = calculateStats(rawDataResult.data);
  
  return {
    success: true,
    stats: stats
  };
}

/**
 * Obtiene datos agregados por departamento (usa datos completos)
 */
function getDepartments() {
  const rawDataResult = getRawDataCached();
  
  if (!rawDataResult.success) {
    return { success: false, error: rawDataResult.error, data: [] };
  }
  
  const records = rawDataResult.data;
  
  const deptData = {};
  
  records.forEach(record => {
    const dept = record.DEPARTAMENTO;
    if (!dept) return;
    
    if (!deptData[dept]) {
      deptData[dept] = {
        name: dept,
        count: 0,
        municipalities: new Set(),
        whatsappUsers: 0
      };
    }
    
    deptData[dept].count++;
    if (record.MUNICIPIO) deptData[dept].municipalities.add(record.MUNICIPIO);
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') deptData[dept].whatsappUsers++;
  });
  
  const departments = Object.values(deptData).map(dept => ({
    name: dept.name,
    count: dept.count,
    municipalityCount: dept.municipalities.size,
    whatsappPercentage: (dept.whatsappUsers / dept.count * 100).toFixed(2)
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    count: departments.length,
    data: departments
  };
}

/**
 * Obtiene municipios (opcionalmente filtrados por departamento) - usa datos completos
 */
function getMunicipalities(departmentName) {
  const rawDataResult = getRawDataCached();
  
  if (!rawDataResult.success) {
    return { success: false, error: rawDataResult.error, data: [] };
  }
  
  const records = rawDataResult.data;
  
  const munData = {};
  
  records.forEach(record => {
    if (departmentName && record.DEPARTAMENTO !== departmentName) return;
    
    const mun = record.MUNICIPIO;
    if (!mun) return;
    
    const key = `${record.DEPARTAMENTO}|${mun}`;
    
    if (!munData[key]) {
      munData[key] = {
        name: mun,
        department: record.DEPARTAMENTO,
        count: 0,
        whatsappUsers: 0
      };
    }
    
    munData[key].count++;
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') munData[key].whatsappUsers++;
  });
  
  const municipalities = Object.values(munData).map(mun => ({
    name: mun.name,
    department: mun.department,
    count: mun.count,
    whatsappPercentage: (mun.whatsappUsers / mun.count * 100).toFixed(2)
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    department: departmentName || 'all',
    count: municipalities.length,
    data: municipalities
  };
}

/**
 * Obtiene datos agregados por provincia (usa datos completos)
 */
function getProvincias() {
  const rawDataResult = getRawDataCached();
  
  if (!rawDataResult.success) {
    return { success: false, error: rawDataResult.error, data: [] };
  }
  
  const records = rawDataResult.data;
  
  const provinciaData = {};
  
  records.forEach(record => {
    const provincia = record.PROVINCIA;
    if (!provincia || provincia === 'Sin Provincia') return;
    
    if (!provinciaData[provincia]) {
      provinciaData[provincia] = {
        name: provincia,
        count: 0,
        municipalities: new Set(),
        whatsappUsers: 0
      };
    }
    
    provinciaData[provincia].count++;
    if (record.MUNICIPIO) provinciaData[provincia].municipalities.add(record.MUNICIPIO);
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') provinciaData[provincia].whatsappUsers++;
  });
  
  const provincias = Object.values(provinciaData).map(prov => ({
    name: prov.name,
    count: prov.count,
    municipalityCount: prov.municipalities.size,
    whatsappPercentage: (prov.whatsappUsers / prov.count * 100).toFixed(2)
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    count: provincias.length,
    data: provincias
  };
}

/**
 * Obtiene municipios filtrados por provincia
 */
function getMunicipalitiesByProvincia(provinciaName) {
  const rawDataResult = getRawDataCached();
  
  if (!rawDataResult.success) {
    return { success: false, error: rawDataResult.error, data: [] };
  }
  
  const records = rawDataResult.data;
  
  const munData = {};
  
  records.forEach(record => {
    if (provinciaName && record.PROVINCIA !== provinciaName) return;
    
    const mun = record.MUNICIPIO;
    if (!mun) return;
    
    const key = `${record.PROVINCIA}|${mun}`;
    
    if (!munData[key]) {
      munData[key] = {
        name: mun,
        provincia: record.PROVINCIA,
        count: 0,
        whatsappUsers: 0
      };
    }
    
    munData[key].count++;
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') munData[key].whatsappUsers++;
  });
  
  const municipalities = Object.values(munData).map(mun => ({
    name: mun.name,
    provincia: mun.provincia,
    count: mun.count,
    whatsappPercentage: (mun.whatsappUsers / mun.count * 100).toFixed(2)
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    provincia: provinciaName || 'all',
    count: municipalities.length,
    data: municipalities
  };
}

/**
 * Obtiene datos filtrados
 */
function getFilteredData(filters) {
  const allData = getAllData();
  let records = allData.data;
  
  if (filters.provincia) {
    records = records.filter(r => r.PROVINCIA === filters.provincia);
  }
  
  if (filters.department) {
    records = records.filter(r => r.DEPARTAMENTO === filters.department);
  }
  
  if (filters.municipality) {
    records = records.filter(r => r.MUNICIPIO === filters.municipality);
  }
  
  if (filters.gender) {
    records = records.filter(r => r.SEXO === filters.gender);
  }
  
  if (filters.referrer) {
    records = records.filter(r => r.NOMBRE_LIDER === filters.referrer);
  }
  
  if (filters.whatsapp !== undefined) {
    const whatsappValue = filters.whatsapp ? 'Sí' : 'No';
    records = records.filter(r => 
      r.USA_WHATSAPP === whatsappValue || 
      r.USA_WHATSAPP === whatsappValue.replace('í', 'i')
    );
  }
  
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    records = records.filter(r => {
      const recordDate = new Date(r.FECHA_AUTORIZACION);
      return recordDate >= fromDate;
    });
  }
  
  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    records = records.filter(r => {
      const recordDate = new Date(r.FECHA_AUTORIZACION);
      return recordDate <= toDate;
    });
  }
  
  return {
    success: true,
    filters: filters,
    count: records.length,
    data: records
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStatsSimple(records) {
  const departments = new Set();
  const municipalities = new Set();
  let whatsappUsers = 0;
  const genderCount = { Masculino: 0, Femenino: 0, Otro: 0 };
  
  records.forEach(record => {
    if (record.DEPARTAMENTO) departments.add(record.DEPARTAMENTO);
    if (record.MUNICIPIO) municipalities.add(record.MUNICIPIO);
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') whatsappUsers++;
    
    if (record.SEXO) {
      let sexo = String(record.SEXO).trim().toUpperCase();
      // Normalizar M/F a Masculino/Femenino
      if (sexo === 'M' || sexo === 'MASCULINO') {
        sexo = 'Masculino';
      } else if (sexo === 'F' || sexo === 'FEMENINO') {
        sexo = 'Femenino';
      } else {
        sexo = 'Otro';
      }
      genderCount[sexo] = (genderCount[sexo] || 0) + 1;
    }
  });
  
  return {
    totalRecords: records.length,
    totalDepartments: departments.size,
    totalMunicipalities: municipalities.size,
    whatsappUsers: whatsappUsers,
    whatsappPercentage: records.length > 0 ? (whatsappUsers / records.length * 100).toFixed(2) : 0,
    genderDistribution: genderCount,
    topOccupations: [], // Vacío para reducir tamaño
    monthlyTrend: [] // Vacío para reducir tamaño
  };
}

function calculateStats(records) {
  const provincias = new Set();
  const municipalities = new Set();
  let whatsappUsers = 0;
  const genderCount = { Masculino: 0, Femenino: 0, Otro: 0 };
  const occupations = {};
  const monthlyTrend = {};
  const referrers = {};
  const provinciaCoverage = {};
  
  // ====== DIAGNÓSTICO: Ver campos disponibles y conteo ======
  if (records.length > 0) {
    const sample = records[0];
    console.log('🔍 DIAGNÓSTICO - Campos del primer registro:', Object.keys(sample));
    console.log('🔍 DIAGNÓSTICO - Valores del primer registro:', JSON.stringify(sample));
    
    // Contar cuántos registros tienen cada campo relevante
    let conTelefono = 0, conNumDoc = 0, conCCLider = 0;
    records.forEach(r => {
      if (r.TELEFONO && String(r.TELEFONO).trim() !== '' && String(r.TELEFONO).trim() !== '0') conTelefono++;
      if (r.NUMERO_DOCUMENTO && String(r.NUMERO_DOCUMENTO).trim() !== '' && String(r.NUMERO_DOCUMENTO).trim() !== '0') conNumDoc++;
      if (r.CC_LIDER && String(r.CC_LIDER).trim() !== '') conCCLider++;
    });
    console.log(`🔍 DIAGNÓSTICO - Registros con TELEFONO válido: ${conTelefono}/${records.length}`);
    console.log(`🔍 DIAGNÓSTICO - Registros con NUMERO_DOCUMENTO válido: ${conNumDoc}/${records.length}`);
    console.log(`🔍 DIAGNÓSTICO - Registros con CC_LIDER: ${conCCLider}/${records.length}`);
  }
  // ====== FIN DIAGNÓSTICO ======
  
  // Contar aliados únicos y duplicados usando NUMERO_DOCUMENTO
  const documentoCount = {}; // Para contar cuántas veces aparece cada documento
  const documentosUnicos = new Set(); // Para contar documentos únicos
  let totalAliadosConDocumento = 0; // Total de registros con documento válido
  
  records.forEach(record => {
    // Safely access properties - usar PROVINCIA en lugar de DEPARTAMENTO
    if (record.PROVINCIA && record.PROVINCIA !== 'Sin Provincia') {
      provincias.add(record.PROVINCIA);
      if (!provinciaCoverage[record.PROVINCIA]) {
        provinciaCoverage[record.PROVINCIA] = new Set();
      }
      if (record.MUNICIPIO) {
        provinciaCoverage[record.PROVINCIA].add(record.MUNICIPIO);
      }
    }
    if (record.MUNICIPIO) municipalities.add(record.MUNICIPIO);
    
    // Contar documentos (aliados)
    if (record.NUMERO_DOCUMENTO) {
      const documento = String(record.NUMERO_DOCUMENTO).trim();
      if (documento && documento !== '' && documento !== '0' && documento.toLowerCase() !== 'null') {
        totalAliadosConDocumento++;
        documentosUnicos.add(documento);
        documentoCount[documento] = (documentoCount[documento] || 0) + 1;
      }
    }
    
    // Normalizar WhatsApp - detectar con toLowerCase
    if (record.USA_WHATSAPP) {
      const whatsappValue = String(record.USA_WHATSAPP).toLowerCase().trim();
      if (whatsappValue.startsWith('s') || whatsappValue === 'yes' || whatsappValue === '1') {
        whatsappUsers++;
      }
    }
    
    if (record.SEXO) {
      let sexo = String(record.SEXO).trim().toUpperCase();
      // Normalizar M/F a Masculino/Femenino
      if (sexo === 'M' || sexo === 'MASCULINO') {
        sexo = 'Masculino';
      } else if (sexo === 'F' || sexo === 'FEMENINO') {
        sexo = 'Femenino';
      } else {
        sexo = 'Otro';
      }
      genderCount[sexo] = (genderCount[sexo] || 0) + 1;
    }

    if (record.OCUPACION_NEGOCIO) {
      occupations[record.OCUPACION_NEGOCIO] = (occupations[record.OCUPACION_NEGOCIO] || 0) + 1;
    }
    
    // Track referrers (líderes) - usar NOMBRE_LIDER (columna A) como clave - Excluir ALEX PRIETO
    {
      const rawNombre = record.NOMBRE_LIDER ? String(record.NOMBRE_LIDER).trim() : '';
      const nombreLider = (rawNombre && rawNombre.toLowerCase() !== 'null') ? rawNombre.toUpperCase() : '';
      if (nombreLider && nombreLider !== 'ALEX PRIETO' && nombreLider !== 'EQUIPO ALEX PRIETO') {
        if (!referrers[nombreLider]) {
          referrers[nombreLider] = {
            count: 0,
            whatsappCount: 0,
            cc: record.CC_LIDER || ''
          };
        }
        referrers[nombreLider].count++;
        if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') {
          referrers[nombreLider].whatsappCount++;
        }
      }
    }
    
    // Parseo de fecha más seguro
    if (record.FECHA_AUTORIZACION) {
      try {
        let date;
        
        // Si ya es un objeto Date
        if (record.FECHA_AUTORIZACION instanceof Date) {
          date = record.FECHA_AUTORIZACION;
        } else {
          // Intentar parsear como string
          date = new Date(record.FECHA_AUTORIZACION);
        }
        
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });
  
  // Calcular duplicados por NUMERO_DOCUMENTO
  const totalDuplicados = Object.entries(documentoCount)
    .filter(([doc, count]) => count > 1)
    .reduce((sum, [doc, count]) => sum + (count - 1), 0); // Contar solo las repeticiones extras
  
  const topOccupations = Object.entries(occupations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Calculate top referrers (líderes)
  const topReferrers = Object.entries(referrers)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([nombre, data]) => ({
      nombre: nombre,
      cc: data.cc,
      count: data.count,
      whatsappPercentage: (data.whatsappCount / data.count * 100).toFixed(2)
    }));
  
  // Calculate geographic coverage percentage
  const totalMunicipalities = municipalities.size;
  const avgMunicipalitiesPerProvincia = provincias.size > 0 ? totalMunicipalities / provincias.size : 0;
  
  // Calculate growth (last month vs previous)
  const monthKeys = Object.keys(monthlyTrend).sort();
  let growthRate = 0;
  if (monthKeys.length >= 2) {
    const lastMonth = monthlyTrend[monthKeys[monthKeys.length - 1]];
    const prevMonth = monthlyTrend[monthKeys[monthKeys.length - 2]];
    growthRate = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth * 100).toFixed(2) : 0;
  }
  
  return {
    totalRecords: records.length,
    totalProvincias: provincias.size,
    totalMunicipalities: municipalities.size,
    whatsappUsers: whatsappUsers,
    whatsappPercentage: records.length > 0 ? (whatsappUsers / records.length * 100).toFixed(2) : 0,
    genderDistribution: genderCount,
    topOccupations,
    topReferrers,
    growthRate,
    avgMunicipalitiesPerProvincia: avgMunicipalitiesPerProvincia.toFixed(1),
    monthlyTrend: Object.entries(monthlyTrend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count })),
    // Métricas de aliados únicos y duplicados (basado en NUMERO_DOCUMENTO)
    totalAliados: totalAliadosConDocumento, // Total de registros con documento
    aliadosUnicos: documentosUnicos.size, // Documentos únicos
    aliadosDuplicados: totalDuplicados, // Cantidad de registros duplicados
    porcentajeDuplicados: totalAliadosConDocumento > 0 ? ((totalDuplicados / totalAliadosConDocumento) * 100).toFixed(2) : 0
  };
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
    // Si falla el caché, no importa - solo será más lento
    console.log('Cache failed:', e);
  }
}

// ============================================
// DATOS COMPARATIVOS (HOJA DATOS)
// VS Meta 2026 & VS Oscar Sánchez
// ============================================

/**
 * Obtiene los datos comparativos de la hoja DATOS
 * Col A = Municipio, B = Provincia, C = Meta 2026, D = Oscar Sánchez 2022
 * Col F = MUNICIPIO (actual), G = PROVINCIA (actual), H = DATOS (valor actual)
 */
function getDatosComparativos() {
  const cacheKey = 'datos_comparativos_v3';
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    console.log('✅ Usando datos comparativos cacheados');
    return cached;
  }
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.DATOS_SHEET_NAME);
    
    if (!sheet) {
      console.warn('Hoja DATOS no encontrada');
      return { success: false, error: 'Hoja DATOS no encontrada', data: [], dataProvincia: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Mapa de valor actual por municipio (columna F=index5, H=index7)
    const valorActualMap = {};
    for (let i = 1; i < data.length; i++) {
      const munActual = String(data[i][5] || '').trim().toUpperCase();
      const valorActual = parseInt(data[i][7]) || 0;
      if (munActual) {
        valorActualMap[munActual] = valorActual;
      }
    }
    
    // Datos por municipio (columnas A-D)
    const municipioData = [];
    const provinciaAgg = {};
    
    for (let i = 1; i < data.length; i++) {
      const municipio = String(data[i][0] || '').trim().toUpperCase();
      const provincia = String(data[i][1] || '').trim().toUpperCase();
      const meta2026 = parseInt(data[i][2]) || 0;
      const oscarSanchez = parseInt(data[i][3]) || 0;
      
      if (!municipio) continue;
      
      const valorActual = valorActualMap[municipio] || 0;
      const pctMeta = meta2026 > 0 ? parseFloat(((valorActual / meta2026) * 100).toFixed(2)) : 0;
      const pctOscar = oscarSanchez > 0 ? parseFloat(((valorActual / oscarSanchez) * 100).toFixed(2)) : 0;
      
      municipioData.push({
        municipio, provincia, valorActual, meta2026, oscarSanchez, pctMeta, pctOscar
      });
      
      // Agregar por provincia
      if (provincia) {
        if (!provinciaAgg[provincia]) {
          provinciaAgg[provincia] = { valorActual: 0, meta2026: 0, oscarSanchez: 0 };
        }
        provinciaAgg[provincia].valorActual += valorActual;
        provinciaAgg[provincia].meta2026 += meta2026;
        provinciaAgg[provincia].oscarSanchez += oscarSanchez;
      }
    }
    
    // Datos por provincia
    const provinciaData = Object.entries(provinciaAgg).map(([provincia, v]) => {
      const pctMeta = v.meta2026 > 0 ? parseFloat(((v.valorActual / v.meta2026) * 100).toFixed(2)) : 0;
      const pctOscar = v.oscarSanchez > 0 ? parseFloat(((v.valorActual / v.oscarSanchez) * 100).toFixed(2)) : 0;
      return { provincia, valorActual: v.valorActual, meta2026: v.meta2026, oscarSanchez: v.oscarSanchez, pctMeta, pctOscar };
    }).sort((a, b) => b.meta2026 - a.meta2026);
    
    municipioData.sort((a, b) => b.meta2026 - a.meta2026);
    
    const totalMeta2026 = municipioData.reduce((s, d) => s + d.meta2026, 0);
    const totalOscar = municipioData.reduce((s, d) => s + d.oscarSanchez, 0);
    const totalActual = municipioData.reduce((s, d) => s + d.valorActual, 0);
    
    const provinciasUnicas = [...new Set(municipioData.map(d => d.provincia).filter(p => p))].sort();
    
    const result = {
      success: true,
      data: municipioData,
      dataProvincia: provinciaData,
      provincias: provinciasUnicas,
      totalMunicipios: municipioData.length,
      totalMeta2026, totalOscar, totalActual
    };
    
    setCachedData(cacheKey, result);
    console.log('✅ Datos comparativos cargados:', municipioData.length, 'municipios,', provinciaData.length, 'provincias');
    
    return result;
    
  } catch (error) {
    console.error('Error cargando datos comparativos:', error);
    return { success: false, error: error.toString(), data: [], dataProvincia: [] };
  }
}

// ============================================
// AUTHENTICATION SYSTEM - EMAIL & PASSWORD
// ============================================

/**
* Inicializa la hoja de administradores con la lista inicial
*/
function initializeAdmins() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);

  // Si no existe la hoja, crearla
  if (!adminSheet) {
      adminSheet = ss.insertSheet(CONFIG.ADMINS_SHEET_NAME);

      // Agregar headers - ACTUALIZADO: Columna B es CONTRASEÑA
      adminSheet.getRange(1, 1, 1, 4).setValues([[
          'EMAIL', 'CONTRASEÑA', 'FECHA_AGREGADO', 'ES_SUPER_ADMIN'
      ]]);

      // Formatear headers
      adminSheet.getRange(1, 1, 1, 4)
          .setBackground('#DC2626')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');

      // Lista inicial de administradores con contraseñas por defecto
      const initialAdmins = [
          ['1133985163f@gmail.com', 'Aaer*101', new Date(), 'SI'],
          ['franco.coria.r@gmail.com', 'Aaer*102', new Date(), 'NO'],
          ['davidmateo429@gmail.com', 'Aaer*103', new Date(), 'NO'],
          ['santiagomube10@gmail.com', 'Aaer*104', new Date(), 'NO'],
          ['camivon7@gmail.com', 'Aaer*105', new Date(), 'NO'],
          ['andresbernalflorez@gmail.com', 'Aaer*106', new Date(), 'NO'],
          ['dipalexprietog@gmail.com', 'Aaer*107', new Date(), 'NO'],
          ['alexprietodatos@gmail.com', 'Aaer*108', new Date(), 'NO'],
          ['Maheca06@gmail.com', 'Aaer*109', new Date(), 'NO'],
          ['soportekaizen@gmail.com', 'Aaer*110', new Date(), 'NO']
      ];

      // Agregar administradores iniciales
      adminSheet.getRange(2, 1, initialAdmins.length, 4).setValues(initialAdmins);

      // Auto-ajustar columnas
      adminSheet.autoResizeColumns(1, 4);

      console.log('Hoja de administradores inicializada con', initialAdmins.length, 'admins');
  }

  return { success: true, message: 'Administradores inicializados' };
}

/**
* Valida credenciales de login (email y contraseña)
*/
function validateLogin(email, password) {
  try {
      if (!email || !password) {
          return { success: false, error: 'Email y contraseña requeridos' };
      }

      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);

      // Si no existe la hoja, inicializar
      if (!adminSheet) {
          initializeAdmins();
          adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);
      }

      const data = adminSheet.getDataRange().getValues();
      const emailLower = email.toLowerCase().trim();

      // Buscar el email y validar contraseña (empezando desde fila 2, saltando headers)
      for (let i = 1; i < data.length; i++) {
          const adminEmail = String(data[i][0]).toLowerCase().trim();
          const adminPassword = String(data[i][1]).trim();
          
          if (adminEmail === emailLower) {
              // Verificar contraseña
              if (adminPassword === password) {
                  const isSuperAdmin = String(data[i][3]).toUpperCase() === 'SI';
                  
                  // Registrar acceso exitoso
                  logSuccessfulAccess(data[i][0]);
                  
                  return {
                      success: true,
                      hasAccess: true,
                      isSuperAdmin: isSuperAdmin,
                      email: data[i][0]
                  };
              } else {
                  // Contraseña incorrecta
                  logFailedLogin(email, 'Contraseña incorrecta');
                  return { success: false, error: 'Contraseña incorrecta' };
              }
          }
      }

      // Email no encontrado
      logFailedLogin(email, 'Email no encontrado');
      return { success: false, error: 'Email no encontrado' };

  } catch (error) {
      console.error('Error en validateLogin:', error);
      return { success: false, error: 'Error al validar credenciales' };
  }
}

/**
* Cambia la contraseña de un usuario
*/
function changePassword(email, currentPassword, newPassword) {
  try {
      if (!email || !currentPassword || !newPassword) {
          return { success: false, error: 'Todos los campos son requeridos' };
      }

      // Validar que la contraseña actual sea correcta
      const loginCheck = validateLogin(email, currentPassword);
      if (!loginCheck.success) {
          return { success: false, error: 'Contraseña actual incorrecta' };
      }

      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);
      const data = adminSheet.getDataRange().getValues();
      const emailLower = email.toLowerCase().trim();

      // Buscar y actualizar la contraseña
      for (let i = 1; i < data.length; i++) {
          const adminEmail = String(data[i][0]).toLowerCase().trim();
          if (adminEmail === emailLower) {
              // Actualizar contraseña en columna B (índice 1)
              adminSheet.getRange(i + 1, 2).setValue(newPassword);
              
              console.log('✅ Contraseña actualizada para:', email);
              
              return {
                  success: true,
                  message: 'Contraseña actualizada exitosamente'
              };
          }
      }

      return { success: false, error: 'Usuario no encontrado' };

  } catch (error) {
      console.error('Error en changePassword:', error);
      return { success: false, error: error.toString() };
  }
}

/**
* Obtiene la lista completa de administradores (sin contraseñas)
*/
function getAllAdmins() {
  try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);

      // Si no existe la hoja, inicializar
      if (!adminSheet) {
          initializeAdmins();
          adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);
      }

      const data = adminSheet.getDataRange().getValues();
      const admins = [];

      // Empezar desde fila 2 (saltando headers)
      for (let i = 1; i < data.length; i++) {
          if (data[i][0]) { // Si hay email
              admins.push({
                  email: data[i][0],
                  addedAt: data[i][2] ? new Date(data[i][2]).toLocaleDateString('es-CO') : '-',
                  isSuperAdmin: String(data[i][3]).toUpperCase() === 'SI'
              });
          }
      }

      return {
          success: true,
          count: admins.length,
          admins: admins
      };

  } catch (error) {
      console.error('Error en getAllAdmins:', error);
      return { success: false, error: error.toString(), admins: [] };
  }
}

/**
* Agrega un nuevo administrador (solo super admin)
*/
function addAdmin(newEmail, newPassword, addedByEmail) {
  try {
      if (!newEmail || !newPassword || !addedByEmail) {
          return { success: false, error: 'Todos los campos son requeridos' };
      }

      // Verificar que quien agrega es super admin
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);
      const data = adminSheet.getDataRange().getValues();
      const addedByLower = addedByEmail.toLowerCase().trim();
      
      let isSuperAdmin = false;
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).toLowerCase().trim() === addedByLower) {
              isSuperAdmin = String(data[i][3]).toUpperCase() === 'SI';
              break;
          }
      }
      
      if (!isSuperAdmin) {
          return { success: false, error: 'Solo los super administradores pueden crear cuentas' };
      }

      // Verificar que el nuevo email no existe ya
      const newEmailLower = newEmail.toLowerCase().trim();
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).toLowerCase().trim() === newEmailLower) {
              return { success: false, error: 'Este email ya existe' };
          }
      }

      // Agregar nueva fila
      const newRow = [
          newEmailLower,
          newPassword,
          new Date(),
          'NO' // No es super admin por defecto
      ];

      adminSheet.appendRow(newRow);

      return {
          success: true,
          message: `Administrador ${newEmail} creado exitosamente`,
          admin: {
              email: newRow[0],
              addedAt: new Date().toLocaleDateString('es-CO'),
              isSuperAdmin: false
          }
      };

  } catch (error) {
      console.error('Error en addAdmin:', error);
      return { success: false, error: error.toString() };
  }
}

/**
* Elimina un administrador (solo super admin)
*/
function deleteAdmin(emailToDelete, deletedByEmail) {
  try {
      if (!emailToDelete || !deletedByEmail) {
          return { success: false, error: 'Email requerido' };
      }

      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const adminSheet = ss.getSheetByName(CONFIG.ADMINS_SHEET_NAME);
      const data = adminSheet.getDataRange().getValues();
      
      // Verificar que quien elimina es super admin
      const deletedByLower = deletedByEmail.toLowerCase().trim();
      let isSuperAdmin = false;
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]).toLowerCase().trim() === deletedByLower) {
              isSuperAdmin = String(data[i][3]).toUpperCase() === 'SI';
              break;
          }
      }
      
      if (!isSuperAdmin) {
          return { success: false, error: 'Solo el super administrador puede eliminar usuarios' };
      }

      // No permitir eliminar al super admin principal
      if (emailToDelete.toLowerCase().trim() === CONFIG.SUPER_ADMIN.toLowerCase()) {
          return { success: false, error: 'No se puede eliminar al super administrador principal' };
      }

      const emailLower = emailToDelete.toLowerCase().trim();

      // Buscar y eliminar la fila
      for (let i = 1; i < data.length; i++) {
          const adminEmail = String(data[i][0]).toLowerCase().trim();
          if (adminEmail === emailLower) {
              // Eliminar fila (i+1 porque las filas en Sheets empiezan en 1)
              adminSheet.deleteRow(i + 1);
              return {
                  success: true,
                  message: `Administrador ${emailToDelete} eliminado exitosamente`
              };
          }
      }

      return { success: false, error: 'Administrador no encontrado' };

  } catch (error) {
      console.error('Error en deleteAdmin:', error);
      return { success: false, error: error.toString() };
  }
}

/**
* Registra accesos exitosos
*/
function logSuccessfulAccess(email) {
  try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let logSheet = ss.getSheetByName('ACCESOS_EXITOSOS');
      
      // Crear hoja si no existe
      if (!logSheet) {
          logSheet = ss.insertSheet('ACCESOS_EXITOSOS');
          logSheet.getRange(1, 1, 1, 2).setValues([['EMAIL', 'FECHA']]);
          logSheet.getRange(1, 1, 1, 2)
              .setBackground('#10B981')
              .setFontColor('#FFFFFF')
              .setFontWeight('bold');
          logSheet.autoResizeColumns(1, 2);
      }
      
      // Agregar registro
      logSheet.appendRow([email, new Date()]);
      console.log('✅ Acceso exitoso registrado:', email);
      
  } catch (error) {
      console.error('Error registrando acceso exitoso:', error);
  }
}

/**
* Registra intentos de login fallidos
*/
function logFailedLogin(email, reason) {
  try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let logSheet = ss.getSheetByName('INTENTOS_FALLIDOS');
      
      // Crear hoja si no existe
      if (!logSheet) {
          logSheet = ss.insertSheet('INTENTOS_FALLIDOS');
          logSheet.getRange(1, 1, 1, 3).setValues([['EMAIL', 'FECHA', 'RAZON']]);
          logSheet.getRange(1, 1, 1, 3)
              .setBackground('#DC2626')
              .setFontColor('#FFFFFF')
              .setFontWeight('bold');
          logSheet.autoResizeColumns(1, 3);
      }
      
      // Agregar registro
      logSheet.appendRow([email, new Date(), reason]);
      console.log('⚠️ Intento fallido registrado:', email, '-', reason);
      
  } catch (error) {
      console.error('Error registrando intento fallido:', error);
  }
}
