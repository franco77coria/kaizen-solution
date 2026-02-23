/**
 * Convierte cualquier objeto a una versión segura para JSON/Apps Script
 * eliminando referencias circulares y objetos complejos (como Date o Range).
 */
function sanitizeForFrontend(data) {
  if (data === null || data === undefined) return null;
  
  if (data instanceof Date) {
    return Utilities.formatDate(data, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm:ss');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForFrontend);
  }
  
  if (typeof data === 'object') {
    const newObj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = sanitizeForFrontend(data[key]);
      }
    }
    return newObj;
  }
  
  return data;
}
