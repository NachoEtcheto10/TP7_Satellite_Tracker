# Informe técnico - Orbita Satellite Tracker

## Modelo orbital

La aplicación usa `satellite.js` 6.0.1, que implementa SGP4 y selecciona internamente el tratamiento de espacio profundo cuando corresponde. Los elementos principales son OMM/JSON de CelesTrak. Esta elección evita el límite histórico de cinco dígitos del formato TLE y conserva compatibilidad mediante `twoline2satrec`.

El flujo de cálculo es: OMM -> `json2satrec` -> propagación TEME/ECI en una fecha UTC -> tiempo sideral de Greenwich -> coordenadas geodéticas WGS-72 y ECF. La velocidad mostrada es el módulo del vector ECI en km/s. Si `propagate` no entrega posición o SatRec informa error, la aplicación detiene ese cálculo y muestra el error; no sustituye el resultado.

## Observador y topocéntricas

La ubicación se obtiene con permiso foreground de Android o se ingresa manualmente. Latitud y longitud se convierten de grados a radianes; la altitud del observador pasa de metros a kilómetros. `ecfToLookAngles` produce azimut, elevación y distancia. El azimut se normaliza a 0-360 grados.

## Pases

El predictor explora 72 horas con paso grueso de 60 segundos. Cada cruce del umbral se refina por bisección hasta un segundo. La máxima elevación se busca por tercios dentro de AOS/LOS. Si el horizonte comienza durante un pase, se marca `inProgress`. Si no hay cruces, se informa una lista vacía.

## Ground track y footprint

El ground track muestrea desde un período orbital antes hasta un período después del instante actual, cada 45 segundos. El período surge de `1440 / movimiento_medio`. Las polilíneas se separan cuando dos longitudes consecutivas difieren más de 180 grados.

El radio angular de cobertura para altitud `h`, radio terrestre `R` y elevación mínima `e` es:

`psi = acos((R / (R + h)) cos(e)) - e`

Se generan puntos geodésicos por rumbo sobre una esfera de radio medio 6371,0088 km. Si el anillo cruza el antimeridiano, se desenvuelve y recorta contra -180 y +180 para producir polígonos independientes.

## Supuestos y limitaciones

- SGP4 reproduce la órbita descrita por los elementos; no es una efeméride de precisión ni incorpora maniobras futuras.
- No se aplican refracción atmosférica, horizonte topográfico, máscara de edificios ni corrección ionosférica.
- La Tierra se trata con el modelo de `satellite.js` para propagación y como esfera media para distancias y footprint.
- La brújula consume el heading calibrado que Android expone mediante `expo-location`, usa norte verdadero cuando está disponible y norte magnético como fallback, e informa la calidad de calibración. Ofrece orientación asistida, no realidad aumentada certificada.
- Android puede demorar notificaciones por ahorro de batería. Los recordatorios exactos dependen del permiso de alarmas exactas.
