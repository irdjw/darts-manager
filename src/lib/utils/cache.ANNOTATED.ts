/**
 * ============================================================================
 * CACHE.TS — In-Memory and Persistent Caching with Strategies
 * ============================================================================
 *
 * PURPOSE:
 * A generic caching layer that sits between components and the database.
 * Reduces redundant DB queries by storing results locally with a
 * configurable time-to-live (TTL). Also provides optimistic updates
 * (update the UI immediately, roll back if the DB write fails) and
 * four classic caching strategies.
 *
 * THREE PRE-BUILT INSTANCES:
 *   dataCache     — localStorage, 10 min TTL, 100 entries
 *   sessionCache  — sessionStorage, 30 min TTL, 50 entries
 *   memoryCache   — in-memory only (lost on refresh), 5 min TTL, 200 entries
 *
 * ARCHITECTURE:
 *                     ┌──────────────┐
 *   Component  ──►    │  Cache       │  ──► localStorage / sessionStorage
 *   (reads/writes)    │  (Map)       │       (optional persistence)
 *                     └──────────────┘
 *                            │
 *                    on miss │
 *                            ▼
 *                     DB query (via CacheStrategy)
 *
 * KEY CONCEPTS:
 *
 *   TTL (Time To Live):
 *   Each cache entry stores the timestamp it was written. On read, the
 *   cache checks if (now - timestamp) > ttl. If so, the entry is stale
 *   and treated as a miss.
 *
 *   LRU-LITE (Least Recently Used, simplified):
 *   When the cache is full (size >= maxSize), the OLDEST entry (first
 *   key in insertion order) is evicted. Map preserves insertion order,
 *   so .keys().next().value is always the oldest. This is not true LRU
 *   (which would evict the least-recently-accessed), but it's simple
 *   and good enough for this use case.
 *
 *   OPTIMISTIC UPDATE:
 *   optimisticUpdate() writes the expected result to cache immediately,
 *   then fires the actual DB write. If the write fails, it rolls back
 *   the cache to the previous value. The UI stays responsive; the user
 *   only sees the rollback if the write actually fails.
 *
 * CACHING STRATEGIES (CacheStrategy class):
 *   cacheAside     — read from cache; on miss, fetch and populate cache
 *   writeThrough   — write to DB first, then update cache
 *   writeBehind    — update cache immediately, write to DB async (fire & forget)
 *   refreshAhead   — if cache is > 80% expired, refresh in background while
 *                     returning the still-valid cached value
 *
 * UTILITY FUNCTIONS:
 *   createCacheKey(...parts)          → "players:week:3"
 *   invalidatePattern(regex, cache)   → delete all keys matching a pattern
 *   startCacheCleanup(interval)       → periodic expired-entry sweep
 *   stopCacheCleanup()                → stop the sweep interval
 *
 * ⚠️ NOTES:
 *   - refreshAhead accesses cache's private .cache Map via (cache as any).cache.
 *     This is a code smell — it breaks encapsulation. A getEntry() method
 *     on Cache would be cleaner.
 *   - writeBehind's comment says "Could implement retry logic here" but
 *     doesn't. Failed writes are silently logged.
 *   - The cleanup interval starts automatically on module load (browser only)
 *     and stops on beforeunload.
 */

// Data caching and optimistic updates utility

// ==========================================================================
// INTERFACES
// ==========================================================================

// What's stored for each cache entry: the actual data + metadata for expiry.
interface CacheEntry<T> {
  data: T;
  timestamp: number;   // Date.now() when the entry was written
  ttl: number;         // How long (ms) this entry stays valid
}

// Options passed to the Cache constructor.
interface CacheOptions {
  ttl?: number;                                    // Default TTL (ms)
  maxSize?: number;                                // Max entries before eviction
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

// ==========================================================================
// CACHE CLASS
// ==========================================================================

class Cache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;
  private storage: CacheOptions['storage'];

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000;   // 5 minutes if not specified
    this.maxSize    = options.maxSize || 100;
    this.storage    = options.storage || 'memory';

    // If persistent storage is requested, hydrate from it on construction.
    if (this.storage !== 'memory') {
      this.loadFromStorage();
    }
  }

  // ── set ───────────────────────────────────────────────────────────────────
  // Write a value. If the cache is full, evict the oldest entry first.
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    // Eviction: remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
    this.saveToStorage();   // Persist if using localStorage/sessionStorage
  }

  // ── get ───────────────────────────────────────────────────────────────────
  // Read a value. Returns null on miss OR if the entry has expired.
  // Expired entries are deleted on access (lazy cleanup).
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Expiry check
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);        // Remove stale entry
      this.saveToStorage();
      return null;                   // Treat as miss
    }

    return entry.data;
  }

  /** Does this key exist AND is it not expired? */
  has(key: string): boolean {
    return this.get(key) !== null;   // get() handles expiry internally
  }

  /** Remove a specific key. Returns true if it existed. */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.saveToStorage();
    return result;
  }

  /** Wipe the entire cache. */
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  /** All current keys (including potentially stale ones — use has() to check). */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Number of entries (including stale ones). */
  size(): number {
    return this.cache.size;
  }

  // ── optimisticUpdate ────────────────────────────────────────────────────
  // Pattern: assume the write will succeed, update the cache immediately,
  // then run the actual async write. Roll back on failure.
  //
  // PARAMETERS:
  //   key              — cache key to update
  //   optimisticData   — the value to show immediately
  //   updateFunction   — the actual DB write (returns its result)
  //   rollbackFunction — optional callback if we need to roll back
  async optimisticUpdate<R>(
    key: string,
    optimisticData: T,
    updateFunction: () => Promise<R>,
    rollbackFunction?: (error: Error) => void
  ): Promise<R> {
    const originalData = this.get(key);   // Save current state for rollback

    this.set(key, optimisticData);        // Apply optimistic value NOW

    try {
      const result = await updateFunction();   // Try the real write
      return result;                           // Success — optimistic value stays
    } catch (error) {
      // Rollback: restore previous value (or delete if there was none)
      if (originalData !== null) {
        this.set(key, originalData);
      } else {
        this.delete(key);
      }

      if (rollbackFunction) {
        rollbackFunction(error as Error);
      }

      throw error;   // Re-throw so the caller knows it failed
    }
  }

  // ── Batch operations ────────────────────────────────────────────────────
  /** Write multiple entries in one call. */
  setMany(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /** Read multiple keys. Each result includes the key for easy mapping. */
  getMany(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({ key, data: this.get(key) }));
  }

  // ── cleanup ─────────────────────────────────────────────────────────────
  // Sweep through all entries and remove expired ones.
  // Called periodically by startCacheCleanup() and on storage hydration.
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
    this.saveToStorage();
  }

  // ── Persistence (private) ───────────────────────────────────────────────
  // Serialize the entire Map to JSON and store it.
  // SSR-safe: no-ops when window is undefined.

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.getStorage();
      const data = storage?.getItem(`cache_${this.constructor.name}`);

      if (data) {
        const entries = JSON.parse(data);
        entries.forEach(([key, entry]: [string, CacheEntry<T>]) => {
          this.cache.set(key, entry);
        });

        this.cleanup();   // Remove anything that expired while the tab was closed
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || this.storage === 'memory') return;

    try {
      const storage = this.getStorage();
      const entries = Array.from(this.cache.entries());
      storage?.setItem(`cache_${this.constructor.name}`, JSON.stringify(entries));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    switch (this.storage) {
      case 'localStorage':    return window.localStorage;
      case 'sessionStorage':  return window.sessionStorage;
      default:                return null;
    }
  }
}

// ==========================================================================
// PRE-BUILT INSTANCES
// ==========================================================================

// Long-lived data (player lists, fixture schedules) — persists across tabs
export const dataCache = new Cache({
  ttl: 10 * 60 * 1000,   // 10 minutes
  maxSize: 100,
  storage: 'localStorage'
});

// Session-scoped data — gone when the tab closes
export const sessionCache = new Cache({
  ttl: 30 * 60 * 1000,   // 30 minutes
  maxSize: 50,
  storage: 'sessionStorage'
});

// Ephemeral data — gone on page refresh, fastest access
export const memoryCache = new Cache({
  ttl: 5 * 60 * 1000,    // 5 minutes
  maxSize: 200,
  storage: 'memory'
});

// ==========================================================================
// CACHING STRATEGIES
// ==========================================================================

export class CacheStrategy {
  /**
   * CACHE ASIDE — The most common pattern.
   * 1. Check cache. If hit, return cached value.
   * 2. On miss, fetch from DB, store in cache, return fresh value.
   */
  static async cacheAside<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): Promise<T> {
    const cached = cache.get(key);
    if (cached !== null) return cached;   // Cache hit

    const data = await fetchFunction();   // Cache miss — fetch
    cache.set(key, data, ttl);            // Populate cache
    return data;
  }

  /**
   * WRITE THROUGH — Write to DB first, then update cache.
   * Ensures cache is always consistent with the DB.
   * Slightly slower than write-behind (waits for DB confirmation).
   */
  static async writeThrough<T>(
    key: string,
    data: T,
    writeFunction: (data: T) => Promise<void>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): Promise<void> {
    await writeFunction(data);      // DB write first
    cache.set(key, data, ttl);      // Then update cache
  }

  /**
   * WRITE BEHIND (fire & forget) — Update cache immediately, write to DB
   * asynchronously. UI is instant; DB catches up in the background.
   * ⚠️ If the DB write fails, the cache has stale data until next TTL expiry.
   */
  static writeBehind<T>(
    key: string,
    data: T,
    writeFunction: (data: T) => Promise<void>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): void {
    cache.set(key, data, ttl);      // Cache update is synchronous

    writeFunction(data).catch(error => {
      console.error('Write behind failed:', error);
      // ⚠️ No retry or rollback here — the cache now has unconfirmed data
    });
  }

  /**
   * REFRESH AHEAD — Proactively refresh before expiry.
   * If the cached value is still valid but > 80% of its TTL has elapsed,
   * kick off a background refresh while returning the current value.
   * This keeps latency low for frequently-accessed keys.
   *
   * ⚠️ Uses (cache as any).cache to access the private Map — breaks
   * encapsulation. A public getEntry() method would be cleaner.
   */
  static async refreshAhead<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cache: Cache<T> = dataCache,
    refreshThreshold: number = 0.8,   // Refresh when 80% of TTL has elapsed
    ttl?: number
  ): Promise<T> {
    const entry = (cache as any).cache.get(key);

    if (entry) {
      const age    = Date.now() - entry.timestamp;
      const maxAge = entry.ttl;

      if (age < maxAge) {
        // Still valid. But if nearing expiry, refresh in background.
        if (age > maxAge * refreshThreshold) {
          fetchFunction()
            .then(data => cache.set(key, data, ttl))
            .catch(error => console.warn('Background refresh failed:', error));
        }

        return entry.data;   // Return current (still-valid) value immediately
      }
    }

    // Cache miss or fully expired — fetch synchronously
    const data = await fetchFunction();
    cache.set(key, data, ttl);
    return data;
  }
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================

/**
 * Build a cache key from segments.
 * createCacheKey('players', 'week', 3) → "players:week:3"
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(part => String(part)).join(':');
}

/**
 * Delete all cache keys matching a regex pattern.
 * invalidatePattern(/^players:/, dataCache) → removes "players:week:1", "players:all", etc.
 */
export function invalidatePattern(pattern: RegExp, cache: Cache = dataCache): void {
  const keysToDelete = cache.keys().filter(key => pattern.test(key));
  keysToDelete.forEach(key => cache.delete(key));
}

// ==========================================================================
// AUTO CLEANUP
// ==========================================================================

let cleanupInterval: NodeJS.Timeout;

/** Start a periodic sweep that removes expired entries from all caches. */
export function startCacheCleanup(interval: number = 5 * 60 * 1000): void {
  stopCacheCleanup();   // Clear any existing interval first

  cleanupInterval = setInterval(() => {
    dataCache.cleanup();
    sessionCache.cleanup();
    memoryCache.cleanup();
  }, interval);
}

/** Stop the periodic cleanup. */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
}

// Auto-start cleanup when this module loads in the browser.
// Stops automatically when the tab is closed (beforeunload).
if (typeof window !== 'undefined') {
  startCacheCleanup();

  window.addEventListener('beforeunload', () => {
    stopCacheCleanup();
  });
}

// Export the class itself so consumers can create custom Cache instances.
export { Cache };
