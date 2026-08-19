const cache = new Map<string, { data: any; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}

export function setCache(key: string, data: any, ttlMs: number = 60000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(pattern: string) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
