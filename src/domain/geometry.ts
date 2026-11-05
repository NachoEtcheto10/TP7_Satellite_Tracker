import type { GeoPoint, SatelliteRecord } from './types';
import { orbitalPeriodMinutes, propagateSatellite } from './orbital';

export const EARTH_RADIUS_KM = 6371.0088;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function splitAtAntimeridian(points: GeoPoint[]): GeoPoint[][] {
  if (points.length === 0) return [];
  const segments: GeoPoint[][] = [[points[0]]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (Math.abs(current.longitude - previous.longitude) > 180) segments.push([]);
    segments.at(-1)!.push(current);
  }
  return segments.filter((segment) => segment.length > 1);
}

export function groundTrack(record: SatelliteRecord, center: Date, stepSeconds = 45): GeoPoint[][] {
  const periodMs = orbitalPeriodMinutes(record.meanMotionRevPerDay) * 60_000;
  const points: GeoPoint[] = [];
  for (let offset = -periodMs; offset <= periodMs; offset += stepSeconds * 1000) {
    points.push(propagateSatellite(record, new Date(center.getTime() + offset)));
  }
  return splitAtAntimeridian(points);
}

export function footprintAngularRadiusDeg(altitudeKm: number, minElevationDeg: number): number {
  if (altitudeKm < 0) return 0;
  const elevation = Math.max(0, Math.min(90, minElevationDeg)) * RAD;
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);
  return (Math.acos(ratio * Math.cos(elevation)) - elevation) * DEG;
}

export function destinationPoint(center: GeoPoint, bearingDeg: number, distanceDeg: number): GeoPoint {
  const lat1 = center.latitude * RAD;
  const lon1 = center.longitude * RAD;
  const bearing = bearingDeg * RAD;
  const angular = distanceDeg * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
    Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
  );
  return { latitude: lat2 * DEG, longitude: normalizeLongitude(lon2 * DEG) };
}

export function footprint(center: GeoPoint, altitudeKm: number, minElevationDeg: number, samples = 96): GeoPoint[][] {
  const radius = footprintAngularRadiusDeg(altitudeKm, minElevationDeg);
  const ring = Array.from({ length: samples }, (_, index) => destinationPoint(center, (index / samples) * 360, radius));
  return splitPolygonAtAntimeridian(ring);
}

export function splitPolygonAtAntimeridian(ring: GeoPoint[]): GeoPoint[][] {
  if (ring.length < 3) return [];
  const unwrapped: GeoPoint[] = [];
  for (const point of ring) {
    let lon = point.longitude;
    const previous = unwrapped.at(-1)?.longitude;
    if (previous !== undefined) {
      while (lon - previous > 180) lon -= 360;
      while (lon - previous < -180) lon += 360;
    }
    unwrapped.push({ ...point, longitude: lon });
  }
  const polygons: GeoPoint[][] = [];
  for (const shift of [-360, 0, 360]) {
    const shifted = unwrapped.map((p) => ({ ...p, longitude: p.longitude + shift }));
    const clipped = clipLongitude(clipLongitude(shifted, -180, true), 180, false);
    if (clipped.length >= 3) polygons.push(clipped.map((p) => ({ ...p, longitude: normalizeLongitude(p.longitude) })));
  }
  return polygons;
}

function clipLongitude(points: GeoPoint[], boundary: number, keepGreater: boolean): GeoPoint[] {
  const output: GeoPoint[] = [];
  const inside = (point: GeoPoint) => keepGreater ? point.longitude >= boundary : point.longitude <= boundary;
  const intersect = (a: GeoPoint, b: GeoPoint): GeoPoint => {
    const t = (boundary - a.longitude) / (b.longitude - a.longitude);
    return { latitude: a.latitude + t * (b.latitude - a.latitude), longitude: boundary };
  };
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    if (inside(current)) {
      if (!inside(previous)) output.push(intersect(previous, current));
      output.push(current);
    } else if (inside(previous)) output.push(intersect(previous, current));
  }
  return output;
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLon = (b.longitude - a.longitude) * RAD;
  const lat1 = a.latitude * RAD;
  const lat2 = b.latitude * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function normalizeLongitude(value: number): number {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}
