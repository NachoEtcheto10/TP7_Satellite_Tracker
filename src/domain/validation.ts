import type { OrbitalElement, SatellitePosition, ValidationPosition, ValidationResult } from './types';
import { haversineDistanceKm } from './geometry';
import { orbitalAgeHours } from './orbital';

export function comparePositions(local: SatellitePosition, remote: ValidationPosition, element: OrbitalElement): ValidationResult {
  return {
    provider: remote.provider,
    local,
    remote,
    distanceKm: haversineDistanceKm(local, remote),
    altitudeDifferenceKm: local.altitudeKm === undefined || remote.altitudeKm === undefined
      ? null : Math.abs(local.altitudeKm - remote.altitudeKm),
    timestampDifferenceSeconds: Math.abs(local.timestamp.getTime() - remote.timestamp.getTime()) / 1000,
    orbitalAgeHours: orbitalAgeHours(element, local.timestamp),
  };
}
