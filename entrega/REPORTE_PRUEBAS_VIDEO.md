# Reporte de pruebas y video — TP7 Satellite Tracker

Fecha: 31/10/2026. Este documento separa expresamente las verificaciones automáticas, las realizadas en emulador Android y las todavía pendientes en un teléfono físico.

## Entregables verificables

- Video: `entrega/DEMO_SATELLITE_TRACKER.mp4`
- APK: `entrega/SatelliteTracker.apk`
- Video MP4/H.264, `yuv420p`, 1080 × 1920, 30 fps, 117,333 s (1:57,3), 3.553.368 bytes.
- SHA-256 del video: `01ACD4D94B764FA8794B46A771D2878451FB1B4DA68E0F826D3AEDAA52235E1C`.
- Firma APK: esquema v2 válido, un firmante remoto administrado por EAS; certificado SHA-256 `2AAAFF91B330CC3EF1D000F3E6D948B6FE604390ACDFD84DB8065D7F1EDAB0FC`.
- APK: 149.703.829 bytes; SHA-256 `303C9AC5A91F7D6555314AAFCB5F0402828A7D658D7B584EDC3A09BD30D060E3`.
- Build EAS: `708e33cf-746c-4ded-b82d-c0aa10e304a0`, perfil `preview`, estado `finished`.

El MP4 se decodificó de principio a fin con FFmpeg sin errores (`DECODE_OK`). Además se inspeccionaron cuadros del inicio, cada cambio de escena, la entrega de la notificación y el cierre.

## Qué muestra el video

1. Apertura del APK independiente desde Android, sin Metro.
2. Mapa MapLibre/OpenFreeMap con ISS, coordenadas, altitud, velocidad, ground track y footprint.
3. Catálogo CelesTrak y búsqueda de ISS por nombre.
4. Propagación orbital SGP4 local y actualización de la posición.
5. Capa Starlink real: 24 objetos del lote SupGP/OMM público, propagados localmente con SGP4 y visibles como múltiples puntos.
6. Predicción de pases con AOS, elevación máxima, LOS y carta celeste.
7. Brújula en estado `SIN SEÑAL`, que es el resultado honesto del emulador sin magnetómetro físico.
8. Ajustes, umbrales, antigüedad de datos y ubicación del observador.
9. GPS inyectado en el emulador: `-31.73197, -60.52380`, altitud 77 m. No se presenta como GPS físico.
10. Validación independiente contra Where the ISS at?: diferencia superficial 0,12 km, diferencia de altitud 0,01 km y delta temporal 0,0 s durante la captura.
11. Programación y entrega real de una notificación local Android. El texto aclara que es una prueba del canal y no un pase satelital.
12. Cierre nuevamente dentro de la aplicación.

## Verificado automáticamente

- `tsc --noEmit`: correcto.
- `expo lint`: correcto.
- Jest: 6 suites, 27 pruebas, 0 fallos.
- Expo Doctor: 20/20 comprobaciones correctas en la auditoría de release.
- Gradle `assembleRelease`: correcto como respaldo local.
- EAS Build cloud `preview`: correcto; APK descargado y establecido como artefacto principal.
- Firma: `apksigner verify --verbose --print-certs` correcto mediante APK Signature Scheme v2.
- Decodificación integral del video: correcta.
- Cálculos cubiertos por tests: propagación/posición, topocéntricas, predicción de pases, caché, ground track, footprint y validaciones de datos.

## Verificado en emulador Android

- Arranque del APK sin servidor de desarrollo.
- Navegación, layout vertical y controles táctiles.
- Carga real de tiles OpenFreeMap en MapLibre.
- ISS, ground track y footprint visibles.
- Catálogo, búsqueda, pases y carta celeste.
- Estado seguro de brújula sin magnetómetro (`SIN SEÑAL`) sin inventar un rumbo.
- Uso de coordenadas GPS inyectadas y cálculo del observador.
- Consulta real de Where the ISS at? y comparación en pantalla.
- Programación y recepción de una notificación local en el panel de Android.
- Carga real de 24 Starlink, desplazamiento del mapa, navegación al catálogo y regreso sin bloqueo ni pérdida de la capa.
- La primera compilación corregida se instaló limpiamente; el APK EAS final se instaló luego con `adb install -r`, devolvió `Success`, inició `MainActivity` en frío y no registró errores fatales `AndroidRuntime`/`ReactNativeJS`.
- Arranque EAS con tiles, ISS, posición, ground track y footprint cargados; evidencia en `entrega/evidencia/emulador_eas_preview_loaded.png`.

## No verificado físicamente

- Recepción GPS desde el hardware de un teléfono y comportamiento al moverse.
- Magnetómetro, calibración de brújula y `DeviceMotion` en distintas orientaciones.
- Entrega de notificaciones con la app cerrada, ahorro de batería y políticas específicas del fabricante.
- Rendimiento térmico, consumo, memoria y fluidez sostenida en el teléfono de presentación.
- Legibilidad en otras densidades/tamaños de pantalla.
- Repetición de Starlink en un teléfono y red físicos, respetando la caché de dos horas del proveedor.
- N2YO y Space-Track, porque requieren credenciales propias y un proxy HTTPS.

## Incidencia resuelta y explicada: Starlink

El HTTP 403 era el control de frecuencia documentado por CelesTrak: los lotes grandes Starlink admiten una descarga exitosa por actualización y deben reutilizarse durante al menos dos horas. El cliente anterior reintentaba el 403 tres veces. La versión final no reintenta 403/404, conserva el último lote real en SQLite durante 18 h e intenta el grupo GP/OMM público si SupGP no está disponible. No hay API keys ni posiciones simuladas.

La instalación limpia del APK actualizado obtuvo SupGP real, mostró `24 Starlink` y varios puntos calculados por SGP4. La capa siguió activa después de desplazar el mapa, navegar a Catálogo y volver. Esta prueba se realizó en emulador Android; la repetición en teléfono físico sigue pendiente.

## Lista de prueba manual en Android físico

Registrar para cada caso: modelo, versión Android, red, hora, resultado, captura y observaciones.

- [ ] Instalar el APK, abrirlo sin Metro y confirmar el icono Orbita.
- [ ] Probar arranque en frío con red y luego en modo avión usando caché.
- [ ] Aceptar ubicación; comparar las coordenadas de Ajustes con otra app GPS.
- [ ] Denegar ubicación; comprobar mensaje y ausencia de cierre inesperado.
- [ ] Buscar `ISS` y `25544`; seleccionar el resultado y volver al mapa.
- [ ] Verificar tiles, marcador, ground track y footprint; hacer zoom y desplazamiento.
- [ ] Activar Starlink y confirmar `24 Starlink`; si aparece 403, no insistir y esperar la próxima actualización o usar la caché.
- [ ] Abrir Pases; registrar AOS, MAX y LOS del primer pase y revisar la carta celeste.
- [ ] Comparar al menos un pase con un servicio externo en la misma ubicación y umbral.
- [ ] Abrir Brújula, calibrar con movimiento en ocho y comprobar cambio de rumbo.
- [ ] Inclinar el teléfono y comprobar la guía de elevación sin saltos o valores imposibles.
- [ ] Cambiar elevación mínima y aviso previo; verificar que los pases se recalculen.
- [ ] Programar la notificación de prueba de 5 s y comprobar su entrega.
- [ ] Programar un recordatorio de pase, cerrar la app y comprobar entrega/cancelación.
- [ ] Validar ISS con Where the ISS at? y guardar las diferencias mostradas.
- [ ] Rotar, cambiar tamaño de fuente del sistema y revisar cortes/solapamientos.
- [ ] Mantener el mapa abierto 10 minutos y observar fluidez, temperatura y batería.
- [ ] Repetir con Wi-Fi y datos móviles; confirmar que no se usa `localhost`.

## EAS Build preparado

`eas.json` contiene un perfil `preview` con distribución interna y `android.buildType: "apk"`. El proyecto quedó vinculado a EAS con ID `add0007a-1a6d-43f6-9b24-8801e5581d3e` y se completó un build real. Para regenerarlo, el propietario puede ejecutar, sin compartir su contraseña:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Build verificado: <https://expo.dev/accounts/lukelzi/projects/orbita-satellite-tracker/builds/708e33cf-746c-4ded-b82d-c0aa10e304a0>. La keystore remota ya existe y fue usada correctamente. El enlace del build permite descargar el APK directamente al teléfono.

## Credenciales y variables

La función base no requiere claves: CelesTrak, OpenFreeMap y Where the ISS at? son públicos. `EXPO_PUBLIC_API_PROXY_URL` sólo debe apuntar a un proxy HTTPS accesible desde el teléfono cuando se habiliten proveedores privados. `N2YO_API_KEY`, `SPACETRACK_IDENTITY` y `SPACETRACK_PASSWORD` pertenecen exclusivamente al backend y nunca deben incluirse con prefijo `EXPO_PUBLIC_` ni dentro del APK.

No se realizó push a GitHub.
