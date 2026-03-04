# 🐾 TheriVerse MVP — Build Instructions

¡Tu MVP de TheriVerse está listo! Acá tenés cómo probarlo y generar el APK.

## 1. Prueba Inmediata (Sin instalar nada)

Para ver la app funcionando ya mismo en tu navegador:

```bash
cd TheriVerse
npx expo start --web
```
Luego presioná `w` en la terminal para abrir en Chrome.


## 2. Prueba en tu Android (Recomendado)

Para verla en tu teléfono real mientras codeamos:

1. Bajate la app **Expo Go** desde Play Store en tu Android.
2. En la terminal de tu PC:
   ```bash
   npx expo start
   ```
3. Escaneá el código QR desde la app Expo Go.
¡Listo! La app carga en tu teléfono al instante.


## 3. Generar el APK (Android App Bundle)

Para tener el archivo instalable real (APK) usando la nube de Expo (GRATIS):

1. **Creá una cuenta en Expo:** [https://expo.dev/signup](https://expo.dev/signup)
2. **Instalá EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```
3. **Logueate:**
   ```bash
   eas login
   ```
4. **Configurá el proyecto (solo la primera vez):**
   ```bash
   eas build:configure
   ```
   (Elegí `Android` cuando pregunte).

5. **Generá el APK:**
   ```bash
   eas build -p android --profile preview
   ```
   Esto subirá tu código a la nube de Expo, compilará el APK, y te dará un link de descarga directa.

---

### Notas de Compliance (Play Store)
Este MVP ya incluye las pantallas obligatorias para que no te bajen la app:
- ✅ **Reportar usuario/contenido:** `app/report.tsx`
- ✅ **Bloquear usuario:** (Simulado en botón)
- ✅ **Borrar cuenta:** `app/settings/delete-account.tsx`
- ✅ **Age Gate (18+):** En el módulo de Dating.
