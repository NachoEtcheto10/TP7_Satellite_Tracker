import { MemoryCacheStore } from '@/data/cacheStore';
import { CelesTrakProvider, evenlySample, N2yoProvider, ProviderOrchestrator, selectClosestOmmPerSatellite, validateProxyUrl, type DataProvider } from '@/data/providers';
import { fetchJson, RateLimiter } from '@/data/http';
import { issOmm } from './fixtures';

describe('caché, límites y fallback', () => {
  test('conserva TTL y marcas temporales', async () => {
    const cache = new MemoryCacheStore();
    const now = new Date('2026-10-25T00:00:00Z');
    await cache.set('x', { value: 1 }, 1000, now);
    const result = await cache.get<{ value: number }>('x');
    expect(result?.value.value).toBe(1);
    expect(result?.savedAt).toEqual(now);
    expect(result?.expiresAt.getTime()).toBe(now.getTime() + 1000);
  });

  test('aplica rate limiting por ventana', () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.acquire(1000); limiter.acquire(1100);
    expect(() => limiter.acquire(1200)).toThrow('límite local');
    expect(() => limiter.acquire(2101)).not.toThrow();
  });

  test('fallback sólo entre proveedores con la capacidad requerida', async () => {
    const incapable: DataProvider = { id: 'incapable', capabilities: { catalog: false, orbitalData: false, validation: true } };
    const failing: DataProvider = { id: 'failing', capabilities: { catalog: true, orbitalData: false, validation: false }, getCatalog: async () => { throw new Error('offline'); } };
    const working: DataProvider = { id: 'working', capabilities: { catalog: true, orbitalData: false, validation: false }, getCatalog: async () => [{ noradId: 1, name: 'REAL', category: 'active', epoch: new Date() }] };
    const catalog = await new ProviderOrchestrator([incapable, failing, working]).catalog('active');
    expect(catalog[0].name).toBe('REAL');
  });

  test('omite proveedores opcionales sin proxy configurado', async () => {
    const unavailable = new N2yoProvider(undefined, jest.fn() as unknown as typeof fetch);
    const working: DataProvider = {
      id: 'public', capabilities: { catalog: false, orbitalData: false, validation: true },
      getValidationPosition: async () => ({ latitude: 1, longitude: 2, altitudeKm: 3, timestamp: new Date(), provider: 'public' }),
    };
    const result = await new ProviderOrchestrator([unavailable, working]).validation(25544, 'n2yo');
    expect(result.provider).toBe('public');
  });

  test('SupGP elige una sola época, la más cercana, por NORAD', () => {
    const older = { ...issOmm, EPOCH: '2026-10-26T00:00:00.000000' };
    const closest = { ...issOmm, EPOCH: '2026-10-26T11:30:00.000000' };
    const future = { ...issOmm, EPOCH: '2026-10-27T00:00:00.000000' };
    const other = { ...issOmm, NORAD_CAT_ID: 99999, EPOCH: '2026-10-20T00:00:00.000000' };
    const selected = selectClosestOmmPerSatellite([older, closest, future, other], new Date('2026-10-26T12:00:00Z'));
    expect(selected).toHaveLength(2);
    expect(selected.find((item) => Number(item.NORAD_CAT_ID) === 25544)?.EPOCH).toBe(closest.EPOCH);
  });

  test('CelesTrak reutiliza caché fresca sin repetir la descarga', async () => {
    const fetcher = jest.fn(async () => ({ ok: true, status: 200, json: async () => [issOmm] })) as unknown as typeof fetch;
    const provider = new CelesTrakProvider(new MemoryCacheStore(), fetcher);
    await provider.getOrbitalData(25544);
    await provider.getOrbitalData(25544);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('CelesTrak conserva la caché vencida como fallback offline', async () => {
    const cache = new MemoryCacheStore();
    await cache.set('celestrak:orbital:25544', [issOmm], -1, new Date('2026-10-25T00:00:00Z'));
    const fetcher = jest.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const result = await new CelesTrakProvider(cache, fetcher).getOrbitalData(25544);
    expect(result.noradId).toBe(25544);
    expect(result.downloadedAt.toISOString()).toBe('2026-10-25T00:00:00.000Z');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  test('no reintenta respuestas HTTP 403', async () => {
    const fetcher = jest.fn(async () => ({
      ok: false, status: 403, text: async () => 'Please limit requests to once every 2 hours',
    })) as unknown as typeof fetch;
    await expect(fetchJson('https://celestrak.org/example', {}, 3, fetcher)).rejects.toThrow('once every 2 hours');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('Starlink usa GP público si SupGP responde 403 y conserva SGP4 OMM', async () => {
    const second = { ...issOmm, NORAD_CAT_ID: 44713, OBJECT_NAME: 'STARLINK-1008' };
    const fetcher = jest.fn(async (url: string | URL | Request) => {
      if (String(url).includes('sup-gp.php')) return {
        ok: false, status: 403, text: async () => 'Please limit requests to once every 2 hours',
      };
      return { ok: true, status: 200, json: async () => [issOmm, second] };
    }) as unknown as typeof fetch;
    const result = await new CelesTrakProvider(new MemoryCacheStore(), fetcher).getOrbitalBatch('starlink', 2);
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.source === 'CelesTrak GP/OMM (respaldo)' && item.omm)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test('muestrea el lote completo sin duplicar objetos', () => {
    expect(evenlySample([0, 1, 2, 3, 4, 5], 3)).toEqual([0, 2, 4]);
    expect(new Set(evenlySample([0, 1, 2], 8))).toEqual(new Set([0, 1, 2]));
  });

  test('rechaza proxies inseguros en release y hosts locales siempre', () => {
    expect(validateProxyUrl('https://proxy.example.com/', false)).toBe('https://proxy.example.com');
    expect(() => validateProxyUrl('http://proxy.example.com', false)).toThrow('HTTPS');
    expect(() => validateProxyUrl('http://localhost:8787', true)).toThrow('localhost');
    expect(validateProxyUrl('http://192.168.1.20:8787/', true)).toBe('http://192.168.1.20:8787');
  });
});
