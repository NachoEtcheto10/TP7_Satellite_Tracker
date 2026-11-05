import { angularDifferenceDegrees, createSatelliteRecord, calculateLookAngles, orbitalAgeHours, orbitalElementFromOmm, orbitalPeriodMinutes, propagateSatellite } from '@/domain/orbital';
import { issOmm, issRecord, paranaObserver } from './fixtures';

describe('motor orbital SGP4', () => {
  test('convierte OMM real y conserva época UTC', () => {
    const element = orbitalElementFromOmm(issOmm, 'fixture');
    expect(element.noradId).toBe(25544);
    expect(element.epoch.toISOString()).toBe('2026-10-25T11:59:10.479Z');
    expect(createSatelliteRecord(element).satrec.error).toBe(0);
  });

  test('convierte TLE mediante twoline2satrec', () => {
    const record = createSatelliteRecord({
      noradId: 25544, name: 'ISS', epoch: new Date('2020-01-29T13:08:59Z'), meanMotionRevPerDay: 15.49147112,
      tle: {
        line1: '1 25544U 98067A   20029.54791435  .00000705  00000-0  19624-4 0  9993',
        line2: '2 25544  51.6436  35.2862 0007417  50.5031  79.6873 15.49147112210616',
      }, source: 'CelesTrak fixture', downloadedAt: new Date('2020-01-29T13:09:00Z'),
    });
    expect(record.satrec.error).toBe(0);
    expect(propagateSatellite(record, new Date('2020-01-29T13:09:00Z')).altitudeKm).toBeGreaterThan(390);
  });

  test('propaga posición, velocidad y coordenadas topocéntricas finitas', () => {
    const at = new Date('2026-10-25T23:09:41Z');
    const position = propagateSatellite(issRecord, at);
    const look = calculateLookAngles(issRecord, paranaObserver, at);
    expect(position.latitude).toBeGreaterThanOrEqual(-90);
    expect(position.latitude).toBeLessThanOrEqual(90);
    expect(position.longitude).toBeGreaterThanOrEqual(-180);
    expect(position.longitude).toBeLessThanOrEqual(180);
    expect(position.altitudeKm).toBeGreaterThan(350);
    expect(position.velocityKmS).toBeCloseTo(7.66, 1);
    expect(look.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(look.azimuthDeg).toBeLessThan(360);
    expect(Number.isFinite(look.elevationDeg)).toBe(true);
    expect(look.rangeKm).toBeGreaterThan(0);
  });

  test('calcula período LEO coherente', () => {
    expect(orbitalPeriodMinutes(issRecord.meanMotionRevPerDay)).toBeCloseTo(92.96, 1);
  });

  test('calcula edad orbital y giro mínimo atravesando el norte', () => {
    expect(orbitalAgeHours(issRecord, new Date('2026-10-25T23:59:10.479Z'))).toBeCloseTo(12, 5);
    expect(angularDifferenceDegrees(10, 350)).toBe(20);
    expect(angularDifferenceDegrees(350, 10)).toBe(-20);
  });
});
