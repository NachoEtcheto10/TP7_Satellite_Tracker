import type { OMMJsonObject } from 'satellite.js';
import { createSatelliteRecord, orbitalElementFromOmm } from '@/domain/orbital';

// Fuente: CelesTrak GP JSON, NORAD 25544, descargado 2026-10-25T23:10:00Z.
export const issOmm = {
  OBJECT_NAME: 'ISS (ZARYA)',
  OBJECT_ID: '1998-067A',
  EPOCH: '2026-10-25T11:59:10.479840',
  MEAN_MOTION: 15.49050058,
  ECCENTRICITY: 0.00069031,
  INCLINATION: 51.6337,
  RA_OF_ASC_NODE: 15.2393,
  ARG_OF_PERICENTER: 308.0649,
  MEAN_ANOMALY: 51.9716,
  EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U',
  NORAD_CAT_ID: 25544,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 59195,
  BSTAR: 0.00013616087,
  MEAN_MOTION_DOT: 0.00007074,
  MEAN_MOTION_DDOT: 0,
} as OMMJsonObject;

export const issRecord = createSatelliteRecord(orbitalElementFromOmm(issOmm, 'CelesTrak fixture', new Date('2026-10-25T23:10:00Z')));
export const paranaObserver = {
  latitude: -31.7413,
  longitude: -60.5115,
  altitudeMeters: 77,
  source: 'manual' as const,
  measuredAt: new Date('2026-10-25T23:10:00Z'),
};
