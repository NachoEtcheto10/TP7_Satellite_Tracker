import { predictPasses } from '@/domain/passes';
import { issRecord, paranaObserver } from './fixtures';

describe('predicción de pases', () => {
  test('encuentra AOS, máximo y LOS ordenados con refinamiento', () => {
    const passes = predictPasses(issRecord, paranaObserver, {
      start: new Date('2026-10-25T12:00:00Z'), horizonHours: 48, minElevationDeg: 5,
    });
    expect(passes.length).toBeGreaterThan(0);
    for (const pass of passes) {
      expect(pass.aos.getTime()).toBeLessThan(pass.maxElevationAt.getTime());
      expect(pass.maxElevationAt.getTime()).toBeLessThan(pass.los.getTime());
      expect(pass.maxElevationDeg).toBeGreaterThanOrEqual(5);
      expect(pass.samples.length).toBeGreaterThan(3);
    }
  });

  test('devuelve vacío cuando el umbral impide pases', () => {
    const passes = predictPasses(issRecord, paranaObserver, {
      start: new Date('2026-10-25T12:00:00Z'), horizonHours: 2, minElevationDeg: 89.9,
    });
    expect(passes).toEqual([]);
  });

  test('marca un pase ya iniciado sin inventar un AOS anterior', () => {
    const initial = predictPasses(issRecord, paranaObserver, {
      start: new Date('2026-10-25T12:00:00Z'), horizonHours: 48, minElevationDeg: 5,
    })[0];
    const during = new Date((initial.aos.getTime() + initial.maxElevationAt.getTime()) / 2);
    const passes = predictPasses(issRecord, paranaObserver, { start: during, horizonHours: 6, minElevationDeg: 5 });
    expect(passes[0].inProgress).toBe(true);
    expect(passes[0].aos).toEqual(during);
    expect(passes[0].los.getTime()).toBeGreaterThan(during.getTime());
  });
});
