import { propagateSatellite } from '@/domain/orbital';
import { predictPasses } from '@/domain/passes';
import { issRecord, paranaObserver } from './fixtures';

test('propaga un lote de 100 estados sin bloquear de forma excesiva', () => {
  const start = performance.now();
  for (let index = 0; index < 100; index += 1) {
    propagateSatellite(issRecord, new Date(Date.parse('2026-10-25T12:00:00Z') + index * 30_000));
  }
  expect(performance.now() - start).toBeLessThan(1000);
});

test('predice 72 horas de pases sin bloquear de forma excesiva', () => {
  const start = performance.now();
  const passes = predictPasses(issRecord, paranaObserver, {
    start: new Date('2026-10-25T12:00:00Z'), horizonHours: 72, minElevationDeg: 10,
  });
  expect(passes.length).toBeGreaterThan(0);
  expect(performance.now() - start).toBeLessThan(2000);
});
