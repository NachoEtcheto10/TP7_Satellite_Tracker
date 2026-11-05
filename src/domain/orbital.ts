import {
  degreesLat,
  degreesLong,
  ecfToLookAngles,
  eciToEcf,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
  twoline2satrec,
  type EciVec3,
  type OMMJsonObject,
} from 'satellite.js';
import { OrbitalDataError, PropagationError } from './errors';
import type { LookAngles, Observer, OrbitalElement, SatellitePosition, SatelliteRecord } from './types';

const RAD = Math.PI / 180;

export function createSatelliteRecord(element: OrbitalElement): SatelliteRecord {
  const satrec = element.omm
    ? json2satrec(element.omm)
    : element.tle
      ? twoline2satrec(element.tle.line1, element.tle.line2)
      : null;
  if (!satrec) throw new OrbitalDataError('El registro no contiene OMM ni TLE.');
  if (satrec.error !== 0) throw new OrbitalDataError(`satellite.js rechazó los elementos (SatRec ${satrec.error}).`);
  return { ...element, satrec };
}

export function orbitalElementFromOmm(omm: OMMJsonObject, source: string, downloadedAt = new Date()): OrbitalElement {
  const epochText = String(omm.EPOCH);
  const epoch = new Date(epochText.endsWith('Z') ? epochText : `${epochText}Z`);
  const noradId = Number(omm.NORAD_CAT_ID);
  const meanMotionRevPerDay = Number(omm.MEAN_MOTION);
  if (!Number.isFinite(epoch.getTime()) || !Number.isFinite(noradId) || !Number.isFinite(meanMotionRevPerDay)) {
    throw new OrbitalDataError('OMM inválido: época, NORAD ID o movimiento medio ausente.');
  }
  return {
    noradId,
    name: String(omm.OBJECT_NAME),
    objectId: omm.OBJECT_ID ? String(omm.OBJECT_ID) : undefined,
    epoch,
    meanMotionRevPerDay,
    omm,
    source,
    downloadedAt,
  };
}

export function propagateSatellite(record: SatelliteRecord, at: Date): SatellitePosition {
  const state = propagate(record.satrec, at);
  if (!state || !state.position) throw new PropagationError(`SGP4 no produjo una posición válida para ${at.toISOString()}.`);
  const gmst = gstime(at);
  const geo = eciToGeodetic(state.position, gmst);
  const velocityKmS = state.velocity ? Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z) : null;
  return {
    latitude: degreesLat(geo.latitude),
    longitude: degreesLong(geo.longitude),
    altitudeKm: geo.height,
    timestamp: at,
    velocityKmS,
    eciKm: state.position,
  };
}

export function calculateLookAngles(record: SatelliteRecord, observer: Observer, at: Date): LookAngles {
  const state = propagate(record.satrec, at);
  if (!state || !state.position) throw new PropagationError('No se pudo calcular la posición topocéntrica.');
  const ecf = eciToEcf(state.position as EciVec3<number>, gstime(at));
  const look = ecfToLookAngles(
    {
      latitude: observer.latitude * RAD,
      longitude: observer.longitude * RAD,
      height: observer.altitudeMeters / 1000,
    },
    ecf,
  );
  return {
    azimuthDeg: normalizeDegrees(look.azimuth / RAD),
    elevationDeg: look.elevation / RAD,
    rangeKm: look.rangeSat,
  };
}

export function orbitalPeriodMinutes(meanMotionRevPerDay: number): number {
  if (!(meanMotionRevPerDay > 0)) throw new OrbitalDataError('Movimiento medio inválido.');
  return 1440 / meanMotionRevPerDay;
}
export function orbitalAgeHours(element: OrbitalElement, at = new Date()): number {
  return (at.getTime() - element.epoch.getTime()) / 3_600_000;
}
export function normalizeDegrees(value: number): number { return ((value % 360) + 360) % 360; }
export function angularDifferenceDegrees(target: number, heading: number): number {
  return ((target - heading + 540) % 360) - 180;
}
