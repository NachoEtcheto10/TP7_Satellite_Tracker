# Orbita - Satellite Tracker

Aplicación Android del TP7 para seguimiento satelital real. Está desarrollada con Expo SDK 58, React Native, TypeScript, `satellite.js`, MapLibre y OpenFreeMap. Funciona en la primera ejecución sin cuentas, API keys ni servicios privados.

## Funcionalidades

- Catálogos públicos OMM/JSON de CelesTrak y búsqueda por nombre o NORAD ID.
- Propagación SGP4 local cada 2 segundos, posición, velocidad, azimut y elevación.
- Predicción de AOS, máxima elevación y LOS, con sky chart SVG.
- Mapa nativo MapLibre con el estilo público Liberty de OpenFreeMap.
- Marcador en tiempo real, ground track, antimeridiano, footprint y capa Starlink.
- Caché SQLite con TTL de 18 horas, reintentos sólo recuperables, límite de peticiones y fallback SupGP → GP/OMM para Starlink.
- Notificaciones locales, GPS y orientación por sensores.
- Validación pública e independiente de la ISS con Where the ISS at?.

N2YO y Space-Track permanecen como integraciones opcionales. La aplicación no los consulta si no están configurados y nunca incluye sus credenciales en el APK.

## Requisitos de desarrollo

- Windows 10/11, Node.js 20 o posterior y npm.
- Android Studio con Android SDK, un emulador o un teléfono con depuración USB.
- JDK incluido con Android Studio o Java 21 compatible.
- Una ruta de proyecto corta, por ejemplo `C:\orbita`, para evitar el límite de rutas de CMake/Ninja en Windows.

MapLibre contiene código nativo y no se valida con Expo Go. Se debe usar un development build mediante `npx expo run:android`.

## Instalación y pruebas

No es obligatorio crear `.env`. Si existe, `EXPO_PUBLIC_API_PROXY_URL` es opcional y sólo sirve para proveedores privados alojados por el usuario.

```powershell
npm install
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Android Studio y ejecución

Configurar las rutas para la consola actual, ajustando la ubicación del SDK si fuera distinta:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npx expo prebuild --clean --platform android
npx expo run:android
```

Después de `prebuild`, abrir `android` desde Android Studio, esperar la sincronización de Gradle y elegir el emulador o dispositivo. No editar a mano la carpeta generada: los permisos y plugins se mantienen en `app.json`.

## APK independiente

El APK de presentación firmado por EAS está en `entrega/SatelliteTracker.apk`. Incluye JavaScript, assets y bibliotecas nativas; fue instalado desde cero y abierto sin Metro ni computadora. Para instalar por ADB:

```powershell
adb install -r entrega\SatelliteTracker.apk
```

También se puede copiar al teléfono, abrirlo y autorizar temporalmente la instalación desde esa fuente. La firma v2 fue generada con la keystore remota administrada por EAS. El build verificable es `708e33cf-746c-4ded-b82d-c0aa10e304a0`.

Para regenerarlo localmente desde una ruta corta:

```powershell
npx expo prebuild --clean --platform android
npx expo run:android
Set-Location android
.\gradlew.bat app:assembleRelease
```

La salida nativa queda en `android/app/build/outputs/apk/release/app-release.apk`.

Para generar un APK firmado en la nube sin Android Studio, `eas.json` incluye el perfil `preview` (`distribution: internal`, `android.buildType: apk`):

```powershell
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

El inicio de sesión y la keystore pertenecen al propietario del proyecto; no se guardan contraseñas en el repositorio.

## Fuentes y privacidad

- CelesTrak: fuente orbital pública principal.
- CelesTrak SupGP: lote público Starlink; CelesTrak permite una descarga por actualización (aproximadamente cada dos horas), por lo que la app reutiliza SQLite y no reintenta HTTP 403.
- Where the ISS at?: control independiente de RF-15.
- OpenFreeMap: estilo y mosaicos públicos; la atribución permanece visible en el mapa.

No hay claves de Google Maps, credenciales privadas ni dependencia de `localhost`. El proyecto está vinculado a EAS mediante `extra.eas.projectId`, sin guardar contraseñas ni keystores en el repositorio. Los datos orbitales almacenados permiten continuar los cálculos offline mientras exista una entrada válida o vencida en caché; la interfaz informa su antigüedad.

## Estructura

- `src/domain`: propagación, geometría, pases y validación.
- `src/data`: proveedores, HTTP, caché y políticas de recuperación.
- `src/services`: ubicación, sensores, notificaciones y runtime.
- `src/state`: estado global y actualización periódica.
- `src/app`: pantallas y rutas Expo Router.
- `entrega`: APK, video MP4, informes, evidencia y guion de demostración.

El estado verificable de RF-01 a RF-16 está en `entrega/ESTADO_ENTREGA.md`; el detalle de la grabación y la lista de pruebas físicas están en `entrega/REPORTE_PRUEBAS_VIDEO.md`.
