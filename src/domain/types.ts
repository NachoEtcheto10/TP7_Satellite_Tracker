import type { OMMJsonObject, SatRec } from 'satellite.js';

export type SatelliteCategory = 'stations' | 'starlink' | 'gps' | 'weather' | 'active';
export type GeoPoint = { latitude: number; longitude: number; altitudeKm?: number };
export type Observer = {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  source: 'gps' | 'manual';
  measuredAt: Date;
};
export type OrbitalElement = {
  noradId: number;
  name: string;
  objectId?: string;
  epoch: Date;
  meanMotionRevPerDay: number;
  omm?: OMMJsonObject;
  tle?: { line1: string; line2: string };
  source: string;
  downloadedAt: Date;
};
export type SatelliteRecord = OrbitalElement & { satrec: SatRec };
export type SatellitePosition = GeoPoint & {
  timestamp: Date;
  velocityKmS: number | null;
  eciKm: { x: number; y: number; z: number };
};
export type LookAngles = { azimuthDeg: number; elevationDeg: number; rangeKm: number };
export type PassWindow = {
  aos: Date;
  maxElevationAt: Date;
  los: Date;
  maxElevationDeg: number;
  inProgress: boolean;
  samples: { at: Date; azimuthDeg: number; elevationDeg: number }[];
};
export type CatalogItem = {
  noradId: number;
  name: string;
  objectId?: string;
  category: SatelliteCategory;
  epoch: Date;
};
export type ValidationPosition = GeoPoint & {
  timestamp: Date;
  provider: string;
  velocityKmS?: number;
};
export type ValidationResult = {
  provider: string;
  local: SatellitePosition;
  remote: ValidationPosition;
  distanceKm: number;
  altitudeDifferenceKm: number | null;
  timestampDifferenceSeconds: number;
  orbitalAgeHours: number;
};
export type CacheEntry<T> = { value: T; savedAt: Date; expiresAt: Date };
