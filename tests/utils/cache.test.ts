import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache, CacheStrategy, createCacheKey, invalidatePattern } from '$lib/utils/cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({ ttl: 1000, maxSize: 3, storage: 'memory' });
  });

  it('stores and retrieves data', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('respects TTL and expires entries', async () => {
    cache.set('key1', 'value1', 100); // 100ms TTL
    
    expect(cache.get('key1')).toBe('value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(cache.get('key1')).toBeNull();
  });

  it('enforces max size limit', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
    expect(cache.size()).toBe(3);
  });

  it('deletes entries', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('clears all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    expect(cache.size()).toBe(0);
  });

  it('handles optimistic updates with rollback', async () => {
    cache.set('key1', 'original');
    
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
    const mockRollback = vi.fn();
    
    try {
      await cache.optimisticUpdate(
        'key1',
        'optimistic',
        mockUpdate,
        mockRollback
      );
    } catch (error) {
      // Expected to fail
    }
    
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRollback).toHaveBeenCalled();
    expect(cache.get('key1')).toBe('original'); // Should rollback
  });

  it('handles successful optimistic updates', async () => {
    cache.set('key1', 'original');
    
    const mockUpdate = vi.fn().mockResolvedValue('success');
    
    const result = await cache.optimisticUpdate(
      'key1',
      'optimistic',
      mockUpdate
    );
    
    expect(result).toBe('success');
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('CacheStrategy', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache({ storage: 'memory' });
  });

  describe('cacheAside', () => {
    it('returns cached data when available', async () => {
      cache.set('test-key', 'cached-value');
      const mockFetch = vi.fn();
      
      const result = await CacheStrategy.cacheAside('test-key', mockFetch, cache);
      
      expect(result).toBe('cached-value');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches and caches data when not in cache', async () => {
      const mockFetch = vi.fn().mockResolvedValue('fresh-value');
      
      const result = await CacheStrategy.cacheAside('test-key', mockFetch, cache);
      
      expect(result).toBe('fresh-value');
      expect(mockFetch).toHaveBeenCalled();
      expect(cache.get('test-key')).toBe('fresh-value');
    });
  });

  describe('writeThrough', () => {
    it('writes to source then updates cache', async () => {
      const mockWrite = vi.fn().mockResolvedValue(undefined);
      
      await CacheStrategy.writeThrough('test-key', 'test-value', mockWrite, cache);
      
      expect(mockWrite).toHaveBeenCalledWith('test-value');
      expect(cache.get('test-key')).toBe('test-value');
    });
  });
});

describe('Utility functions', () => {
  it('creates cache keys correctly', () => {
    expect(createCacheKey('user', 123, 'profile')).toBe('user:123:profile');
    expect(createCacheKey('simple')).toBe('simple');
  });

  it('invalidates cache entries by pattern', () => {
    const cache = new Cache({ storage: 'memory' });
    
    cache.set('user:1:profile', 'data1');
    cache.set('user:2:profile', 'data2');
    cache.set('team:1:stats', 'data3');
    
    invalidatePattern(/^user:/, cache);
    
    expect(cache.get('user:1:profile')).toBeNull();
    expect(cache.get('user:2:profile')).toBeNull();
    expect(cache.get('team:1:stats')).toBe('data3');
  });
});