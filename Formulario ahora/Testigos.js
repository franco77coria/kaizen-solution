/**
 * =====================================================
 * FORMULARIO TESTIGOS - MESAS DE VOTACIÓN CUNDINAMARCA
 * Backend - Google Apps Script
 * Partido Liberal de Colombia
 * =====================================================
 */

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

const NOMBRE_HOJA_TESTIGOS = 'TESTIGOS';
const NOMBRE_HOJA_RESULTADOS = 'RESULTADOS';
const NOMBRE_CARPETA_RAIZ = 'FOTOS_TESTIGOS_PL';
const NOMBRE_CARPETA_CAMARA = 'FOTOS_CAMARA';
const NOMBRE_CARPETA_SENADO = 'FOTOS_SENADO';

// ==========================================
// PUNTO DE ENTRADA WEBAPP
// ==========================================

/**
 * Sirve la webapp al ser accedida
 */
function doGet() {
    return HtmlService.createHtmlOutputFromFile('Formulariomesas')
        .setTitle('Testigos PL - Mesas de Votación')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================

/**
 * Inicia sesión buscando al testigo por su cédula.
 * Si es la primera vez, crea las filas en RESULTADOS.
 * @param {string} cedula - Número de cédula del testigo
 * @return {Object} Datos del testigo y sus mesas
 */
function iniciarSesion(cedula) {
    try {
        cedula = String(cedula).trim();

        if (!cedula || cedula === '') {
            return { exito: false, mensaje: 'Por favor ingrese su número de cédula.' };
        }

        // Buscar testigo en la hoja TESTIGOS
        var testigo = buscarTestigo(cedula);

        if (!testigo) {
            return { exito: false, mensaje: 'Cédula no encontrada. Verifique su número de cédula o contacte al coordinador.' };
        }

        // Verificar si ya tiene filas en RESULTADOS
        var filasExistentes = obtenerFilasResultados(cedula);

        if (filasExistentes.length === 0) {
            // Primera vez: crear filas en RESULTADOS
            crearFilasResultados(testigo);
        }

        // Obtener datos actualizados de las mesas
        var datosMesas = obtenerDatosMesas(cedula);

        return {
            exito: true,
            mensaje: 'Bienvenido, ' + testigo.nombre,
            testigo: {
                cedula: testigo.cedula,
                nombre: testigo.nombre,
                telefono: testigo.telefono,
                municipio: testigo.municipio,
                puestoVotacion: testigo.puestoVotacion
            },
            mesas: datosMesas
        };

    } catch (error) {
        Logger.log('Error en iniciarSesion: ' + error.toString());
        return { exito: false, mensaje: 'Error del sistema: ' + error.message };
    }
}

// ==========================================
// FUNCIONES DE LECTURA DE DATOS
// ==========================================

/**
 * Busca un testigo por su cédula en la hoja TESTIGOS
 * @param {string} cedula
 * @return {Object|null} Datos del testigo o null si no existe
 */
function buscarTestigo(cedula) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(NOMBRE_HOJA_TESTIGOS);

    if (!hoja) {
        throw new Error('No se encontró la hoja ' + NOMBRE_HOJA_TESTIGOS);
    }

    var datos = hoja.getDataRange().getValues();
    var encabezados = datos[0];

    // Buscar índices de columnas
    var colCedula = encabezados.indexOf('CEDULA_TESTIGO');
    var colNombre = encabezados.indexOf('NOMBRE_TESTIGO');
    var colTelefono = encabezados.indexOf('TELEFONO_TESTIGO');
    var colMunicipio = encabezados.indexOf('MUNICIPIO');
    var colPuesto = encabezados.indexOf('PUESTO_VOTACION');
    var colMesas = encabezados.indexOf('MESAS');

    for (var i = 1; i < datos.length; i++) {
        var cedulaFila = String(datos[i][colCedula]).trim();
        if (cedulaFila === cedula) {
            return {
                cedula: cedulaFila,
                nombre: String(datos[i][colNombre]).trim(),
                telefono: String(datos[i][colTelefono]).trim(),
                municipio: String(datos[i][colMunicipio]).trim(),
                puestoVotacion: String(datos[i][colPuesto]).trim(),
                mesas: String(datos[i][colMesas]).trim()
            };
        }
    }

    return null;
}

/**
 * Obtiene las filas existentes en RESULTADOS para una cédula
 * @param {string} cedula
 * @return {Array} Array de filas encontradas
 */
function obtenerFilasResultados(cedula) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(NOMBRE_HOJA_RESULTADOS);

    if (!hoja) {
        throw new Error('No se encontró la hoja ' + NOMBRE_HOJA_RESULTADOS);
    }

    var datos = hoja.getDataRange().getValues();
    var encabezados = datos[0];
    var colCedula = encabezados.indexOf('CEDULA_TESTIGO');

    var filas = [];
    for (var i = 1; i < datos.length; i++) {
        if (String(datos[i][colCedula]).trim() === cedula) {
            filas.push({ fila: i + 1, datos: datos[i] });
        }
    }

    return filas;
}

/**
 * Obtiene los datos completos de las mesas para el dashboard
 * @param {string} cedula
 * @return {Array} Array de objetos con datos de cada mesa
 */
function obtenerDatosMesas(cedula) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(NOMBRE_HOJA_RESULTADOS);
    var datos = hoja.getDataRange().getValues();
    var encabezados = datos[0];

    var colCedula = encabezados.indexOf('CEDULA_TESTIGO');
    var colMesa = encabezados.indexOf('MESA');
    var colCantidadVotantes = encabezados.indexOf('CANTIDAD_VOTATES_MESA');
    var colVotantes10 = encabezados.indexOf('VOTANTES_10AM');
    var colVotantes1 = encabezados.indexOf('VOTANTES_1PM');
    var colVotosAlexP = encabezados.indexOf('VOTOS_ALEX_P');
    var colVotosCamaraCun = encabezados.indexOf('VOTOS_CAMARA_CUN_PL');
    var colVotosOscarSenado = encabezados.indexOf('VOTOS_OSCAR_SACHEZ_SENADO');
    var colVotosSenadoPL = encabezados.indexOf('VOTOS_SENADO_PL');
    var colFotoCamara = encabezados.indexOf('FOTO_CAMARA');
    var colFotoSenado = encabezados.indexOf('FOTO_SENADO');

    var mesas = [];

    for (var i = 1; i < datos.length; i++) {
        if (String(datos[i][colCedula]).trim() === cedula) {
            var mesa = {
                filaSheet: i + 1,
                mesa: String(datos[i][colMesa]).trim(),
                cantidadVotantesMesa: datos[i][colCantidadVotantes] || '',
                votantes10am: datos[i][colVotantes10] || '',
                votantes1pm: datos[i][colVotantes1] || '',
                votosAlexP: datos[i][colVotosAlexP] || '',
                votosCamaraCunPL: datos[i][colVotosCamaraCun] || '',
                votosOscarSanchezSenado: datos[i][colVotosOscarSenado] || '',
                votosSenadoPL: datos[i][colVotosSenadoPL] || '',
                fotoCamara: datos[i][colFotoCamara] || '',
                fotoSenado: datos[i][colFotoSenado] || ''
            };

            // Calcular estado de la mesa
            mesa.estado = calcularEstadoMesa(mesa);
            mesas.push(mesa);
        }
    }

    // Ordenar por número de mesa
    mesas.sort(function (a, b) {
        return parseInt(a.mesa) - parseInt(b.mesa);
    });

    return mesas;
}

/**
 * Calcula el estado de completitud de una mesa
 * @param {Object} mesa
 * @return {string} 'pendiente', 'en_progreso', 'completada'
 */
function calcularEstadoMesa(mesa) {
    var camposRequeridos = [
        mesa.cantidadVotantesMesa,
        mesa.votantes10am,
        mesa.votantes1pm,
        mesa.votosAlexP,
        mesa.votosCamaraCunPL,
        mesa.votosOscarSanchezSenado,
        mesa.votosSenadoPL
    ];

    var camposLlenos = 0;
    for (var i = 0; i < camposRequeridos.length; i++) {
        if (camposRequeridos[i] !== '' && camposRequeridos[i] !== null && camposRequeridos[i] !== undefined) {
            camposLlenos++;
        }
    }

    if (camposLlenos === 0) return 'pendiente';
    if (camposLlenos === camposRequeridos.length && mesa.fotoCamara && mesa.fotoSenado) return 'completada';
    return 'en_progreso';
}

// ==========================================
// FUNCIONES DE ESCRITURA DE DATOS
// ==========================================

/**
 * Crea las filas individuales en RESULTADOS para cada mesa del testigo
 * @param {Object} testigo - Datos del testigo
 */
function crearFilasResultados(testigo) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName(NOMBRE_HOJA_RESULTADOS);

    if (!hoja) {
        throw new Error('No se encontró la hoja ' + NOMBRE_HOJA_RESULTADOS);
    }

    // Separar mesas por comas
    var mesas = testigo.mesas.split(',');

    for (var i = 0; i < mesas.length; i++) {
        var numMesa = mesas[i].trim();
        if (numMesa === '') continue;

        // Agregar fila: CEDULA, NOMBRE, TELEFONO, MUNICIPIO, PUESTO, MESA, y campos vacíos para el resto
        var nuevaFila = [
            testigo.cedula,
            testigo.nombre,
            testigo.telefono,
            testigo.municipio,
            testigo.puestoVotacion,
            numMesa,
            '', // CANTIDAD_VOTATES_MESA
            '', // VOTANTES_10AM
            '', // VOTANTES_1PM
            '', // VOTOS_ALEX_P
            '', // VOTOS_CAMARA_CUN_PL
            '', // VOTOS_OSCAR_SACHEZ_SENADO
            '', // VOTOS_SENADO_PL
            '', // FOTO_CAMARA
            ''  // FOTO_SENADO
        ];

        hoja.appendRow(nuevaFila);
    }

    SpreadsheetApp.flush();
}

/**
 * Guarda los datos de una mesa específica en RESULTADOS
 * @param {Object} datos - Objeto con cedula, mesa y campos a guardar
 * @return {Object} Resultado de la operación
 */
function guardarDatosMesa(datos) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var hoja = ss.getSheetByName(NOMBRE_HOJA_RESULTADOS);
        var datosHoja = hoja.getDataRange().getValues();
        var encabezados = datosHoja[0];

        var colCedula = encabezados.indexOf('CEDULA_TESTIGO');
        var colMesa = encabezados.indexOf('MESA');
        var colCantidadVotantes = encabezados.indexOf('CANTIDAD_VOTATES_MESA');
        var colVotantes10 = encabezados.indexOf('VOTANTES_10AM');
        var colVotantes1 = encabezados.indexOf('VOTANTES_1PM');
        var colVotosAlexP = encabezados.indexOf('VOTOS_ALEX_P');
        var colVotosCamaraCun = encabezados.indexOf('VOTOS_CAMARA_CUN_PL');
        var colVotosOscarSenado = encabezados.indexOf('VOTOS_OSCAR_SACHEZ_SENADO');
        var colVotosSenadoPL = encabezados.indexOf('VOTOS_SENADO_PL');
        var colFotoCamara = encabezados.indexOf('FOTO_CAMARA');
        var colFotoSenado = encabezados.indexOf('FOTO_SENADO');

        // Buscar la fila correspondiente
        var filaEncontrada = -1;
        for (var i = 1; i < datosHoja.length; i++) {
            if (String(datosHoja[i][colCedula]).trim() === String(datos.cedula).trim() &&
                String(datosHoja[i][colMesa]).trim() === String(datos.mesa).trim()) {
                filaEncontrada = i + 1; // +1 por indexación de Sheets
                break;
            }
        }

        if (filaEncontrada === -1) {
            return { exito: false, mensaje: 'No se encontró la mesa ' + datos.mesa + ' para esta cédula.' };
        }

        // Actualizar campos numéricos
        if (datos.cantidadVotantesMesa !== undefined) {
            hoja.getRange(filaEncontrada, colCantidadVotantes + 1).setValue(datos.cantidadVotantesMesa);
        }
        if (datos.votantes10am !== undefined) {
            hoja.getRange(filaEncontrada, colVotantes10 + 1).setValue(datos.votantes10am);
        }
        if (datos.votantes1pm !== undefined) {
            hoja.getRange(filaEncontrada, colVotantes1 + 1).setValue(datos.votantes1pm);
        }
        if (datos.votosAlexP !== undefined) {
            hoja.getRange(filaEncontrada, colVotosAlexP + 1).setValue(datos.votosAlexP);
        }
        if (datos.votosCamaraCunPL !== undefined) {
            hoja.getRange(filaEncontrada, colVotosCamaraCun + 1).setValue(datos.votosCamaraCunPL);
        }
        if (datos.votosOscarSanchezSenado !== undefined) {
            hoja.getRange(filaEncontrada, colVotosOscarSenado + 1).setValue(datos.votosOscarSanchezSenado);
        }
        if (datos.votosSenadoPL !== undefined) {
            hoja.getRange(filaEncontrada, colVotosSenadoPL + 1).setValue(datos.votosSenadoPL);
        }
        if (datos.fotoCamara !== undefined) {
            hoja.getRange(filaEncontrada, colFotoCamara + 1).setValue(datos.fotoCamara);
        }
        if (datos.fotoSenado !== undefined) {
            hoja.getRange(filaEncontrada, colFotoSenado + 1).setValue(datos.fotoSenado);
        }

        SpreadsheetApp.flush();

        return { exito: true, mensaje: 'Datos de la Mesa ' + datos.mesa + ' guardados correctamente.' };

    } catch (error) {
        Logger.log('Error en guardarDatosMesa: ' + error.toString());
        return { exito: false, mensaje: 'Error al guardar: ' + error.message };
    }
}

// ==========================================
// FUNCIONES DE MANEJO DE FOTOS
// ==========================================

/**
 * Obtiene o crea la carpeta raíz para fotos
 * @return {Folder} Carpeta raíz de fotos
 */
function obtenerCarpetaRaiz() {
    var carpetas = DriveApp.getFoldersByName(NOMBRE_CARPETA_RAIZ);
    if (carpetas.hasNext()) {
        return carpetas.next();
    }
    return DriveApp.createFolder(NOMBRE_CARPETA_RAIZ);
}

/**
 * Obtiene o crea una subcarpeta dentro de la carpeta raíz
 * @param {string} nombreSubcarpeta
 * @return {Folder} Subcarpeta
 */
function obtenerSubcarpeta(nombreSubcarpeta) {
    var carpetaRaiz = obtenerCarpetaRaiz();
    var subcarpetas = carpetaRaiz.getFoldersByName(nombreSubcarpeta);
    if (subcarpetas.hasNext()) {
        return subcarpetas.next();
    }
    return carpetaRaiz.createFolder(nombreSubcarpeta);
}

/**
 * Sube una foto a Google Drive
 * @param {string} datosBase64 - Datos de la imagen en base64
 * @param {string} tipo - 'camara' o 'senado'
 * @param {string} cedula - Cédula del testigo
 * @param {string} mesa - Número de mesa
 * @return {Object} URL de la imagen subida
 */
function subirFotoADrive(datosBase64, tipo, cedula, mesa) {
    try {
        // Determinar la carpeta destino
        var nombreCarpeta = tipo === 'camara' ? NOMBRE_CARPETA_CAMARA : NOMBRE_CARPETA_SENADO;
        var carpeta = obtenerSubcarpeta(nombreCarpeta);

        // Crear nombre del archivo
        var timestamp = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyyMMdd_HHmmss');
        var nombreArchivo = tipo.toUpperCase() + '_CC' + cedula + '_Mesa' + mesa + '_' + timestamp + '.jpg';

        // Decodificar base64
        var datosLimpios = datosBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        var blob = Utilities.newBlob(Utilities.base64Decode(datosLimpios), 'image/jpeg', nombreArchivo);

        // Subir archivo
        var archivo = carpeta.createFile(blob);
        archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        var urlArchivo = archivo.getUrl();

        // Guardar la URL en la hoja de RESULTADOS
        var datosMesa = {
            cedula: cedula,
            mesa: mesa
        };

        if (tipo === 'camara') {
            datosMesa.fotoCamara = urlArchivo;
        } else {
            datosMesa.fotoSenado = urlArchivo;
        }

        guardarDatosMesa(datosMesa);

        return { exito: true, url: urlArchivo, mensaje: 'Foto subida correctamente.' };

    } catch (error) {
        Logger.log('Error en subirFotoADrive: ' + error.toString());
        return { exito: false, mensaje: 'Error al subir la foto: ' + error.message };
    }
}

// ==========================================
// FUNCIONES DE ACTUALIZACIÓN EN TIEMPO REAL
// ==========================================

/**
 * Refresca los datos de las mesas para el dashboard
 * (llamada periódica desde el frontend)
 * @param {string} cedula
 * @return {Object} Datos actualizados
 */
function refrescarDashboard(cedula) {
    try {
        var mesas = obtenerDatosMesas(cedula);
        return { exito: true, mesas: mesas };
    } catch (error) {
        Logger.log('Error en refrescarDashboard: ' + error.toString());
        return { exito: false, mensaje: 'Error al refrescar: ' + error.message };
    }
}
