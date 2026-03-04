# 🔧 Taller Muñoz - Sistema de Gestión

Sistema de gestión minimalista y robusto para taller mecánico, diseñado específicamente para Google Apps Script.

## 📋 Características

### ✨ Diseño Minimalista Industrial
- **Paleta de colores**: Naranja mecánico (#FF6B35) + Gris oscuro (#2C3E50)
- **Tipografía**: Inter - limpia y profesional
- **Espacios generosos**: Diseño respirable y fácil de leer
- **Responsive**: Adaptado para desktop, tablet y móvil

### 🚀 Funcionalidades

1. **Dashboard Principal**
   - Estadísticas en tiempo real
   - Trabajos recientes
   - Vehículos en taller actualmente

2. **Gestión de Órdenes de Trabajo**
   - Listado completo con filtros
   - Búsqueda por patente, cliente o número de OT
   - Estados: Trabajando, Finalizado, Pendiente
   - Visualización de detalles completos

3. **Nueva Orden de Trabajo**
   - Formulario organizado por secciones
   - Validación de campos requeridos
   - Fecha automática

4. **Presupuestos**
   - Gestión de presupuestos
   - Generación de PDFs

5. **Vehículos**
   - Historial completo por patente
   - Contador de servicios
   - Último servicio registrado

6. **Estadísticas**
   - Total de mano de obra
   - Promedio por trabajo
   - Vehículos únicos atendidos
   - Trabajos de la semana actual

## 📁 Estructura del Proyecto

```
taller-munoz/webapp/
├── index.html          # Interfaz principal
├── styles.css          # Estilos minimalistas
├── app.js             # Lógica de la aplicación
└── logo.png           # Logo del taller
```

## 🎨 Paleta de Colores

### Colores Principales
- **Primary**: `#FF6B35` - Naranja mecánico
- **Primary Dark**: `#E85A2A` - Naranja oscuro
- **Primary Light**: `#FF8C61` - Naranja claro
- **Secondary**: `#2C3E50` - Gris oscuro
- **Accent**: `#FFA500` - Naranja acento

### Colores de Estado
- **Success**: `#27AE60` - Verde
- **Warning**: `#F39C12` - Amarillo
- **Danger**: `#E74C3C` - Rojo
- **Info**: `#3498DB` - Azul

### Fondos
- **Background**: `#F5F6F7` - Gris muy claro
- **Card**: `#FFFFFF` - Blanco
- **Input**: `#F5F6F7` - Gris claro
- **Sidebar**: `#2C3E50` - Gris oscuro

## 🔧 Configuración

### 1. Configurar Google Apps Script

Edita el archivo `app.js` y actualiza la configuración:

```javascript
const CONFIG = {
    // URL del Google Apps Script desplegado como Web App
    API_URL: 'TU_URL_AQUI',
    
    // Sheet ID de tu Google Sheets
    SHEET_ID: 'TU_SHEET_ID',
    
    // Duración del cache (5 minutos)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // Modo demo (true = usa datos locales, false = usa API)
    DEMO_MODE: true
};
```

### 2. Estructura de la Base de Datos (Google Sheets)

El sistema espera las siguientes columnas en tu hoja de cálculo:

| Columna | Descripción |
|---------|-------------|
| Marca temporal | Fecha y hora del registro |
| Patente | Patente del vehículo |
| Vehiculo | Marca y modelo |
| Imagenes | URLs de imágenes (opcional) |
| Kilometraje | Kilometraje actual |
| Nombre del cliente | Nombre del cliente |
| Patente auto cliente | Referencia combinada |
| Tercerizados | Trabajos tercerizados |
| Anomalia del cliente | Descripción del problema |
| Anomalia del cliente 2-4 | Problemas adicionales |
| Orden de trabajo | Número de OT |
| Mes | Mes del trabajo |
| WEEK | Semana del año |
| PDF hoja de trabajo | URL del PDF |
| Cobro mano de obra | Monto cobrado |
| Fecha finalizado | Fecha de finalización |
| Estado | Trabajando/Finalizado/Pendiente |

### 3. Desplegar en Google Apps Script

1. Abre tu Google Sheets
2. Ve a **Extensiones > Apps Script**
3. Copia el contenido de `Code.gs` al editor
4. Guarda y despliega como **Web App**
5. Copia la URL generada y pégala en `CONFIG.API_URL`

## 📱 Uso del Sistema

### Navegación

El sistema cuenta con 6 secciones principales accesibles desde el sidebar:

1. **Dashboard** - Vista general
2. **Órdenes de Trabajo** - Gestión completa
3. **Nueva Orden** - Crear nueva OT
4. **Presupuestos** - Gestión de presupuestos
5. **Vehículos** - Historial por patente
6. **Estadísticas** - Análisis financiero

### Búsqueda Global

Usa la barra de búsqueda en el header para encontrar rápidamente:
- Órdenes por número de OT
- Vehículos por patente
- Trabajos por nombre de cliente

### Filtros

En la sección de **Órdenes de Trabajo**:
- Filtra por estado (Todos, En Trabajo, Finalizado, Pendiente)
- Busca por patente o cliente

### Ver Detalles

Haz clic en cualquier orden para ver:
- Información completa del vehículo
- Datos del cliente
- Anomalías reportadas
- Mano de obra cobrada
- PDF de la orden (si existe)

### Historial de Vehículo

En la sección **Vehículos**, haz clic en el botón de historial para ver todos los servicios realizados a un vehículo específico.

## 🎯 Modo Demo

El sistema incluye un **modo demo** con datos de ejemplo para pruebas:

```javascript
DEMO_MODE: true  // Usa datos locales
DEMO_MODE: false // Usa Google Apps Script API
```

## 📊 Estadísticas Calculadas

El sistema calcula automáticamente:

- **Total de trabajos**: Cantidad total de órdenes
- **En trabajo**: Órdenes con estado "Trabajando"
- **Finalizados**: Órdenes completadas
- **Ingresos totales**: Suma de toda la mano de obra
- **Promedio por trabajo**: Ingreso promedio por orden
- **Vehículos únicos**: Cantidad de patentes diferentes
- **Esta semana**: Trabajos de la semana actual

## 🎨 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --primary: #FF6B35;        /* Color principal */
    --primary-dark: #E85A2A;   /* Versión oscura */
    --primary-light: #FF8C61;  /* Versión clara */
    --secondary: #2C3E50;      /* Color secundario */
}
```

### Cambiar Logo

Reemplaza el archivo `logo.png` o actualiza la URL en `index.html`:

```html
<img src="TU_LOGO_URL" alt="Taller Muñoz" class="logo-image">
```

## 🔒 Seguridad

- El sistema usa Google Apps Script para autenticación
- Los datos se almacenan en Google Sheets
- Las URLs de PDF son privadas de Google Drive
- No se almacenan datos sensibles en el frontend

## 📱 Responsive Design

El diseño se adapta automáticamente a:

- **Desktop**: Vista completa con sidebar fijo
- **Tablet**: Sidebar colapsable
- **Móvil**: Menú hamburguesa y diseño vertical

### Breakpoints

- Desktop: `> 1024px`
- Tablet: `768px - 1024px`
- Móvil: `< 768px`

## 🚀 Optimizaciones

### Performance

- Cache de 5 minutos para reducir llamadas a la API
- Lazy loading de imágenes
- Debounce en búsquedas (300ms)
- Animaciones CSS optimizadas

### UX

- Feedback visual en todas las acciones
- Toasts de notificación
- Estados de carga
- Indicador de conexión

## 🐛 Solución de Problemas

### El sistema no carga datos

1. Verifica que `DEMO_MODE` esté en `true` para pruebas
2. Si usas API, verifica que la URL sea correcta
3. Revisa la consola del navegador (F12) para errores

### Los filtros no funcionan

1. Asegúrate de que los datos estén cargados
2. Verifica que las columnas coincidan con la estructura esperada

### El diseño se ve mal

1. Limpia el cache del navegador
2. Verifica que `styles.css` esté cargando correctamente
3. Revisa que no haya conflictos con otros estilos

## 📞 Soporte

Para soporte o consultas:
- Email: [tu-email]
- GitHub: [tu-repo]

## 📄 Licencia

Este proyecto está diseñado específicamente para Taller Muñoz.

---

**Desarrollado con ❤️ para Taller Muñoz**

*Diseño minimalista industrial - Optimizado para Google Apps Script*
