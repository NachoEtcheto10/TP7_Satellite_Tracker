import * as SQLite from 'expo-sqlite';
import type { CacheEntry } from '@/domain/types';
import type { CacheStore } from './cacheStore';
export type { CacheStore } from './cacheStore';

type CacheRow = { payload: string; saved_at: number; expires_at: number };

export class SqliteCacheStore implements CacheStore {
  private dbPromise = SQLite.openDatabaseAsync('orbita.db');
  private initialized: Promise<void> | null = null;

  private async db() {
    const db = await this.dbPromise;
    if (!this.initialized) {
      this.initialized = db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS api_cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          saved_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
      `);
    }
    await this.initialized;
    return db;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const db = await this.db();
    const row = await db.getFirstAsync<CacheRow>(
      'SELECT payload, saved_at, expires_at FROM api_cache WHERE cache_key = ?', key,
    );
    if (!row) return null;
    return { value: JSON.parse(row.payload) as T, savedAt: new Date(row.saved_at), expiresAt: new Date(row.expires_at) };
  }

  async set<T>(key: string, value: T, ttlMs: number, now = new Date()): Promise<void> {
    const db = await this.db();
    await db.runAsync(
      `INSERT INTO api_cache(cache_key, payload, saved_at, expires_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload, saved_at=excluded.saved_at, expires_at=excluded.expires_at`,
      key, JSON.stringify(value), now.getTime(), now.getTime() + ttlMs,
    );
  }

  async remove(key: string): Promise<void> {
    const db = await this.db();
    await db.runAsync('DELETE FROM api_cache WHERE cache_key = ?', key);
  }
}
