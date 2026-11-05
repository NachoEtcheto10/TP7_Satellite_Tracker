# Guion de demostración Android

## Preparación

1. Instalar `SatelliteTracker.apk`, habilitando temporalmente la instalación desde la fuente elegida.
2. Activar Wi-Fi o datos móviles para la primera carga. No se requiere cuenta ni API key.
3. Activar ubicación y calibrar la brújula con un movimiento en forma de ocho.
4. Abrir Orbita, aceptar ubicación y notificaciones. Si se va a demostrar el caso negativo, grabar también el comportamiento al denegar.
5. Esperar a que desaparezca el estado de carga y confirmar que se muestran fuente y edad orbital.

## Secuencia sugerida de video

1. **Catálogo y búsqueda.** Ir a Catálogo, buscar `ISS` y después `25544`. Mostrar los filtros de constelación y seleccionar ISS (ZARYA).
2. **Mapa nativo.** Volver a Mapa. Hacer zoom y desplazamiento. Señalar mosaicos OpenFreeMap, atribución MapLibre, marcador de ISS, posición, altitud y velocidad.
3. **Ground track y footprint.** Seguir la línea pasada/futura y el área de cobertura. Mencionar que la geometría corta el antimeridiano para no unir extremos del mapa.
4. **Starlink.** Pulsar `Capa Starlink`, confirmar `24 Starlink` y desplazar el mapa para mostrar varios puntos propagados con SGP4.
5. **Pases y sky chart.** Abrir Pases, confirmar observador GPS, mostrar AOS, máxima elevación, LOS y el gráfico polar.
6. **Notificación.** Programar una alerta para un pase próximo, mostrarla en la lista, cancelarla y volver a crearla. Para evidenciar entrega real, usar un pase o prueba con horario cercano permitido por la interfaz.
7. **Brújula.** Abrir Brújula, girar lentamente el teléfono y mostrar que cambian rumbo y guía. Inclinarlo para evidenciar DeviceMotion. Evitar objetos metálicos durante la toma.
8. **Vigencia y ajustes.** Abrir Ajustes y explicar TTL de 18 h, elevación mínima del footprint y separación entre época orbital y última descarga.
9. **Offline.** Tras una primera carga exitosa, activar modo avión, reiniciar la app y mostrar que los cálculos continúan desde SQLite. La antigüedad visible evita presentar datos vencidos como nuevos.

## Registro manual

Anotar para cada prueba: modelo y versión Android, hora, permiso aprobado/denegado, resultado esperado, resultado observado y captura. Registrar como fallo cualquier pantalla en blanco, cierre, demora excesiva, texto cortado o mapa sin tiles.

## Cierre de la presentación

Indicar que CelesTrak y OpenFreeMap son fuentes públicas; SGP4 se ejecuta localmente; Where the ISS at? se usó como control independiente. Aclarar que N2YO y Space-Track son opcionales y no se presentaron como validados sin credenciales.
