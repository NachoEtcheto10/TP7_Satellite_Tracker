import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { degreesLat, degreesLong, eciToGeodetic, gstime, json2satrec, propagate } from 'satellite.js';

const celestrakUrl = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
const controlUrl = 'https://api.wheretheiss.at/v1/satellites/25544';
const output = resolve('entrega/evidencia/validacion_iss.json');

const [omm] = await fetchJson(celestrakUrl);
const control = await fetchJson(controlUrl);
const at = new Date(control.timestamp * 1000);
const state = propagate(json2satrec(omm), at);
if (!state?.position) throw new Error('SGP4 no devolvió una posición para la muestra.');
const geo = eciToGeodetic(state.position, gstime(at));
const local = {
  latitude: degreesLat(geo.latitude), longitude: degreesLong(geo.longitude),
  altitudeKm: geo.height, timestamp: at.toISOString(),
};
const remote = {
  latitude: control.latitude, longitude: control.longitude,
  altitudeKm: control.altitude, timestamp: at.toISOString(),
};
const distanceKm = haversine(local, remote);
const evidence = {
  generatedAt: new Date().toISOString(),
  method: 'CelesTrak GP/OMM propagado con satellite.js al timestamp de WhereTheISS',
  requests: { celestrakUrl, controlUrl },
  versions: { satelliteJs: '6.0.1' },
  raw: { omm, whereTheIss: control },
  computed: {
    local, remote, distanceKm,
    altitudeDifferenceKm: Math.abs(local.altitudeKm - remote.altitudeKm),
    orbitalAgeHours: (at.getTime() - new Date(`${omm.EPOCH}Z`).getTime()) / 3_600_000,
  },
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence.computed, null, 2));

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Orbita-TP7-validation/1.0' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function haversine(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
