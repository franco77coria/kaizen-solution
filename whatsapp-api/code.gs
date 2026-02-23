// ============================================
// WHATSAPP DASHBOARD - Google Apps Script
// Backend: Webhook + API de envío + CRUD
// ============================================

// ── CONFIGURACIÓN ──
const CONFIG = {
  PHONE_NUMBER_ID: "993298277197048",
  API_VERSION: "v22.0",
  // El VERIFY_TOKEN lo ponés en Script Properties con clave "VERIFY_TOKEN"
  // El WHATSAPP_TOKEN lo ponés en Script Properties con clave "WHATSAPP_TOKEN"
  // El SPREADSHEET_ID lo ponés en Script Properties con clave "SPREADSHEET_ID"
};

// ── Helpers para Script Properties ──
function getToken() {
  return PropertiesService.getScriptProperties().getProperty("WHATSAPP_TOKEN");
}

function getVerifyToken() {
  return PropertiesService.getScriptProperties().getProperty("VERIFY_TOKEN") || "kaizen_whatsapp_2026";
}

function getSpreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
}

function getSpreadsheet() {
  const id = getSpreadsheetId();
  if (!id) {
    // Si no hay ID, crear uno nuevo y guardar el ID
    const ss = SpreadsheetApp.create("WhatsApp Dashboard - Kaizen");
    PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
    inicializarHojas(ss);
    return ss;
  }
  const ss = SpreadsheetApp.openById(id);
  return ss;
}

// ── Inicializar hojas si no existen ──
function inicializarHojas(ss) {
  // Hoja de Mensajes Recibidos
  let hRecibidos = ss.getSheetByName("Recibidos");
  if (!hRecibidos) {
    hRecibidos = ss.insertSheet("Recibidos");
    hRecibidos.appendRow(["ID", "Timestamp", "De", "Nombre", "Tipo", "Contenido", "MessageID", "Leido"]);
    hRecibidos.getRange("1:1").setFontWeight("bold");
  }

  // Hoja de Mensajes Enviados
  let hEnviados = ss.getSheetByName("Enviados");
  if (!hEnviados) {
    hEnviados = ss.insertSheet("Enviados");
    hEnviados.appendRow(["ID", "Timestamp", "Para", "Tipo", "Contenido", "Template", "MessageID", "Estado"]);
    hEnviados.getRange("1:1").setFontWeight("bold");
  }

  // Hoja de Contactos
  let hContactos = ss.getSheetByName("Contactos");
  if (!hContactos) {
    hContactos = ss.insertSheet("Contactos");
    hContactos.appendRow(["Telefono", "Nombre", "PrimerContacto", "UltimoMensaje", "TotalMensajes", "Notas"]);
    hContactos.getRange("1:1").setFontWeight("bold");
  }

  // Hoja de Webhook Log (para debugging)
  let hLog = ss.getSheetByName("WebhookLog");
  if (!hLog) {
    hLog = ss.insertSheet("WebhookLog");
    hLog.appendRow(["Timestamp", "Tipo", "Payload"]);
    hLog.getRange("1:1").setFontWeight("bold");
  }

  // Borrar la Sheet1 por defecto si existe y no es necesaria
  const sheet1 = ss.getSheetByName("Sheet1") || ss.getSheetByName("Hoja 1");
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }
}

// ============================================
// doGet - Sirve el Dashboard HTML
// ============================================
function doGet(e) {
  // Verificación de webhook de Meta (GET con hub.mode=subscribe)
  if (e && e.parameter && e.parameter["hub.mode"] === "subscribe") {
    const mode = e.parameter["hub.mode"];
    const token = e.parameter["hub.verify_token"];
    const challenge = e.parameter["hub.challenge"];

    if (mode === "subscribe" && token === getVerifyToken()) {
      Logger.log("✅ Webhook verificado correctamente");
      return ContentService.createTextOutput(challenge);
    } else {
      Logger.log("❌ Verificación de webhook fallida");
      return ContentService.createTextOutput("Forbidden").setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Si no es verificación, servir el dashboard
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Kaizen WA - Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================
// doPost - Webhook para recibir mensajes
// ============================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Loguear el payload completo para debugging
    logWebhook("POST", JSON.stringify(body));

    // Verificar que es una notificación de WhatsApp
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value || {};

          // Procesar mensajes entrantes
          if (value.messages) {
            for (const message of value.messages) {
              procesarMensajeEntrante(message, value.contacts);
            }
          }

          // Procesar actualizaciones de estado (enviado, entregado, leído)
          if (value.statuses) {
            for (const status of value.statuses) {
              procesarEstado(status);
            }
          }
        }
      }
    }

    // Meta espera un 200 OK
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("❌ Error en doPost: " + error.toString());
    logWebhook("ERROR", error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// PROCESAR MENSAJE ENTRANTE
// ============================================
function procesarMensajeEntrante(message, contacts) {
  const ss = getSpreadsheet();
  const hRecibidos = ss.getSheetByName("Recibidos");
  const hContactos = ss.getSheetByName("Contactos");

  const timestamp = new Date();
  const from = message.from || "";
  const contactInfo = (contacts && contacts.length > 0) ? contacts[0] : {};
  const nombre = contactInfo.profile ? contactInfo.profile.name : from;
  const tipo = message.type || "text";
  let contenido = "";

  // Extraer contenido según tipo
  switch (tipo) {
    case "text":
      contenido = message.text ? message.text.body : "";
      break;
    case "image":
      contenido = "[Imagen] " + (message.image.caption || "Sin descripción");
      break;
    case "video":
      contenido = "[Video] " + (message.video.caption || "Sin descripción");
      break;
    case "audio":
      contenido = "[Audio]";
      break;
    case "document":
      contenido = "[Documento] " + (message.document.filename || "");
      break;
    case "location":
      contenido = "[Ubicación] " + message.location.latitude + ", " + message.location.longitude;
      break;
    case "sticker":
      contenido = "[Sticker]";
      break;
    case "reaction":
      contenido = "[Reacción] " + (message.reaction.emoji || "");
      break;
    case "button":
      contenido = "[Botón] " + (message.button.text || "");
      break;
    case "interactive":
      contenido = "[Interactivo] " + JSON.stringify(message.interactive);
      break;
    default:
      contenido = "[" + tipo + "]";
  }

  const messageId = message.id || "";
  const id = Utilities.getUuid();

  // Guardar en hoja de recibidos
  hRecibidos.appendRow([id, timestamp, from, nombre, tipo, contenido, messageId, "no"]);

  // Actualizar o crear contacto
  actualizarContacto(hContactos, from, nombre, timestamp);

  Logger.log("📩 Mensaje recibido de " + nombre + " (" + from + "): " + contenido);
}

// ============================================
// PROCESAR ESTADO DE MENSAJE  
// ============================================
function procesarEstado(status) {
  const ss = getSpreadsheet();
  const hEnviados = ss.getSheetByName("Enviados");

  const messageId = status.id;
  const estadoNuevo = status.status; // sent, delivered, read, failed

  // Buscar el mensaje en la hoja de enviados por MessageID
  const data = hEnviados.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === messageId) { // Columna G = MessageID
      hEnviados.getRange(i + 1, 8).setValue(estadoNuevo); // Columna H = Estado
      Logger.log("📊 Estado actualizado: " + messageId + " → " + estadoNuevo);
      break;
    }
  }

  logWebhook("STATUS", messageId + " → " + estadoNuevo);
}

// ============================================
// ACTUALIZAR CONTACTO
// ============================================
function actualizarContacto(hContactos, telefono, nombre, timestamp) {
  const data = hContactos.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === telefono) {
      // Actualizar contacto existente
      hContactos.getRange(i + 1, 2).setValue(nombre); // Nombre
      hContactos.getRange(i + 1, 4).setValue(timestamp); // UltimoMensaje
      hContactos.getRange(i + 1, 5).setValue((data[i][4] || 0) + 1); // TotalMensajes
      return;
    }
  }

  // Crear nuevo contacto
  hContactos.appendRow([telefono, nombre, timestamp, timestamp, 1, ""]);
}

// ============================================
// LOG DE WEBHOOK
// ============================================
function logWebhook(tipo, payload) {
  try {
    const ss = getSpreadsheet();
    const hLog = ss.getSheetByName("WebhookLog");
    if (hLog) {
      hLog.appendRow([new Date(), tipo, payload]);
      // Limitar a 500 filas para no llenar la hoja
      const lastRow = hLog.getLastRow();
      if (lastRow > 500) {
        hLog.deleteRows(2, lastRow - 500);
      }
    }
  } catch (e) {
    Logger.log("Error logWebhook: " + e);
  }
}

// ============================================
// API: ENVIAR MENSAJE (Template)
// ============================================
function enviarTemplate(numero, templateName, languageCode, components) {
  const TOKEN = getToken();
  if (!TOKEN) return { success: false, error: "Token no configurado" };

  const url = "https://graph.facebook.com/" + CONFIG.API_VERSION + "/" + CONFIG.PHONE_NUMBER_ID + "/messages";

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: numero,
    type: "template",
    template: {
      name: templateName || "hello_world",
      language: { code: languageCode || "en_US" }
    }
  };

  // Si hay componentes (parámetros del template)
  if (components) {
    payload.template.components = components;
  }

  return ejecutarEnvio(url, payload, TOKEN, numero, "template", "", templateName);
}

// ============================================
// API: ENVIAR MENSAJE (Texto Libre)
// ============================================
function enviarTextoLibre(numero, mensaje) {
  const TOKEN = getToken();
  if (!TOKEN) return { success: false, error: "Token no configurado" };

  const url = "https://graph.facebook.com/" + CONFIG.API_VERSION + "/" + CONFIG.PHONE_NUMBER_ID + "/messages";

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: numero,
    type: "text",
    text: {
      preview_url: false,
      body: mensaje
    }
  };

  return ejecutarEnvio(url, payload, TOKEN, numero, "text", mensaje, "");
}

// ============================================
// EJECUTAR ENVIO HTTP
// ============================================
function ejecutarEnvio(url, payload, token, numero, tipo, contenido, template) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const body = JSON.parse(response.getContentText());

    if (code === 200) {
      const messageId = (body.messages && body.messages[0]) ? body.messages[0].id : "";

      // Guardar en hoja de enviados
      const ss = getSpreadsheet();
      const hEnviados = ss.getSheetByName("Enviados");
      hEnviados.appendRow([
        Utilities.getUuid(),
        new Date(),
        numero,
        tipo,
        contenido || ("[Template: " + template + "]"),
        template,
        messageId,
        "sent"
      ]);

      Logger.log("✅ Mensaje enviado a " + numero);
      return { success: true, messageId: messageId, data: body };
    } else {
      const err = body.error || {};
      Logger.log("❌ Error: " + JSON.stringify(err));
      return { success: false, error: err, code: code };
    }
  } catch (e) {
    Logger.log("❌ Error de conexión: " + e);
    return { success: false, error: e.toString() };
  }
}

// ============================================
// API PARA EL FRONTEND (google.script.run)
// ============================================

/** Obtener todos los datos del dashboard */
function getDashboardData() {
  const ss = getSpreadsheet();

  const recibidos = getSheetData(ss, "Recibidos");
  const enviados = getSheetData(ss, "Enviados");
  const contactos = getSheetData(ss, "Contactos");

  // Calcular estadísticas
  const totalRecibidos = recibidos.length;
  const totalEnviados = enviados.length;
  const totalContactos = contactos.length;

  // Mensajes de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const recibidosHoy = recibidos.filter(m => new Date(m.Timestamp) >= hoy).length;
  const enviadosHoy = enviados.filter(m => new Date(m.Timestamp) >= hoy).length;

  // Tasa de respuesta (mensajes respondidos / mensajes recibidos)
  const tasaRespuesta = totalRecibidos > 0 ? Math.round((totalEnviados / totalRecibidos) * 100) : 0;

  // No leídos
  const noLeidos = recibidos.filter(m => m.Leido === "no").length;

  return {
    stats: {
      totalRecibidos,
      totalEnviados,
      totalContactos,
      tasaRespuesta: Math.min(tasaRespuesta, 100),
      recibidosHoy,
      enviadosHoy,
      noLeidos
    },
    recibidos: recibidos.slice(-100).reverse(), // Últimos 100, más recientes primero
    enviados: enviados.slice(-100).reverse(),
    contactos: contactos
  };
}

/** Obtener mensajes recibidos */
function getMensajesRecibidos() {
  const ss = getSpreadsheet();
  return getSheetData(ss, "Recibidos").reverse();
}

/** Obtener mensajes enviados */
function getMensajesEnviados() {
  const ss = getSpreadsheet();
  return getSheetData(ss, "Enviados").reverse();
}

/** Obtener contactos */
function getContactos() {
  const ss = getSpreadsheet();
  return getSheetData(ss, "Contactos");
}

/** Marcar mensaje como leído */
function marcarLeido(messageId) {
  const ss = getSpreadsheet();
  const hRecibidos = ss.getSheetByName("Recibidos");
  const data = hRecibidos.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === messageId) { // Columna A = ID
      hRecibidos.getRange(i + 1, 8).setValue("si"); // Columna H = Leido
      return { success: true };
    }
  }
  return { success: false, error: "Mensaje no encontrado" };
}

/** Enviar mensaje desde el frontend */
function enviarMensajeDesdeFrontend(datos) {
  if (datos.tipo === "template") {
    return enviarTemplate(datos.numero, datos.template, datos.idioma || "en_US");
  } else {
    return enviarTextoLibre(datos.numero, datos.mensaje);
  }
}

/** Actualizar notas de un contacto */
function actualizarNotasContacto(telefono, notas) {
  const ss = getSpreadsheet();
  const hContactos = ss.getSheetByName("Contactos");
  const data = hContactos.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === telefono) {
      hContactos.getRange(i + 1, 6).setValue(notas);
      return { success: true };
    }
  }
  return { success: false, error: "Contacto no encontrado" };
}

/** Eliminar un contacto */
function eliminarContacto(telefono) {
  const ss = getSpreadsheet();
  const hContactos = ss.getSheetByName("Contactos");
  const data = hContactos.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === telefono) {
      hContactos.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Contacto no encontrado" };
}

/** Obtener historial de conversación con un número */
function getConversacion(telefono) {
  const ss = getSpreadsheet();
  const recibidos = getSheetData(ss, "Recibidos").filter(m => m.De === telefono);
  const enviados = getSheetData(ss, "Enviados").filter(m => m.Para === telefono);

  // Combinar y ordenar por fecha
  const conversacion = [];

  recibidos.forEach(m => {
    conversacion.push({
      tipo: "recibido",
      timestamp: m.Timestamp,
      contenido: m.Contenido,
      tipoMsg: m.Tipo,
      nombre: m.Nombre,
      id: m.ID
    });
  });

  enviados.forEach(m => {
    conversacion.push({
      tipo: "enviado",
      timestamp: m.Timestamp,
      contenido: m.Contenido,
      tipoMsg: m.Tipo,
      estado: m.Estado,
      id: m.ID
    });
  });

  conversacion.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return conversacion;
}

/** Obtener webhook logs */
function getWebhookLogs() {
  const ss = getSpreadsheet();
  return getSheetData(ss, "WebhookLog").reverse().slice(0, 50);
}

// ============================================
// UTILIDADES
// ============================================
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  return rows;
}

/** Setup inicial - ejecutar una vez */
function setup() {
  const ss = getSpreadsheet();
  inicializarHojas(ss);
  Logger.log("✅ Setup completado");
  Logger.log("📋 Spreadsheet ID: " + ss.getId());
  Logger.log("🔗 Spreadsheet URL: " + ss.getUrl());
  Logger.log("");
  Logger.log("📌 PRÓXIMOS PASOS:");
  Logger.log("1. Configurá WHATSAPP_TOKEN en Script Properties");
  Logger.log("2. Configurá VERIFY_TOKEN en Script Properties");
  Logger.log("3. Configurá WABA_ID en Script Properties (WhatsApp Business Account ID)");
  Logger.log("4. Desplegá como Web App (Implementar → Nueva implementación → Aplicación web)");
  Logger.log("5. Usá la URL de la Web App como webhook en Meta for Developers");
  Logger.log("6. Usá el VERIFY_TOKEN que configuraste como 'Identificador de verificación'");
}

// ============================================
// OBTENER TEMPLATES DE META
// ============================================
/** Trae todos los templates de la cuenta de WhatsApp Business */
function getTemplatesDeMeta() {
  const TOKEN = getToken();
  if (!TOKEN) return { success: false, error: "Token no configurado", templates: [] };

  // WABA_ID se configura en Script Properties
  const WABA_ID = PropertiesService.getScriptProperties().getProperty("WABA_ID");
  if (!WABA_ID) return { success: false, error: "WABA_ID no configurado en Script Properties", templates: [] };

  const url = "https://graph.facebook.com/" + CONFIG.API_VERSION + "/" + WABA_ID + "/message_templates?limit=100";

  const options = {
    method: "get",
    headers: { "Authorization": "Bearer " + TOKEN },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const body = JSON.parse(response.getContentText());

    if (code === 200) {
      const templates = (body.data || []).map(t => ({
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        components: t.components || []
      }));
      // Solo devolver los aprobados
      const aprobados = templates.filter(t => t.status === "APPROVED");
      return { success: true, templates: aprobados };
    } else {
      Logger.log("❌ Error templates: " + JSON.stringify(body));
      return { success: false, error: body.error || "Error desconocido", templates: [] };
    }
  } catch (e) {
    Logger.log("❌ Error: " + e);
    return { success: false, error: e.toString(), templates: [] };
  }
}

// ============================================
// CONTACTOS CON VENTANA DE 24H ABIERTA
// ============================================
/** 
 * Devuelve los contactos que nos escribieron en las últimas 24h.
 * A estos se les puede enviar texto libre.
 */
function getContactosConVentana() {
  const ss = getSpreadsheet();
  const recibidos = getSheetData(ss, "Recibidos");
  
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  
  // Filtrar mensajes recibidos en las últimas 24h
  const recientes = recibidos.filter(m => new Date(m.Timestamp) >= hace24h);
  
  // Agrupar por teléfono (contactos únicos con ventana abierta)
  const contactosMap = {};
  recientes.forEach(m => {
    if (!contactosMap[m.De]) {
      contactosMap[m.De] = {
        telefono: m.De,
        nombre: m.Nombre || m.De,
        ultimoMensaje: m.Contenido,
        timestamp: m.Timestamp,
        ventanaHasta: new Date(new Date(m.Timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    } else {
      // Actualizar con el mensaje más reciente
      if (new Date(m.Timestamp) > new Date(contactosMap[m.De].timestamp)) {
        contactosMap[m.De].ultimoMensaje = m.Contenido;
        contactosMap[m.De].timestamp = m.Timestamp;
        contactosMap[m.De].nombre = m.Nombre || contactosMap[m.De].nombre;
        contactosMap[m.De].ventanaHasta = new Date(new Date(m.Timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString();
      }
    }
  });

  return Object.values(contactosMap);
}
