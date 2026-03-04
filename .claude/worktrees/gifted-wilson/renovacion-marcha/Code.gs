/**
 * Renovación en Marcha - Web App Backend
 */

const CONFIG = {
  // ID of the spreadsheet provided by the user
  SPREADSHEET_ID: '14xAkaCyKbAk9I-363G7Tic7cv9_GV2DOVbZ9alKL-yw', 
  SHEET_NAME: 'consolidado',
  // Column indices (0-based)
  COLS: {
    SECTOR: 3, // Column D
    SECRETARIA: 4 // Column E
  }
};

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Renovación en Marcha - Gestión Social')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches all data from the 'consolidado' sheet
 */
function getData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`La hoja "${CONFIG.SHEET_NAME}" no fue encontrada.`);
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getDisplayValues();
  
  // Assuming first row is headers
  if (values.length < 2) return { headers: [], data: [] };

  const headers = values[0];
  const data = values.slice(1).map((row, index) => {
    // Map row to object for easier handling in frontend if needed
    // or just return arrays. Let's return objects based on headers + generic checks
    return {
      rowId: index + 2, // 1-based row index in sheet (header is 1)
      values: row
    };
  });

  return {
    headers: headers,
    data: data
  };
}

/**
 * Gets unique options for dropdowns from existing data
 */
function getDropdownOptions() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) return { sectores: [], secretarias: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { sectores: [], secretarias: [] };

  // Get only the relevant columns to optimize
  // Col D (4) and E (5) -> Range row 2, col 4, numRows, 2 columns
  const range = sheet.getRange(2, 4, lastRow - 1, 2);
  const values = range.getValues();

  const sectores = new Set();
  const secretarias = new Set();

  values.forEach(row => {
    if (row[0]) sectores.add(String(row[0]).trim());
    if (row[1]) secretarias.add(String(row[1]).trim());
  });

  return {
    sectores: Array.from(sectores).sort(),
    secretarias: Array.from(secretarias).sort()
  };
}

/**
 * Saves a new record to the sheet
 * @param {Object} formData
 */
function saveData(formData) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) throw new Error('Hoja no encontrada');

  // We simply append a row. 
  // We need to match the columns. 
  // ASUMPTION: Client sends an array of values in order or an object mapped to headers.
  // To be safe and flexible, let's assume the client sends an order mapping or we append blindly if generic.
  // BETTER: Client sends object { "HeaderName": "Value" } and we map it to current headers.
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
    // Find value in formData matching header (case insensitive loose match)
    // or specific key mapping if hardcoded. 
    // Let's assume the form sends keys that match the headers roughly.
    const key = Object.keys(formData).find(k => k.toLowerCase() === header.toString().toLowerCase());
    return key ? formData[key] : '';
  });

  // Basic timestamp if not present and there's a Timestamp header? 
  // Or simply append what we have.
  // Let's enforce the specific columns for Sector and Secretaria
  
  sheet.appendRow(newRow);
  
  return { success: true };
}
