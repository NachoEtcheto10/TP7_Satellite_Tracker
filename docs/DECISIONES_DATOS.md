# Decisiones sobre fuentes de datos

## CelesTrak

CelesTrak es la fuente primaria. Se solicita `FORMAT=JSON`, compatible con OMM, tanto por NORAD ID como por grupos. Los catálogos configurados son estaciones, Starlink, GPS operacional, meteorológicos y activos. La caché SQLite usa TTL de 18 horas, dentro del intervalo de 12 a 24 horas indicado en la consigna. Cuando una actualización falla, se puede usar una entrada vencida identificando por separado época orbital y fecha de descarga.

Desde marzo de 2026 CelesTrak aplica a los lotes grandes una descarga exitosa por actualización (aproximadamente cada dos horas) y devuelve HTTP 403 si la misma IP repite la consulta. El cliente respeta esa política: no reintenta 403/404, conserva el último lote real en SQLite y nunca consulta por cada refresco del mapa.

## Starlink y SupGP

No existe una API pública oficial general de posiciones Starlink. La app no consume posiciones remotas por marcador: intenta primero el lote SupGP/OMM que CelesTrak deriva de efemérides del operador y, si esa consulta no está disponible, usa el grupo público GP/OMM `STARLINK`. Ambos caminos contienen elementos orbitales reales; las posiciones se calculan localmente mediante SGP4. Para SupGP se elige la época más cercana por NORAD y para el mapa se toma una muestra uniforme de 24 objetos a través de todo el lote, evitando concentrarse en las primeras filas.

## Space-Track

Space-Track es fallback de catálogo y elementos orbitales, no de validación. Requiere cuenta. Las credenciales se guardan sólo en el proceso backend. El proxy conserva la sesión mediante cookie y limita la exposición a endpoints concretos.

## N2YO

N2YO se usa únicamente para validación de una posición. La clave queda en `N2YO_API_KEY` del backend. La app propaga el satélite exactamente al timestamp devuelto antes de calcular la distancia, para no confundir movimiento durante la latencia con error orbital.

## Where the ISS at?

Es una fuente de validación independiente sin credenciales, limitada a NORAD 25544. Nunca actúa como catálogo ni fallback orbital genérico. El cliente limita las consultas a aproximadamente una por segundo.

## Fallback, reintentos y límites

El orquestador sólo considera proveedores que declaran la capacidad pedida. Los fallos transitorios seleccionados tienen backoff exponencial; los códigos no recuperables, en particular 403 y 404, detienen de inmediato esa consulta. El rate limiter es por proveedor y la caché evita que el refresco visual genere llamadas externas. La posición del mapa se actualiza por SGP4 local cada dos segundos.
