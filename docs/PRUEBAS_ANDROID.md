# Pruebas manuales Android

Completar en el teléfono que se usará para la presentación. No marcar una prueba como correcta sin observarla.

| ID | Prueba | Resultado esperado | Estado inicial |
|---|---|---|---|
| A01 | Instalar `entrega/SatelliteTracker.apk` | Instala el paquete `ar.edu.uader.orbita` y muestra el ícono Orbita | Pendiente físico |
| A02 | Arranque en frío sin computadora | Abre sin Metro, Expo Go ni cable USB | Pendiente físico |
| A03 | Mapa MapLibre/OpenFreeMap | Tiles reales, atribución, ISS, ground track y footprint | Verificado emulador; repetir físico |
| A04 | Capa Starlink | Indica `24 Starlink` y aparecen puntos sin bloquear el mapa | Verificado emulador; repetir físico |
| A05 | Zoom, desplazamiento y rotación | Gestos fluidos; marcador/capas permanecen alineados | Desplazamiento verificado emulador; repetir físico |
| A06 | Ubicación aprobada | Coordenadas reales; azimut, elevación y pases disponibles | Pendiente físico |
| A07 | Ubicación denegada | Mensaje claro, sin cierre; se permite observador manual | Pendiente físico |
| A08 | Brújula calibrada | Rumbo cambia coherentemente al girar el equipo | Pendiente físico |
| A09 | Inclinación | Indicador cambia al inclinar el equipo | Pendiente físico |
| A10 | Pases y sky chart | AOS, máximo, LOS y trazado polar legibles | Verificado emulador; repetir físico |
| A11 | Programar/cancelar notificación | Permiso, canal, alerta y cancelación funcionan | Canal y alerta verificados emulador; repetir cerrado/físico |
| A12 | Datos vencidos/offline | Continúa desde SQLite y muestra antigüedad real | Pendiente físico |
| A13 | Búsqueda nombre/NORAD | `ISS` y `25544` devuelven el mismo objeto | Verificado emulador; repetir físico |
| A14 | Responsive | Sin cortes ni superposición en orientación vertical | Verificado 1080 × 1920; pendiente en modelo final |

Registrar modelo, Android, timestamp, resultado observado, captura y cualquier diferencia.
