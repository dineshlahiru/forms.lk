// Simple in-memory cache with localStorage backup for Firebase data
// This significantly reduces Firebase reads and speeds up page loads

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache TTL in milliseconds
const CACHE_TTL = {
  categories: 10 * 60 * 1000,    // 10 minutes - rarely changes
  institutions: 10 * 60 * 1000,  // 10 minutes - rarely changes
  forms: 2 * 60 * 1000,          // 2 minutes - may change more often
  form: 2 * 60 * 1000,           // 2 minutes - individual form
  popularForms: 5 * 60 * 1000,   // 5 minutes
};

type CacheKey = keyof typeof CACHE_TTL;

// In-memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Local storage key prefix
const STORAGE_PREFIX = 'forms-lk-cache-';

// Get from cache
export function getFromCache<T>(key: CacheKey, subKey?: string): T | null {
  const fullKey = subKey ? `${key}-${subKey}` : key;

  // Try memory cache first
  const memEntry = memoryCache.get(fullKey) as CacheEntry<T> | undefined;
  if (memEntry && Date.now() < memEntry.expiresAt) {
    return memEntry.data;
  }

  // Try localStorage
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + fullKey);
    if (stored) {
      const entry = JSON.parse(stored) as CacheEntry<T>;
      if (Date.now() < entry.expiresAt) {
        // Restore to memory cache
        memoryCache.set(fullKey, entry);
        return entry.data;
      } else {
        // Expired, remove from storage
        localStorage.removeItem(STORAGE_PREFIX + fullKey);
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return null;
}

// Set to cache
export function setToCache<T>(key: CacheKey, data: T, subKey?: string): void {
  const fullKey = subKey ? `${key}-${subKey}` : key;
  const ttl = CACHE_TTL[key] || 60000;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };

  // Set to memory cache
  memoryCache.set(fullKey, entry);

  // Set to localStorage (for persistence across page refreshes)
  try {
    localStorage.setItem(STORAGE_PREFIX + fullKey, JSON.stringify(entry));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

// Invalidate cache entry
export function invalidateCache(key: CacheKey, subKey?: string): void {
  const fullKey = subKey ? `${key}-${subKey}` : key;
  memoryCache.delete(fullKey);
  try {
    localStorage.removeItem(STORAGE_PREFIX + fullKey);
  } catch {
    // Ignore
  }
}

// Invalidate all cache entries of a type
export function invalidateCacheByType(key: CacheKey): void {
  // Clear from memory
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, k) => {
    if (k === key || k.startsWith(key + '-')) {
      keysToDelete.push(k);
    }
  });
  keysToDelete.forEach(k => memoryCache.delete(k));

  // Clear from localStorage
  try {
    const storageKeysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(STORAGE_PREFIX + key)) {
        storageKeysToDelete.push(storageKey);
      }
    }
    storageKeysToDelete.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

// Clear all cache
export function clearAllCache(): void {
  memoryCache.clear();
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
