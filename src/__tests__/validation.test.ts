import { comparePositions } from '@/domain/validation';
import { issRecord } from './fixtures';

test('compara timestamps coherentes y distancia sin inventar altitud', () => {
  const at = new Date('2026-10-25T23:00:00Z');
  const result = comparePositions(
    { latitude: 0, longitude: 0, altitudeKm: 420, timestamp: at, velocityKmS: 7.6, eciKm: { x: 1, y: 2, z: 3 } },
    { latitude: 0, longitude: 1, timestamp: new Date(at.getTime() + 2000), provider: 'fixture' },
    issRecord,
  );
  expect(result.distanceKm).toBeCloseTo(111.2, 0);
  expect(result.altitudeDifferenceKm).toBeNull();
  expect(result.timestampDifferenceSeconds).toBe(2);
});
