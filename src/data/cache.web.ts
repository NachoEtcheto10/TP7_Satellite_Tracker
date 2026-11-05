import { MemoryCacheStore } from './cacheStore';

// La persistencia evaluada por el TP es SQLite en Android. Web se usa sólo para QA visual.
export class SqliteCacheStore extends MemoryCacheStore {}
export type { CacheStore } from './cacheStore';
