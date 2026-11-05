import { destinationPoint, footprint, footprintAngularRadiusDeg, groundTrack, haversineDistanceKm, splitAtAntimeridian } from '@/domain/geometry';
import { issRecord } from './fixtures';

describe('geometría terrestre', () => {
  test('divide polilíneas que cruzan el antimeridiano', () => {
    const segments = splitAtAntimeridian([
      { latitude: 0, longitude: 170 }, { latitude: 1, longitude: 179 },
      { latitude: 2, longitude: -179 }, { latitude: 3, longitude: -170 },
    ]);
    expect(segments).toHaveLength(2);
    for (const segment of segments) for (let i = 1; i < segment.length; i += 1) {
      expect(Math.abs(segment[i].longitude - segment[i - 1].longitude)).toBeLessThanOrEqual(180);
    }
  });

  test('footprint disminuye al aumentar la elevación mínima', () => {
    expect(footprintAngularRadiusDeg(420, 0)).toBeGreaterThan(footprintAngularRadiusDeg(420, 10));
    expect(footprintAngularRadiusDeg(420, 10)).toBeGreaterThan(footprintAngularRadiusDeg(420, 30));
  });

  test('recorta footprint que cruza ±180°', () => {
    const polygons = footprint({ latitude: 0, longitude: 179 }, 550, 5, 96);
    expect(polygons.length).toBeGreaterThanOrEqual(2);
    polygons.flat().forEach((point) => expect(Math.abs(point.longitude)).toBeLessThanOrEqual(180));
  });

  test('distancia geográfica y destino son coherentes', () => {
    const destination = destinationPoint({ latitude: 0, longitude: 0 }, 90, 10);
    expect(destination.latitude).toBeCloseTo(0, 6);
    expect(destination.longitude).toBeCloseTo(10, 6);
    expect(haversineDistanceKm({ latitude: 0, longitude: 0 }, destination)).toBeCloseTo(1111.95, 0);
  });

  test('ground track cubre dos períodos y no dibuja saltos sobre el mapa', () => {
    const segments = groundTrack(issRecord, new Date('2026-10-25T12:00:00Z'));
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.flat().length).toBeGreaterThan(200);
    for (const segment of segments) for (let index = 1; index < segment.length; index += 1) {
      expect(Math.abs(segment[index].longitude - segment[index - 1].longitude)).toBeLessThanOrEqual(180);
    }
  });
});
