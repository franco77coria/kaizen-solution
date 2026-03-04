/**
 * Google Apps Script API for Colombia Political Dashboard
 * Partido Cambio Radical
 * 
 * This standalone script reads data from the survey Google Sheet
 * and exposes it via RESTful API endpoints.
 */

// Configuration
const SHEET_ID = '1Sjceg62Q97-Bo8Y51biCBJeglTVvou3fO005GvhUfxY';
const SHEET_NAME = 'ENCUESTA';
const CACHE_DURATION = 300; // 5 minutes in seconds

/**
 * Main entry point for HTTP GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAllData';
    
    // Set CORS headers
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
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
      case 'getMunicipalities':
        const dept = e.parameter.dept;
        result = getMunicipalities(dept);
        break;
      case 'getFiltered':
        const filters = e.parameter.filters ? JSON.parse(e.parameter.filters) : {};
        result = getFilteredData(filters);
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    output.setContent(JSON.stringify(result));
    return output;
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get all survey data from the sheet
 */
function getAllData() {
  const cacheKey = 'allData';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // Skip empty rows
    
    const record = {};
    headers.forEach((header, index) => {
      record[header] = data[i][index];
    });
    records.push(record);
  }
  
  const result = {
    success: true,
    count: records.length,
    data: records
  };
  
  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get aggregated statistics
 */
function getStats() {
  const cacheKey = 'stats';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const allData = getAllData();
  const records = allData.data;
  
  // Count unique departments and municipalities
  const departments = new Set();
  const municipalities = new Set();
  let whatsappUsers = 0;
  const genderCount = { Masculino: 0, Femenino: 0, Otro: 0 };
  const occupations = {};
  const monthlyTrend = {};
  
  records.forEach(record => {
    if (record.DEPARTAMENTO) departments.add(record.DEPARTAMENTO);
    if (record.MUNICIPIO) municipalities.add(record.MUNICIPIO);
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') whatsappUsers++;
    
    // Gender distribution
    if (record.SEXO) {
      genderCount[record.SEXO] = (genderCount[record.SEXO] || 0) + 1;
    }
    
    // Occupation count
    if (record.OCUPACION_NEGOCIO) {
      occupations[record.OCUPACION_NEGOCIO] = (occupations[record.OCUPACION_NEGOCIO] || 0) + 1;
    }
    
    // Monthly trend
    if (record.FECHA_AUTORIZACION) {
      const date = new Date(record.FECHA_AUTORIZACION);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;
    }
  });
  
  // Top 10 occupations
  const topOccupations = Object.entries(occupations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  const result = {
    success: true,
    stats: {
      totalRecords: records.length,
      totalDepartments: departments.size,
      totalMunicipalities: municipalities.size,
      whatsappPercentage: records.length > 0 ? (whatsappUsers / records.length * 100).toFixed(2) : 0,
      genderDistribution: genderCount,
      topOccupations,
      monthlyTrend: Object.entries(monthlyTrend)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count }))
    }
  };
  
  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get data aggregated by department
 */
function getDepartments() {
  const cacheKey = 'departments';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const allData = getAllData();
  const records = allData.data;
  
  const deptData = {};
  
  records.forEach(record => {
    const dept = record.DEPARTAMENTO;
    if (!dept) return;
    
    if (!deptData[dept]) {
      deptData[dept] = {
        name: dept,
        count: 0,
        municipalities: new Set(),
        whatsappUsers: 0,
        genderCount: { Masculino: 0, Femenino: 0, Otro: 0 }
      };
    }
    
    deptData[dept].count++;
    if (record.MUNICIPIO) deptData[dept].municipalities.add(record.MUNICIPIO);
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') deptData[dept].whatsappUsers++;
    if (record.SEXO) deptData[dept].genderCount[record.SEXO]++;
  });
  
  // Convert to array and add percentages
  const departments = Object.values(deptData).map(dept => ({
    name: dept.name,
    count: dept.count,
    municipalityCount: dept.municipalities.size,
    whatsappPercentage: (dept.whatsappUsers / dept.count * 100).toFixed(2),
    genderDistribution: dept.genderCount
  })).sort((a, b) => b.count - a.count);
  
  const result = {
    success: true,
    count: departments.length,
    data: departments
  };
  
  setCachedData(cacheKey, result);
  return result;
}

/**
 * Get municipalities for a specific department
 */
function getMunicipalities(departmentName) {
  const allData = getAllData();
  const records = allData.data;
  
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
        whatsappUsers: 0,
        genderCount: { Masculino: 0, Femenino: 0, Otro: 0 }
      };
    }
    
    munData[key].count++;
    if (record.USA_WHATSAPP === 'Sí' || record.USA_WHATSAPP === 'Si') munData[key].whatsappUsers++;
    if (record.SEXO) munData[key].genderCount[record.SEXO]++;
  });
  
  const municipalities = Object.values(munData).map(mun => ({
    name: mun.name,
    department: mun.department,
    count: mun.count,
    whatsappPercentage: (mun.whatsappUsers / mun.count * 100).toFixed(2),
    genderDistribution: mun.genderCount
  })).sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    department: departmentName || 'all',
    count: municipalities.length,
    data: municipalities
  };
}

/**
 * Get filtered data based on criteria
 */
function getFilteredData(filters) {
  const allData = getAllData();
  let records = allData.data;
  
  // Apply filters
  if (filters.department) {
    records = records.filter(r => r.DEPARTAMENTO === filters.department);
  }
  
  if (filters.municipality) {
    records = records.filter(r => r.MUNICIPIO === filters.municipality);
  }
  
  if (filters.gender) {
    records = records.filter(r => r.SEXO === filters.gender);
  }
  
  if (filters.whatsapp !== undefined) {
    const whatsappValue = filters.whatsapp ? 'Sí' : 'No';
    records = records.filter(r => r.USA_WHATSAPP === whatsappValue || r.USA_WHATSAPP === whatsappValue.replace('í', 'i'));
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

/**
 * Cache helper functions
 */
function getCachedData(key) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  return cached ? JSON.parse(cached) : null;
}

function setCachedData(key, data) {
  const cache = CacheService.getScriptCache();
  cache.put(key, JSON.stringify(data), CACHE_DURATION);
}
