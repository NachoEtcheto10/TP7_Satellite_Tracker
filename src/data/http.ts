import { HttpResponseError, ProviderUnavailableError, RateLimitError } from '@/domain/errors';

export class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxRequests: number, private windowMs: number) {}
  acquire(now = Date.now()): void {
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) throw new RateLimitError('Se alcanzó el límite local del proveedor.');
    this.timestamps.push(now);
  }
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  attempts = 3,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetcher(url, { ...options, headers: { Accept: 'application/json', ...options.headers } });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const summary = detail.replace(/\s+/g, ' ').trim().slice(0, 240);
        throw new HttpResponseError(
          `HTTP ${response.status} al consultar ${new URL(url).hostname}.${summary ? ` ${summary}` : ''}`,
          response.status,
        );
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (error instanceof HttpResponseError && !isRetryableStatus(error.status)) break;
      if (attempt + 1 < attempts) await delay(300 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderUnavailableError('No se pudo consultar el proveedor.');
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 500 || status === 502 || status === 503 || status === 504;
}

function delay(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
