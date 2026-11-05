import type { OMMJsonObject } from 'satellite.js';
import { MissingCredentialsError, ProviderUnavailableError } from '@/domain/errors';
import { orbitalElementFromOmm } from '@/domain/orbital';
import type { CatalogItem, OrbitalElement, SatelliteCategory, ValidationPosition } from '@/domain/types';
import type { CacheStore } from './cacheStore';
import { fetchJson, RateLimiter } from './http';

export type ProviderCapabilities = { catalog: boolean; orbitalData: boolean; validation: boolean };
export interface DataProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;
  isAvailable?(): boolean;
  getCatalog?(category: SatelliteCategory, force?: boolean): Promise<CatalogItem[]>;
  getOrbitalData?(noradId: number, force?: boolean): Promise<OrbitalElement>;
  getOrbitalBatch?(category: SatelliteCategory, limit: number): Promise<OrbitalElement[]>;
  getValidationPosition?(noradId: number): Promise<ValidationPosition>;
}

const GROUPS: Record<SatelliteCategory, string> = {
  stations: 'STATIONS', starlink: 'STARLINK', gps: 'GPS-OPS', weather: 'WEATHER', active: 'ACTIVE',
};
const CELESTRAK_TTL_MS = 18 * 3_600_000;

export class CelesTrakProvider implements DataProvider {
  readonly id = 'celestrak';
  readonly capabilities = { catalog: true, orbitalData: true, validation: false };
  private limiter = new RateLimiter(20, 60_000);
  constructor(private cache: CacheStore, private fetcher: typeof fetch = fetch) {}

  async getCatalog(category: SatelliteCategory, force = false): Promise<CatalogItem[]> {
    const key = `celestrak:catalog:${category}`;
    const omm = await this.cachedOmm(key, `https://celestrak.org/NORAD/elements/gp.php?GROUP=${GROUPS[category]}&FORMAT=JSON`, force);
    return omm.map((item) => ({
      noradId: Number(item.NORAD_CAT_ID), name: String(item.OBJECT_NAME),
      objectId: item.OBJECT_ID ? String(item.OBJECT_ID) : undefined,
      category, epoch: parseEpoch(item.EPOCH),
    }));
  }

  async getOrbitalData(noradId: number, force = false): Promise<OrbitalElement> {
    const key = `celestrak:orbital:${noradId}`;
    const omm = await this.cachedOmm(key, `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=JSON`, force);
    if (!omm[0]) throw new ProviderUnavailableError(`CelesTrak no devolvió elementos para NORAD ${noradId}.`);
    const cached = await this.cache.get<OMMJsonObject[]>(key);
    return orbitalElementFromOmm(omm[0], 'CelesTrak GP/OMM', cached?.savedAt ?? new Date());
  }

  async getOrbitalBatch(category: SatelliteCategory, limit: number): Promise<OrbitalElement[]> {
    if (category === 'starlink') return this.getStarlinkBatch(limit);
    const key = `celestrak:catalog:${category}`;
    const downloaded = await this.cachedOmm(
      key,
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${GROUPS[category]}&FORMAT=JSON`,
      false,
    );
    const cached = await this.cache.get<OMMJsonObject[]>(key);
    const downloadedAt = cached?.savedAt ?? new Date();
    return downloaded.slice(0, limit).map((item) => orbitalElementFromOmm(item, 'CelesTrak GP/OMM', downloadedAt));
  }

  private async getStarlinkBatch(limit: number): Promise<OrbitalElement[]> {
    const sources = [
      {
        key: 'celestrak:supgp:starlink',
        url: 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=JSON',
        label: 'CelesTrak SupGP/SpaceX-E',
        select: selectClosestOmmPerSatellite,
      },
      {
        key: 'celestrak:catalog:starlink',
        url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=STARLINK&FORMAT=JSON',
        label: 'CelesTrak GP/OMM (respaldo)',
        select: (items: OMMJsonObject[]) => items,
      },
    ];
    const errors: string[] = [];
    for (const source of sources) {
      try {
        const downloaded = await this.cachedOmm(source.key, source.url, false);
        const omm = source.select(downloaded);
        if (!omm.length) throw new ProviderUnavailableError(`${source.label} devolvió un lote vacío.`);
        const cached = await this.cache.get<OMMJsonObject[]>(source.key);
        const downloadedAt = cached?.savedAt ?? new Date();
        return evenlySample(omm, limit).map((item) => orbitalElementFromOmm(item, source.label, downloadedAt));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new ProviderUnavailableError(`No se pudo cargar Starlink desde SupGP ni GP. ${errors.join(' | ')}`);
  }

  private async cachedOmm(key: string, url: string, force: boolean): Promise<OMMJsonObject[]> {
    const cached = await this.cache.get<OMMJsonObject[]>(key);
    if (!force && cached && cached.expiresAt.getTime() > Date.now()) return cached.value;
    try {
      this.limiter.acquire();
      const result = await fetchJson<OMMJsonObject[]>(url, {}, 3, this.fetcher);
      await this.cache.set(key, result, CELESTRAK_TTL_MS);
      return result;
    } catch (error) {
      if (cached) return cached.value;
      throw error;
    }
  }
}

export function evenlySample<T>(items: T[], limit: number): T[] {
  const count = Math.max(0, Math.min(Math.floor(limit), items.length));
  if (count === items.length) return [...items];
  if (count === 0) return [];
  return Array.from({ length: count }, (_, index) => items[Math.floor(index * items.length / count)]);
}

abstract class ProxyProvider implements DataProvider {
  abstract readonly id: string;
  abstract readonly capabilities: ProviderCapabilities;
  protected limiter = new RateLimiter(20, 60_000);
  constructor(protected proxyUrl?: string, protected fetcher: typeof fetch = fetch) {}
  isAvailable(): boolean { return Boolean(this.proxyUrl?.trim()); }
  protected requireProxy(): string {
    return validateProxyUrl(this.proxyUrl, __DEV__);
  }
}

export function validateProxyUrl(value: string | undefined, allowInsecure: boolean): string {
  if (!value) throw new MissingCredentialsError('Configurá EXPO_PUBLIC_API_PROXY_URL y las credenciales en el backend.');
  let url: URL;
  try { url = new URL(value); } catch { throw new MissingCredentialsError('EXPO_PUBLIC_API_PROXY_URL no es una URL válida.'); }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]' || host === '::1') {
    throw new MissingCredentialsError('El proxy no puede usar localhost desde un teléfono físico.');
  }
  if (url.protocol !== 'https:' && !allowInsecure) {
    throw new MissingCredentialsError('El APK requiere un proxy HTTPS público; HTTP sólo se admite durante desarrollo.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new MissingCredentialsError('El proxy debe usar HTTPS (o HTTP sólo durante desarrollo).');
  }
  return value.replace(/\/$/, '');
}

export class SpaceTrackProvider extends ProxyProvider {
  readonly id = 'spacetrack';
  readonly capabilities = { catalog: true, orbitalData: true, validation: false };
  async getCatalog(category: SatelliteCategory): Promise<CatalogItem[]> {
    this.limiter.acquire();
    const data = await fetchJson<Record<string, unknown>[]>(`${this.requireProxy()}/api/spacetrack/catalog?group=${category}`, {}, 3, this.fetcher);
    return data.map((item) => ({ noradId: Number(item.NORAD_CAT_ID), name: String(item.OBJECT_NAME), category, epoch: parseEpoch(item.EPOCH) }));
  }
  async getOrbitalData(noradId: number): Promise<OrbitalElement> {
    this.limiter.acquire();
    const omm = await fetchJson<OMMJsonObject>(`${this.requireProxy()}/api/spacetrack/orbital/${noradId}`, {}, 3, this.fetcher);
    return orbitalElementFromOmm(omm, 'Space-Track GP/OMM');
  }
}

export class N2yoProvider extends ProxyProvider {
  readonly id = 'n2yo';
  readonly capabilities = { catalog: false, orbitalData: false, validation: true };
  async getValidationPosition(noradId: number): Promise<ValidationPosition> {
    this.limiter.acquire();
    const value = await fetchJson<{ satlatitude: number; satlongitude: number; sataltitude: number; timestamp: number }>(
      `${this.requireProxy()}/api/n2yo/position/${noradId}`, {}, 3, this.fetcher,
    );
    return { latitude: value.satlatitude, longitude: value.satlongitude, altitudeKm: value.sataltitude, timestamp: new Date(value.timestamp * 1000), provider: 'N2YO' };
  }
}

export class WhereTheIssProvider implements DataProvider {
  readonly id = 'wheretheiss';
  readonly capabilities = { catalog: false, orbitalData: false, validation: true };
  private limiter = new RateLimiter(1, 1100);
  constructor(private fetcher: typeof fetch = fetch) {}
  async getValidationPosition(noradId: number): Promise<ValidationPosition> {
    if (noradId !== 25544) throw new ProviderUnavailableError('Where the ISS at? sólo puede validar la ISS (25544).');
    this.limiter.acquire();
    const value = await fetchJson<{ latitude: number; longitude: number; altitude: number; velocity: number; timestamp: number }>(
      'https://api.wheretheiss.at/v1/satellites/25544', {}, 2, this.fetcher,
    );
    return {
      latitude: value.latitude, longitude: value.longitude, altitudeKm: value.altitude,
      velocityKmS: value.velocity / 3600, timestamp: new Date(value.timestamp * 1000), provider: 'Where the ISS at?',
    };
  }
}

export class ProviderOrchestrator {
  constructor(private providers: DataProvider[]) {}
  async catalog(category: SatelliteCategory, force = false): Promise<CatalogItem[]> {
    return this.first('catalog', (provider) => provider.getCatalog!(category, force));
  }
  async orbitalData(noradId: number, force = false): Promise<OrbitalElement> {
    return this.first('orbitalData', (provider) => provider.getOrbitalData!(noradId, force));
  }
  async validation(noradId: number, preferred?: string): Promise<ValidationPosition> {
    const providers = preferred
      ? [...this.providers.filter((p) => p.id === preferred), ...this.providers.filter((p) => p.id !== preferred)]
      : this.providers;
    return new ProviderOrchestrator(providers).first('validation', (provider) => provider.getValidationPosition!(noradId));
  }
  async orbitalBatch(category: SatelliteCategory, limit: number): Promise<OrbitalElement[]> {
    const provider = this.providers.find((item) => item.capabilities.orbitalData && item.getOrbitalBatch && (item.isAvailable?.() ?? true));
    if (!provider?.getOrbitalBatch) throw new ProviderUnavailableError('Ningún proveedor ofrece descarga orbital por lote.');
    return provider.getOrbitalBatch(category, limit);
  }
  private async first<T>(capability: keyof ProviderCapabilities, action: (provider: DataProvider) => Promise<T>): Promise<T> {
    const errors: string[] = [];
    for (const provider of this.providers.filter((item) => item.capabilities[capability] && (item.isAvailable?.() ?? true))) {
      try { return await action(provider); } catch (error) { errors.push(`${provider.id}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    throw new ProviderUnavailableError(errors.length ? errors.join(' | ') : `Ningún proveedor ofrece ${capability}.`);
  }
}

export function selectClosestOmmPerSatellite(items: OMMJsonObject[], at = new Date()): OMMJsonObject[] {
  const selected = new Map<string, OMMJsonObject>();
  for (const item of items) {
    const id = String(item.NORAD_CAT_ID);
    const previous = selected.get(id);
    if (!previous || epochDistance(item, at) < epochDistance(previous, at)) selected.set(id, item);
  }
  return [...selected.values()];
}

function epochDistance(item: OMMJsonObject, at: Date): number {
  const timestamp = parseEpoch(item.EPOCH).getTime();
  return Number.isFinite(timestamp) ? Math.abs(timestamp - at.getTime()) : Number.POSITIVE_INFINITY;
}

function parseEpoch(value: unknown): Date {
  const text = String(value);
  return new Date(text.endsWith('Z') ? text : `${text}Z`);
}
