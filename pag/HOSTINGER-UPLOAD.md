# Guía Rápida: Subir a Hostinger

Esta es una guía simplificada para subir tu aplicación a Hostinger usando el administrador de archivos o FTP.

## 📦 Opción 1: Administrador de Archivos de Hostinger (Recomendado)

### Paso 1: Preparar los archivos localmente

1. **Comprimir tu proyecto** (excluyendo carpetas innecesarias):
   ```bash
   # En tu computadora, desde la carpeta del proyecto
   # Asegúrate de NO incluir: node_modules, .next, .git
   ```

2. **Crear un archivo ZIP** manualmente:
   - Selecciona TODOS los archivos del proyecto EXCEPTO:
     - `node_modules/` (se instalará en el servidor)
     - `.next/` (se generará al hacer build)
     - `.git/` (opcional, no necesario)
   - Click derecho → Comprimir → `kaizen-solution.zip`

### Paso 2: Subir a Hostinger

1. **Accede al panel de Hostinger**
   - Ve a hPanel → Administrador de archivos
   - Navega a `public_html` o la carpeta de tu dominio

2. **Sube el archivo ZIP**
   - Click en "Subir archivos"
   - Selecciona `kaizen-solution.zip`
   - Espera a que termine la subida

3. **Extraer archivos**
   - Click derecho en `kaizen-solution.zip`
   - Selecciona "Extraer"
   - Los archivos se extraerán en la carpeta actual

### Paso 3: Configurar en el servidor

1. **Accede por SSH** (necesario para instalar dependencias):
   ```bash
   ssh tu-usuario@tu-dominio.com
   ```

2. **Navega a la carpeta del proyecto**:
   ```bash
   cd public_html/kaizen-solution
   # o la ruta donde subiste los archivos
   ```

3. **Crea el archivo .env**:
   ```bash
   cp .env.production.example .env
   nano .env
   ```
   
   Actualiza solo estos valores:
   ```bash
   # Generar secret: openssl rand -base64 32
   NEXTAUTH_SECRET="PEGA_AQUI_EL_SECRET_GENERADO"
   
   # Tu dominio
   NEXTAUTH_URL="https://tudominio.com"
   ```
   
   Guarda: `Ctrl+X`, luego `Y`, luego `Enter`

4. **Instala dependencias y construye**:
   ```bash
   npm ci
   npx prisma generate
   npx prisma db push
   npm run build
   ```

5. **Crea el usuario admin**:
   ```bash
   npm run create:admin
   ```

6. **Inicia la aplicación con PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

## 📦 Opción 2: FTP (Alternativa)

Si prefieres usar un cliente FTP como FileZilla:

1. **Configurar FileZilla**:
   - Host: `ftp.tudominio.com`
   - Usuario: Tu usuario FTP de Hostinger
   - Contraseña: Tu contraseña FTP
   - Puerto: 21

2. **Subir archivos**:
   - Conecta al servidor
   - Navega a `public_html`
   - Arrastra TODOS los archivos del proyecto (excepto `node_modules`, `.next`, `.git`)
   - Espera a que termine la transferencia

3. **Continúa con el Paso 3** de la Opción 1 (configurar por SSH)

---

## 📦 Opción 3: Git (Más Profesional)

Si tu proyecto está en GitHub:

1. **SSH al servidor**:
   ```bash
   ssh tu-usuario@tu-dominio.com
   ```

2. **Clonar el repositorio**:
   ```bash
   cd public_html
   git clone https://github.com/tu-usuario/kaizen-solution.git
   cd kaizen-solution
   ```

3. **Continúa con el Paso 3** de la Opción 1 (configurar)

---

## ✅ Verificación

Después de completar cualquier opción:

1. **Verifica que PM2 esté corriendo**:
   ```bash
   pm2 status
   ```

2. **Ve los logs**:
   ```bash
   pm2 logs kaizen
   ```

3. **Configura Nginx** (ver DEPLOYMENT.md para detalles completos)

4. **Visita tu dominio** y verifica que funcione

---

## 🚨 Archivos Importantes que DEBES Subir

✅ **Sí subir**:
- Todos los archivos `.ts`, `.tsx`, `.js`, `.jsx`
- `package.json` y `package-lock.json`
- Carpetas: `app/`, `components/`, `lib/`, `prisma/`, `public/`, `scripts/`
- Archivos de configuración: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`
- Scripts: `deploy.sh`, `ecosystem.config.js`, etc.
- `.env.example` y `.env.production.example`

❌ **NO subir**:
- `node_modules/` (se instala con `npm ci`)
- `.next/` (se genera con `npm run build`)
- `.git/` (opcional)
- `.env` o `.env.local` (crear en el servidor)
- `prisma/dev.db` (base de datos local)

---

## 📝 Resumen del Proceso

```
1. Comprimir proyecto (sin node_modules, .next, .git)
2. Subir ZIP a Hostinger (Administrador de archivos)
3. Extraer archivos en el servidor
4. SSH al servidor
5. Crear .env con tus credenciales
6. npm ci (instalar dependencias)
7. npx prisma generate && npx prisma db push
8. npm run build
9. npm run create:admin
10. pm2 start ecosystem.config.js
11. Configurar Nginx (ver DEPLOYMENT.md)
12. ¡Listo! 🎉
```

---

## 🆘 ¿Problemas?

- **Error al subir archivos**: Verifica el tamaño del ZIP (máximo ~100MB). Si es muy grande, usa FTP o Git.
- **No puedo acceder por SSH**: Contacta soporte de Hostinger para habilitar SSH.
- **npm ci falla**: Asegúrate de que Node.js 18+ esté instalado en el servidor.
- **pm2 no funciona**: Instala PM2 globalmente: `npm install -g pm2`

Para más detalles, consulta [DEPLOYMENT.md](./DEPLOYMENT.md)
