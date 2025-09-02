// Data caching and optimistic updates utility

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum cache size
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

class Cache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;
  private storage: CacheOptions['storage'];
  
  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.storage = options.storage || 'memory';
    
    // Load from persistent storage if specified
    if (this.storage !== 'memory') {
      this.loadFromStorage();
    }
  }
  
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, entry);
    this.saveToStorage();
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.saveToStorage();
    return result;
  }
  
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }
  
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // Optimistic update with rollback
  async optimisticUpdate<R>(
    key: string,
    optimisticData: T,
    updateFunction: () => Promise<R>,
    rollbackFunction?: (error: Error) => void
  ): Promise<R> {
    const originalData = this.get(key);
    
    // Apply optimistic update
    this.set(key, optimisticData);
    
    try {
      const result = await updateFunction();
      return result;
    } catch (error) {
      // Rollback on error
      if (originalData !== null) {
        this.set(key, originalData);
      } else {
        this.delete(key);
      }
      
      if (rollbackFunction) {
        rollbackFunction(error as Error);
      }
      
      throw error;
    }
  }
  
  // Batch operations
  setMany(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }
  
  getMany(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({ key, data: this.get(key) }));
  }
  
  // Cleanup expired entries
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
        
        // Cleanup expired entries after loading
        this.cleanup();
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
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      default:
        return null;
    }
  }
}

// Global cache instances
export const dataCache = new Cache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 100,
  storage: 'localStorage'
});

export const sessionCache = new Cache({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 50,
  storage: 'sessionStorage'
});

export const memoryCache = new Cache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  storage: 'memory'
});

// Cache strategies
export class CacheStrategy {
  // Cache aside pattern
  static async cacheAside<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch from source
    const data = await fetchFunction();
    
    // Store in cache
    cache.set(key, data, ttl);
    
    return data;
  }
  
  // Write through pattern
  static async writeThrough<T>(
    key: string,
    data: T,
    writeFunction: (data: T) => Promise<void>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): Promise<void> {
    // Write to source first
    await writeFunction(data);
    
    // Then update cache
    cache.set(key, data, ttl);
  }
  
  // Write behind pattern (fire and forget)
  static writeBehind<T>(
    key: string,
    data: T,
    writeFunction: (data: T) => Promise<void>,
    cache: Cache<T> = dataCache,
    ttl?: number
  ): void {
    // Update cache immediately
    cache.set(key, data, ttl);
    
    // Write to source asynchronously
    writeFunction(data).catch(error => {
      console.error('Write behind failed:', error);
      // Could implement retry logic here
    });
  }
  
  // Refresh ahead pattern
  static async refreshAhead<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cache: Cache<T> = dataCache,
    refreshThreshold: number = 0.8,
    ttl?: number
  ): Promise<T> {
    const entry = (cache as any).cache.get(key);
    
    if (entry) {
      const age = Date.now() - entry.timestamp;
      const maxAge = entry.ttl;
      
      // If cache is still valid but nearing expiration, refresh in background
      if (age < maxAge) {
        if (age > maxAge * refreshThreshold) {
          // Refresh in background
          fetchFunction()
            .then(data => cache.set(key, data, ttl))
            .catch(error => console.warn('Background refresh failed:', error));
        }
        
        return entry.data;
      }
    }
    
    // Cache miss or expired, fetch synchronously
    const data = await fetchFunction();
    cache.set(key, data, ttl);
    return data;
  }
}

// Utility functions for common caching patterns
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(part => String(part)).join(':');
}

export function invalidatePattern(pattern: RegExp, cache: Cache = dataCache): void {
  const keysToDelete = cache.keys().filter(key => pattern.test(key));
  keysToDelete.forEach(key => cache.delete(key));
}

// Auto cleanup interval
let cleanupInterval: NodeJS.Timeout;

export function startCacheCleanup(interval: number = 5 * 60 * 1000): void {
  stopCacheCleanup();
  
  cleanupInterval = setInterval(() => {
    dataCache.cleanup();
    sessionCache.cleanup();
    memoryCache.cleanup();
  }, interval);
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
}

// Initialize cache cleanup on module load
if (typeof window !== 'undefined') {
  startCacheCleanup();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopCacheCleanup();
  });
}

export { Cache };