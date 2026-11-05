# Estado de entrega — TP7 Satellite Tracker

Fecha de cierre técnico: 31/10/2026. Los estados distinguen prueba automática, prueba en emulador Android y prueba física pendiente.

## Requisitos funcionales

| RF | Estado real | Evidencia |
|---|---|---|
| RF-01 | Verificado automáticamente; navegación Android revisada | Búsqueda por nombre/NORAD y catálogos CelesTrak. |
| RF-02 | Verificado automáticamente y visible en emulador | SGP4 local desde OMM/TLE; posición y velocidad de ISS actualizadas. |
| RF-03 | Cálculo verificado; GPS físico pendiente | Conversión topocéntrica testeada. El emulador no acredita recepción GPS real. |
| RF-04 | Verificado automáticamente | AOS, máximo y LOS, incluido pase en curso y ausencia de pases. |
| RF-05 | Verificado automáticamente; inspección física pendiente | Sky chart SVG con horizonte, cardinales, trayectoria y máximo. |
| RF-06 | Verificado automáticamente y en emulador; teléfono físico pendiente | Programación, persistencia y cancelación. La notificación local de prueba fue entregada realmente por Android durante la grabación. |
| RF-07 | Implementado; sensores físicos pendientes | Heading y DeviceMotion contemplan indisponibilidad/calibración. |
| RF-08 | Verificado automáticamente | Filtros de estaciones, Starlink, GPS, meteorológicos y activos. |
| RF-09 | Verificado automáticamente | SQLite, TTL 18 h, caché vencida como respaldo, reintentos y rate limiting. |
| RF-10 | Verificado en emulador Android release | OpenFreeMap cargó realmente; marcador ISS, zoom y desplazamiento nativos. |
| RF-11 | Verificado automáticamente y visualmente | Dos períodos, muestreo temporal y corte al cruzar ±180°. Línea nativa sin artefactos de dash. |
| RF-12 | Verificado automáticamente y visualmente | Footprint por elevación mínima, polígonos GeoJSON y recorte antimeridiano. |
| RF-13 | Verificado automáticamente y en emulador | Instalación limpia: 24 Starlink reales desde SupGP/OMM, posiciones SGP4, varios puntos y mapa/navegación sin bloqueo. |
| RF-14 | Verificado automáticamente | Abstracción por capacidad, caché, límites y fallback; N2YO/Space-Track se omiten sin configuración. |
| RF-15 | Verificado con datos públicos reales | Evidencia reproducible: 0,097841 km en superficie y 0,027621 km en altitud frente a Where the ISS at?. N2YO pendiente. |
| RF-16 | Verificado automáticamente y visible | Época, edad orbital y antigüedad de caché diferenciadas; alerta de datos antiguos. |

## Ejecuciones realizadas

- TypeScript estricto: correcto.
- ESLint Expo: correcto.
- Jest: 6 suites y 27 pruebas correctas.
- Expo Doctor: 20/20 comprobaciones correctas.
- Export Android/Hermes: correcto, 1.491 módulos.
- `npx expo run:android`: development build compilado e instalado.
- Gradle `assembleRelease`: correcto; APK independiente generado.
- Firma: APK Signature Scheme v2 válido, un firmante remoto administrado por EAS.
- Arranque release: proceso activo sin Metro; `ReactNativeJS: Running "main"` y sin excepción JS registrada.
- HTTP real: CelesTrak GP/OMM, SupGP Starlink, OpenFreeMap y Where the ISS at? respondieron; SupGP mostró 24 objetos. El 403 previo quedó identificado como límite documentado de una descarga por actualización.
- Integración visual Android: mapa, tiles, atribución, ISS, ground track y footprint observados en emulador. La notificación local se recibió realmente.
- Video final: H.264 1080 × 1920, 30 fps, 1:57,3; decodificación completa sin errores y Starlink visible.
- EAS: build cloud `preview` finalizado (`708e33cf-746c-4ded-b82d-c0aa10e304a0`), descargado, firmado, instalado y abierto en emulador.

## APK

- Ruta: `entrega/SatelliteTracker.apk`
- Paquete: `ar.edu.uader.orbita`
- Tamaño final: 149.703.829 bytes.
- SHA-256: `303C9AC5A91F7D6555314AAFCB5F0402828A7D658D7B584EDC3A09BD30D060E3`.
- Firma: APK Signature Scheme v2 válido con la keystore remota administrada por EAS.
- Instalación final: `adb install -r` correcto; arranque en frío de `MainActivity`, proceso activo y sin errores críticos de Android/React Native.

## Pendientes honestos

- Instalar en un teléfono Android físico y repetir arranque en frío/sin red.
- Aprobar y denegar ubicación; comprobar GPS, azimut y elevación con coordenadas reales.
- Calibrar y comprobar brújula/DeviceMotion moviendo el teléfono.
- Repetir entrega/cancelación de notificaciones con la app cerrada y bajo ahorro de batería; revisar alarma exacta en Android 12+.
- Repetir Starlink en teléfono físico y confirmar el comportamiento de caché en Wi-Fi/datos móviles sin reiterar consultas durante dos horas.
- Revisar fluidez y legibilidad en el modelo de teléfono usado para grabar.
- N2YO y Space-Track sólo pueden probarse con credenciales propias; no son necesarios para el funcionamiento base.

## Archivos para entregar

- `SatelliteTracker.apk`
- `DEMO_SATELLITE_TRACKER.mp4`
- `REPORTE_PRUEBAS_VIDEO.md`
- `INFORME_TECNICO.pdf`
- `VALIDACION.pdf`
- `DECISIONES_DATOS.pdf`
- `GUION_DEMO.md`
- `ESTADO_ENTREGA.md`
- `evidencia/validacion_iss.json`
- `evidencia/emulador_*.png` (capturas auténticas; no son pruebas de teléfono físico)
- Proyecto fuente completo y `README.md`.

No se realizó push a GitHub.
