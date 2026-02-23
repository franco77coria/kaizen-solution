/**
 * Sistema de Gestión Taller Muñoz
 * Frontend Application
 * @author Franco Coria
 * @version 2.0.0
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
    // URL del Google Apps Script desplegado como Web App
    // Reemplazar con tu URL real después del deploy
    API_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec',

    // Sheet ID para referencia
    SHEET_ID: '1eAkdprOYBCJLs1APEyNUydMAJsQ5MioN0mNbqDF3fyI',

    // Cache duration in milliseconds
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos

    // Modo demo (usa datos locales si no hay API)
    DEMO_MODE: true
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

let appState = {
    workOrders: [],
    budgets: [],
    vehicles: [],
    stats: null,
    currentOrder: null,
    isLoading: false,
    isConnected: false,
    lastUpdate: null
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Setup date display
    updateDateDisplay();
    setInterval(updateDateDisplay, 60000);

    // Setup navigation
    setupNavigation();

    // Setup event listeners
    setupEventListeners();

    // Load data
    await loadAllData();

    // Hide loading overlay
    hideLoading();
}

function updateDateDisplay() {
    const dateEl = document.getElementById('dateDisplay');
    if (dateEl) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        dateEl.textContent = now.toLocaleDateString('es-AR', options);
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const btnLinks = document.querySelectorAll('.btn-link[data-section]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateTo(section);
        });
    });

    btnLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateTo(section);
        });
    });
}

function navigateTo(section) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function setupEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await loadAllData();
            refreshBtn.classList.remove('fa-spin');
            showToast('Datos actualizados', 'success');
        });
    }

    // Global search
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', debounce(handleGlobalSearch, 300));
    }

    // Filter inputs
    const filterEstado = document.getElementById('filterEstado');
    const filterBuscar = document.getElementById('filterBuscar');

    if (filterEstado) {
        filterEstado.addEventListener('change', filterOrders);
    }
    if (filterBuscar) {
        filterBuscar.addEventListener('input', debounce(filterOrders, 300));
    }

    // Vehicle filter
    const filterVehiculo = document.getElementById('filterVehiculo');
    if (filterVehiculo) {
        filterVehiculo.addEventListener('input', debounce(filterVehicles, 300));
    }

    // Form submission
    const nuevaOrdenForm = document.getElementById('nuevaOrdenForm');
    if (nuevaOrdenForm) {
        nuevaOrdenForm.addEventListener('submit', handleNewOrder);
    }

    // Set default date
    const fechaEntrada = document.getElementById('inputFechaEntrada');
    if (fechaEntrada) {
        fechaEntrada.valueAsDate = new Date();
    }
}

// ============================================
// CARGA DE DATOS
// ============================================

async function loadAllData() {
    appState.isLoading = true;
    updateConnectionStatus('loading');

    try {
        if (CONFIG.DEMO_MODE) {
            // Cargar datos de demo
            await loadDemoData();
        } else {
            // Cargar desde API
            await loadFromAPI();
        }

        appState.isConnected = true;
        appState.lastUpdate = new Date();
        updateConnectionStatus('connected');

        // Renderizar todas las vistas
        renderDashboard();
        renderOrdersTable();
        renderBudgetsTable();
        renderVehiclesTable();
        renderStats();

    } catch (error) {
        console.error('Error loading data:', error);
        appState.isConnected = false;
        updateConnectionStatus('error');
        showToast('Error al cargar los datos', 'error');
    } finally {
        appState.isLoading = false;
    }
}

async function loadDemoData() {
    // Simular datos basados en la estructura del Sheets
    appState.workOrders = generateDemoOrders();
    appState.vehicles = extractVehicles(appState.workOrders);
    appState.stats = calculateStats(appState.workOrders);

    // Pequeño delay para simular carga
    await new Promise(resolve => setTimeout(resolve, 500));
}

async function loadFromAPI() {
    const response = await fetch(`${CONFIG.API_URL}?action=getAllData`);

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();

    if (data.success) {
        appState.workOrders = data.workOrders || [];
        appState.budgets = data.budgets || [];
        appState.stats = data.stats || null;
        appState.vehicles = extractVehicles(appState.workOrders);
    } else {
        throw new Error(data.error || 'Unknown error');
    }
}

function generateDemoOrders() {
    // Datos de ejemplo basados en la estructura real
    const demoData = [
        {
            timestamp: '3/2/2026 18:01:46',
            otNumber: 'OT-46056-0000',
            patente: 'HRI 930',
            vehiculo: 'Volkswagen Vento TDI',
            kilometraje: 155205,
            cliente: 'Carlos',
            anomalia: 'Service completo',
            manoObra: 0,
            estado: 'Trabajando',
            pdfUrl: null
        },
        {
            timestamp: '3/2/2026 17:31:14',
            otNumber: 'OT-46056-0001',
            patente: 'NMT 537',
            vehiculo: 'Fiat Palio',
            kilometraje: 154978,
            cliente: 'Alejandro',
            anomalia: 'Ruido en zona delantera',
            manoObra: 0,
            estado: 'Trabajando',
            pdfUrl: null
        },
        {
            timestamp: '3/2/2026 17:18:06',
            otNumber: 'OT-46056-0002',
            patente: 'GQP 878',
            vehiculo: 'Ford Ecosport',
            kilometraje: 0,
            cliente: 'Lionel',
            anomalia: 'No ingresan cambios',
            manoObra: 40000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1rez8VnubohhyCuIOJ-rjW5f5T1mCah9h/view'
        },
        {
            timestamp: '3/2/2026 16:32:35',
            otNumber: 'OT-46056-0003',
            patente: 'AD 626 GH',
            vehiculo: 'Fiat Uno Way',
            kilometraje: 84227,
            cliente: 'Adonis',
            anomalia: 'Service + Soplido de escape',
            manoObra: 50000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1AhcAG_75zNAY7FPDRRt8OLnjDFagveYt/view'
        },
        {
            timestamp: '3/2/2026 12:09:45',
            otNumber: 'OT-46056-0004',
            patente: 'KRL 620',
            vehiculo: 'Chevrolet Aveo',
            kilometraje: 127117,
            cliente: 'Verónica',
            anomalia: 'Service + Reemplazo junta tapa válvulas',
            manoObra: 0,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1h62NJ3UhDVy8MT58gX7CJimucdw6vNyZ/view'
        },
        {
            timestamp: '3/2/2026 10:09:59',
            otNumber: 'OT-46056-0005',
            patente: 'AD 309 LU',
            vehiculo: 'Peugeot 2008',
            kilometraje: 97940,
            cliente: 'Nico',
            anomalia: 'Reemplazo de parrillas',
            manoObra: 100000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1Z2Zd9vJ-N3uF1kGuhTwNJkgJ2hd0iAE3/view'
        },
        {
            timestamp: '2/2/2026 17:10:46',
            otNumber: 'OT-46055-0007',
            patente: 'JJT 143',
            vehiculo: 'Ford Focus',
            kilometraje: 163770,
            cliente: 'Jorge',
            anomalia: 'Ruido zona rueda delantera derecha',
            manoObra: 0,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1rqZsTwxXG1rgmv2MIo2k_mW3hXTwNY0q/view'
        },
        {
            timestamp: '2/2/2026 15:12:40',
            otNumber: 'OT-46055-0009',
            patente: 'OTJ 467',
            vehiculo: 'Chevrolet Corsa',
            kilometraje: 138464,
            cliente: 'Nazareno',
            anomalia: 'Service',
            manoObra: 0,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/17Gfidb5AAEi5V-bMqujSY0-4iKTsC8Nb/view'
        },
        {
            timestamp: '2/2/2026 15:12:01',
            otNumber: 'OT-46055-0010',
            patente: 'AH 724 SM',
            vehiculo: 'Renault Logan',
            kilometraje: 10538,
            cliente: 'Uriel',
            anomalia: 'Service',
            manoObra: 50000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1ePgqkv2zu6kDkZE6FRaE1Ung-JMUpC1z/view'
        },
        {
            timestamp: '2/2/2026 15:01:56',
            otNumber: 'OT-46055-0011',
            patente: 'OWA 280',
            vehiculo: 'Citroen C3 Air',
            kilometraje: 113165,
            cliente: 'Nacho',
            anomalia: 'Tren delantero',
            manoObra: 250000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1xBdMyxgNIGSAxgqaluW9aIpl8pJBuHpb/view'
        },
        {
            timestamp: '21/1/2026 17:54:15',
            otNumber: 'OT-46043-0022',
            patente: 'JIS 863',
            vehiculo: 'Volkswagen Gol Trend',
            kilometraje: 313366,
            cliente: 'Diego',
            anomalia: 'Revisión general',
            manoObra: 350000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1bFXLrhcGtlO_tDu9jKWf_CwDXPlSI6L8/view'
        },
        {
            timestamp: '21/1/2026 10:09:44',
            otNumber: 'OT-46043-0028',
            patente: 'IXX 521',
            vehiculo: 'BMW 320i',
            kilometraje: 157050,
            cliente: 'Juan',
            anomalia: 'Ruido zona motor',
            manoObra: 150000,
            estado: 'Finalizado',
            pdfUrl: 'https://drive.google.com/file/d/1_s7KO3GhKkermMOCKtEYy_Ql9xS4un18/view'
        }
    ];

    return demoData;
}

function extractVehicles(orders) {
    const vehicleMap = new Map();

    orders.forEach(order => {
        if (!vehicleMap.has(order.patente)) {
            vehicleMap.set(order.patente, {
                patente: order.patente,
                vehiculo: order.vehiculo,
                cliente: order.cliente,
                serviciosCount: 1,
                ultimoServicio: order.timestamp
            });
        } else {
            const vehicle = vehicleMap.get(order.patente);
            vehicle.serviciosCount++;
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
        completados,
        pendientes,
        totalManoObra,
        promedioTicket: completados > 0 ? totalManoObra / completados : 0
    };
}

// ============================================
// RENDERIZADO
// ============================================

function renderDashboard() {
    const stats = appState.stats || calculateStats(appState.workOrders);

    // Update stat cards
    document.getElementById('statTotalTrabajos').textContent = stats.totalTrabajos;
    document.getElementById('statPendientes').textContent = stats.pendientes;
    document.getElementById('statCompletados').textContent = stats.completados;
    document.getElementById('statIngresos').textContent = formatCurrency(stats.totalManoObra);

    // Render recent orders
    renderRecentOrders();

    // Render working now
    renderWorkingNow();
}

function renderRecentOrders() {
    const tbody = document.querySelector('#recentOrdersTable tbody');
    if (!tbody) return;

    const recentOrders = appState.workOrders.slice(0, 5);

    tbody.innerHTML = recentOrders.map(order => `
        <tr onclick="viewOrderDetails('${order.otNumber}')" style="cursor: pointer;">
            <td><strong>${order.otNumber}</strong></td>
            <td>${order.patente}</td>
            <td>${order.vehiculo}</td>
            <td>${order.cliente}</td>
            <td>${getStatusBadge(order.estado)}</td>
        </tr>
    `).join('');
}

function renderWorkingNow() {
    const container = document.getElementById('workingNowList');
    if (!container) return;

    const working = appState.workOrders.filter(o => o.estado === 'Trabajando');

    if (working.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 12px; color: var(--success);"></i>
                <p>No hay vehículos en taller</p>
            </div>
        `;
        return;
    }

    container.innerHTML = working.map(order => `
        <div class="working-item" onclick="viewOrderDetails('${order.otNumber}')" style="cursor: pointer;">
            <div class="item-header">
                <span class="patente">${order.patente}</span>
                <span class="vehiculo">${order.vehiculo}</span>
            </div>
            <div class="cliente"><i class="fas fa-user"></i> ${order.cliente}</div>
        </div>
    `).join('');
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordenesTableBody');
    if (!tbody) return;

    tbody.innerHTML = appState.workOrders.map(order => `
        <tr>
            <td>${formatDate(order.timestamp)}</td>
            <td><strong>${order.otNumber}</strong></td>
            <td>${order.patente}</td>
            <td>${order.vehiculo}</td>
            <td>${order.cliente}</td>
            <td class="anomalia-cell">${truncateText(order.anomalia, 30)}</td>
            <td>${order.manoObra ? formatCurrency(order.manoObra) : '-'}</td>
            <td>${getStatusBadge(order.estado)}</td>
            <td>${order.pdfUrl ? `<a href="${order.pdfUrl}" target="_blank" class="pdf-link"><i class="fas fa-file-pdf"></i> Ver</a>` : '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="viewOrderDetails('${order.otNumber}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.estado === 'Finalizado' && order.pdfUrl ? `
                        <button class="action-btn pdf-btn" onclick="printPDFFromUrl('${order.pdfUrl}')" title="Imprimir">
                            <i class="fas fa-print"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderBudgetsTable() {
    const tbody = document.getElementById('presupuestosTableBody');
    if (!tbody) return;

    if (appState.budgets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    No hay presupuestos registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = appState.budgets.map(budget => `
        <tr>
            <td>${formatDate(budget.timestamp)}</td>
            <td><strong>${budget.budgetNumber}</strong></td>
            <td>${budget.patente || '-'}</td>
            <td>${budget.cliente || '-'}</td>
            <td>${budget.descripcion || '-'}</td>
            <td>${formatCurrency(budget.total || 0)}</td>
            <td>${budget.pdfUrl ? `<a href="${budget.pdfUrl}" target="_blank" class="pdf-link"><i class="fas fa-file-pdf"></i> Ver</a>` : '-'}</td>
        </tr>
    `).join('');
}

function renderVehiclesTable() {
    const tbody = document.getElementById('vehiculosTableBody');
    if (!tbody) return;

    tbody.innerHTML = appState.vehicles.map(vehicle => `
        <tr>
            <td><strong>${vehicle.patente}</strong></td>
            <td>${vehicle.vehiculo}</td>
            <td>${vehicle.cliente}</td>
            <td><span class="badge badge-info">${vehicle.serviciosCount}</span></td>
            <td>${vehicle.ultimoServicio}</td>
            <td>
                <button class="action-btn" onclick="viewVehicleHistory('${vehicle.patente}')" title="Ver historial">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderStats() {
    const stats = appState.stats || calculateStats(appState.workOrders);
    const uniqueVehicles = appState.vehicles.length;

    // Esta semana
    const thisWeek = appState.workOrders.filter(o => {
        const orderDate = parseDate(o.timestamp);
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return orderDate >= weekStart;
    }).length;

    document.getElementById('statTotalManoObra').textContent = formatCurrency(stats.totalManoObra);
    document.getElementById('statPromedioTicket').textContent = formatCurrency(stats.promedioTicket);
    document.getElementById('statVehiculosUnicos').textContent = uniqueVehicles;
    document.getElementById('statSemanaActual').textContent = thisWeek;
}

// ============================================
// FILTROS
// ============================================

function filterOrders() {
    const estado = document.getElementById('filterEstado').value;
    const buscar = document.getElementById('filterBuscar').value.toLowerCase();

    const tbody = document.getElementById('ordenesTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowData = row.textContent.toLowerCase();
        const estadoCell = row.querySelector('td:nth-child(8)')?.textContent || '';

        const matchEstado = !estado || estadoCell.toLowerCase().includes(estado.toLowerCase());
        const matchBuscar = !buscar || rowData.includes(buscar);

        row.style.display = matchEstado && matchBuscar ? '' : 'none';
    });
}

function filterVehicles() {
    const buscar = document.getElementById('filterVehiculo').value.toLowerCase();

    const tbody = document.getElementById('vehiculosTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowData = row.textContent.toLowerCase();
        row.style.display = !buscar || rowData.includes(buscar) ? '' : 'none';
    });
}

function handleGlobalSearch(e) {
    const query = e.target.value.toLowerCase();

    if (query.length < 2) return;

    const results = appState.workOrders.filter(order =>
        order.patente.toLowerCase().includes(query) ||
        order.cliente.toLowerCase().includes(query) ||
        order.otNumber.toLowerCase().includes(query)
    );

    if (results.length > 0) {
        navigateTo('ordenes');
        setTimeout(() => {
            document.getElementById('filterBuscar').value = query;
            filterOrders();
        }, 100);
    }
}

// ============================================
// MODALES Y DETALLES
// ============================================

function viewOrderDetails(otNumber) {
    const order = appState.workOrders.find(o => o.otNumber === otNumber);
    if (!order) {
        showToast('Orden no encontrada', 'error');
        return;
    }

    appState.currentOrder = order;

    const modalBody = document.getElementById('ordenModalBody');
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>N° de Orden</label>
                <span>${order.otNumber}</span>
            </div>
            <div class="detail-item">
                <label>Estado</label>
                <span>${getStatusBadge(order.estado)}</span>
            </div>
            <div class="detail-item">
                <label>Patente</label>
                <span>${order.patente}</span>
            </div>
            <div class="detail-item">
                <label>Vehículo</label>
                <span>${order.vehiculo}</span>
            </div>
            <div class="detail-item">
                <label>Cliente</label>
                <span>${order.cliente}</span>
            </div>
            <div class="detail-item">
                <label>Kilometraje</label>
                <span>${order.kilometraje ? order.kilometraje.toLocaleString('es-AR') + ' km' : '-'}</span>
            </div>
            <div class="detail-item">
                <label>Fecha de Entrada</label>
                <span>${order.timestamp}</span>
            </div>
            <div class="detail-item">
                <label>Mano de Obra</label>
                <span>${order.manoObra ? formatCurrency(order.manoObra) : '-'}</span>
            </div>
            <div class="detail-item full-width">
                <label>Anomalía del Cliente</label>
                <span>${order.anomalia || '-'}</span>
            </div>
            ${order.pdfUrl ? `
                <div class="detail-item full-width">
                    <label>PDF de Orden</label>
                    <span><a href="${order.pdfUrl}" target="_blank" class="pdf-link"><i class="fas fa-file-pdf"></i> Ver/Descargar PDF</a></span>
                </div>
            ` : ''}
        </div>
    `;

    // Update modal buttons
    const btnGenerarPDF = document.getElementById('btnGenerarPDF');
    const btnImprimirPDF = document.getElementById('btnImprimirPDF');

    if (order.pdfUrl) {
        btnGenerarPDF.style.display = 'none';
        btnImprimirPDF.style.display = 'inline-flex';
    } else {
        btnGenerarPDF.style.display = 'inline-flex';
        btnImprimirPDF.style.display = 'none';
    }

    openModal('ordenModal');
}

function viewVehicleHistory(patente) {
    const history = appState.workOrders.filter(o => o.patente === patente);

    const modalBody = document.getElementById('ordenModalBody');
    modalBody.innerHTML = `
        <h4 style="margin-bottom: 16px;"><i class="fas fa-car"></i> Historial de ${patente}</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>OT</th>
                        <th>Anomalía</th>
                        <th>Mano de Obra</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(order => `
                        <tr>
                            <td>${formatDate(order.timestamp)}</td>
                            <td>${order.otNumber}</td>
                            <td>${truncateText(order.anomalia, 30)}</td>
                            <td>${order.manoObra ? formatCurrency(order.manoObra) : '-'}</td>
                            <td>${getStatusBadge(order.estado)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('btnGenerarPDF').style.display = 'none';
    document.getElementById('btnImprimirPDF').style.display = 'none';

    openModal('ordenModal');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
    document.body.style.overflow = '';
    appState.currentOrder = null;
}

// ============================================
// FORMULARIOS
// ============================================

async function handleNewOrder(e) {
    e.preventDefault();

    const formData = {
        patente: document.getElementById('inputPatente').value.trim(),
        marca: document.getElementById('inputMarca').value.trim(),
        kilometraje: document.getElementById('inputKilometraje').value,
        cliente: document.getElementById('inputCliente').value.trim(),
        telefono: document.getElementById('inputTelefono').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        anomaliaCliente: document.getElementById('inputAnomalia').value.trim(),
        fechaEntrada: document.getElementById('inputFechaEntrada').value,
        estado: document.getElementById('inputEstado').value
    };

    // Validate
    if (!formData.patente || !formData.marca || !formData.cliente || !formData.anomaliaCliente) {
        showToast('Por favor complete todos los campos requeridos', 'warning');
        return;
    }

    if (CONFIG.DEMO_MODE) {
        // Demo mode - add to local state
        const newOrder = {
            timestamp: new Date().toLocaleString('es-AR'),
            otNumber: 'OT-DEMO-' + Date.now(),
            patente: formData.patente.toUpperCase(),
            vehiculo: formData.marca,
            kilometraje: parseInt(formData.kilometraje) || 0,
            cliente: formData.cliente,
            anomalia: formData.anomaliaCliente,
            manoObra: 0,
            estado: formData.estado,
            pdfUrl: null
        };

        appState.workOrders.unshift(newOrder);
        appState.vehicles = extractVehicles(appState.workOrders);
        appState.stats = calculateStats(appState.workOrders);

        renderDashboard();
        renderOrdersTable();
        renderVehiclesTable();

        showToast('Orden creada exitosamente (Demo)', 'success');
        clearForm();
        navigateTo('ordenes');

    } else {
        // API mode
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=createWorkOrder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                showToast(`Orden ${result.otNumber} creada exitosamente`, 'success');
                clearForm();
                await loadAllData();
                navigateTo('ordenes');
            } else {
                showToast(result.error || 'Error al crear la orden', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error de conexión', 'error');
        }
    }
}

function clearForm() {
    const form = document.getElementById('nuevaOrdenForm');
    if (form) {
        form.reset();
        document.getElementById('inputFechaEntrada').valueAsDate = new Date();
    }
}

// ============================================
// PDF
// ============================================

async function generatePDF() {
    if (!appState.currentOrder) {
        showToast('No hay orden seleccionada', 'error');
        return;
    }

    const order = appState.currentOrder;

    if (CONFIG.DEMO_MODE) {
        // En demo mode, generamos un PDF local
        generateLocalPDF(order);
    } else {
        try {
            showToast('Generando PDF...', 'info');

            const response = await fetch(`${CONFIG.API_URL}?action=generatePDF&otNumber=${order.otNumber}`);
            const result = await response.json();

            if (result.success) {
                showToast('PDF generado exitosamente', 'success');
                await loadAllData();
                closeModal();

                // Open PDF
                if (result.pdfUrl) {
                    window.open(result.pdfUrl, '_blank');
                }
            } else {
                showToast(result.error || 'Error al generar PDF', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error de conexión', 'error');
        }
    }
}

function generateLocalPDF(order) {
    // Crear contenido del PDF para impresión
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orden de Trabajo - ${order.otNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { max-width: 300px; margin-bottom: 10px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .ot-number { font-size: 18px; color: #666; }
                .section { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; }
                .section-title { font-weight: bold; margin-bottom: 10px; color: #5b3f86; }
                .row { display: flex; margin-bottom: 8px; }
                .label { font-weight: bold; width: 150px; }
                .value { flex: 1; }
                .footer { margin-top: 30px; text-align: center; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="logo.png" alt="Muñoz Inyección" class="logo">
                <div class="title">Orden de Trabajo</div>
                <div class="ot-number">${order.otNumber}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Datos del Vehículo</div>
                <div class="row"><span class="label">Patente:</span><span class="value">${order.patente}</span></div>
                <div class="row"><span class="label">Vehículo:</span><span class="value">${order.vehiculo}</span></div>
                <div class="row"><span class="label">Kilometraje:</span><span class="value">${order.kilometraje ? order.kilometraje.toLocaleString('es-AR') + ' km' : '-'}</span></div>
            </div>
            
            <div class="section">
                <div class="section-title">Datos del Cliente</div>
                <div class="row"><span class="label">Cliente:</span><span class="value">${order.cliente}</span></div>
            </div>
            
            <div class="section">
                <div class="section-title">Trabajo Realizado</div>
                <div class="row"><span class="label">Fecha:</span><span class="value">${order.timestamp}</span></div>
                <div class="row"><span class="label">Anomalía:</span><span class="value">${order.anomalia}</span></div>
                <div class="row"><span class="label">Mano de Obra:</span><span class="value">${order.manoObra ? formatCurrency(order.manoObra) : '-'}</span></div>
                <div class="row"><span class="label">Estado:</span><span class="value">${order.estado}</span></div>
            </div>
            
            <div class="footer">
                <p>Taller Muñoz - Inyección</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.print();
    };
}

function printPDF() {
    if (appState.currentOrder && appState.currentOrder.pdfUrl) {
        window.open(appState.currentOrder.pdfUrl, '_blank');
    } else {
        generateLocalPDF(appState.currentOrder);
    }
}

function printPDFFromUrl(url) {
    window.open(url, '_blank');
}

// ============================================
// UTILIDADES
// ============================================

function formatCurrency(amount) {
    return '$' + (parseFloat(amount) || 0).toLocaleString('es-AR');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Return as-is since format is already d/m/y
    return dateStr.split(' ')[0];
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split(' ')[0].split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getStatusBadge(status) {
    const statusMap = {
        'Trabajando': { class: 'badge-working', icon: 'fa-spinner fa-spin', text: 'En Trabajo' },
        'Finalizado': { class: 'badge-completed', icon: 'fa-check', text: 'Finalizado' },
        'Pendiente': { class: 'badge-pending', icon: 'fa-clock', text: 'Pendiente' }
    };

    const config = statusMap[status] || statusMap['Pendiente'];
    return `<span class="badge ${config.class}"><i class="fas ${config.icon}"></i> ${config.text}</span>`;
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    statusEl.className = 'connection-status ' + status;

    const textEl = statusEl.querySelector('.status-text');
    if (textEl) {
        const texts = {
            loading: 'Conectando...',
            connected: 'Conectado',
            error: 'Sin conexión'
        };
        textEl.textContent = texts[status] || 'Conectando...';
    }
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn var(--transition-normal) reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

window.navigateTo = navigateTo;
window.viewOrderDetails = viewOrderDetails;
window.viewVehicleHistory = viewVehicleHistory;
window.closeModal = closeModal;
window.generatePDF = generatePDF;
window.printPDF = printPDF;
window.printPDFFromUrl = printPDFFromUrl;
window.clearForm = clearForm;
