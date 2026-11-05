import type { CacheEntry } from '@/domain/types';

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttlMs: number, now?: Date): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryCacheStore implements CacheStore {
  private values = new Map<string, CacheEntry<unknown>>();
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return (this.values.get(key) as CacheEntry<T> | undefined) ?? null;
  }
  async set<T>(key: string, value: T, ttlMs: number, now = new Date()): Promise<void> {
    this.values.set(key, { value, savedAt: now, expiresAt: new Date(now.getTime() + ttlMs) });
  }
  async remove(key: string): Promise<void> { this.values.delete(key); }
}
