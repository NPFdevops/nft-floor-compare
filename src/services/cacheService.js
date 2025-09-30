/**
 * Enhanced Cache Service for NFT Price Floor API
 * Implements multi-layer caching with localStorage and intelligent TTL
 */

class CacheService {
  constructor() {
    // Memory cache for fastest access
    this.memoryCache = new Map();
    
    // Request deduplication - track in-flight requests
    this.pendingRequests = new Map();
    
    // Cache configuration with different TTL for different timeframes
    this.config = {
      TTL: {
        '30d': 30 * 60 * 1000,      // 30 minutes for 30-day data
        '90d': 2 * 60 * 60 * 1000,  // 2 hours for 90-day data  
        '1Y': 6 * 60 * 60 * 1000,   // 6 hours for 1-year data
        'YTD': 6 * 60 * 60 * 1000,  // 6 hours for YTD data
        '30m': 30 * 60 * 1000,      // 30 minutes for ETag caching
        '1h': 60 * 60 * 1000,       // 1 hour for collections list
        'default': 30 * 60 * 1000   // 30 minutes default
      },
      // Stale-while-revalidate: serve stale data while fetching fresh
      staleWhileRevalidate: {
        '30d': 60 * 60 * 1000,      // Serve stale for 1 hour
        '90d': 4 * 60 * 60 * 1000,  // Serve stale for 4 hours
        '1Y': 12 * 60 * 60 * 1000,  // Serve stale for 12 hours
        'YTD': 12 * 60 * 60 * 1000,
        'default': 2 * 60 * 60 * 1000
      },
      maxMemorySize: 200,
      maxLocalStorageSize: 800,
      localStoragePrefix: 'nft_cache_v3_',
      compressionThreshold: 5000 // Compress data larger than 5KB
    };
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Initialize cleanup
    this.initPeriodicCleanup();
  }

  /**
   * Generate cache key with timeframe awareness
   */
  generateCacheKey(collectionSlug, granularity, startTimestamp, endTimestamp, timeframe = null) {
    const startDate = new Date(startTimestamp * 1000).toISOString().split('T')[0];
    const endDate = new Date(endTimestamp * 1000).toISOString().split('T')[0];
    
    return `${collectionSlug}_${granularity}_${startDate}_${endDate}${timeframe ? '_' + timeframe : ''}`;
  }

  /**
   * Get data from multi-layer cache with stale-while-revalidate support
   */
  async get(cacheKey, timeframe = 'default', allowStale = false) {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem) {
      if (this.isValid(memoryItem, timeframe)) {
        memoryItem.lastAccessed = Date.now();
        this.metrics.hits++;
        console.log('🚀 Cache HIT (memory):', cacheKey);
        return { data: memoryItem.data, isStale: false };
      } else if (allowStale && this.isStale(memoryItem, timeframe)) {
        memoryItem.lastAccessed = Date.now();
        this.metrics.hits++;
        console.log('⚡ Cache HIT (memory, stale):', cacheKey);
        return { data: memoryItem.data, isStale: true };
      }
    }

    // Check localStorage
    try {
      const storageKey = this.config.localStoragePrefix + cacheKey;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const item = this.decompressItem(JSON.parse(stored));
        if (this.isValid(item, timeframe)) {
          // Promote to memory cache
          item.lastAccessed = Date.now();
          this.memoryCache.set(cacheKey, item);
          this.manageMemoryCache();
          this.metrics.hits++;
          console.log('🚀 Cache HIT (localStorage):', cacheKey);
          return { data: item.data, isStale: false };
        } else if (allowStale && this.isStale(item, timeframe)) {
          item.lastAccessed = Date.now();
          this.memoryCache.set(cacheKey, item);
          this.metrics.hits++;
          console.log('⚡ Cache HIT (localStorage, stale):', cacheKey);
          return { data: item.data, isStale: true };
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('localStorage cache error:', error);
    }

    this.metrics.misses++;
    console.log('❌ Cache MISS:', cacheKey);
    return null;
  }

  /**
   * Store data in both memory and localStorage with compression
   */
  async set(cacheKey, data, timeframe = 'default') {
    const now = Date.now();
    const dataStr = JSON.stringify(data);
    const item = {
      data,
      timestamp: now,
      lastAccessed: now,
      timeframe,
      size: dataStr.length
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, item);
    this.manageMemoryCache();

    // Store in localStorage with compression for large data
    try {
      const storageKey = this.config.localStoragePrefix + cacheKey;
      const compressedItem = this.compressItem(item);
      localStorage.setItem(storageKey, JSON.stringify(compressedItem));
      this.manageLocalStorageCache();
    } catch (error) {
      console.warn('localStorage cache write error:', error);
      this.cleanupLocalStorage();
    }

    console.log('💾 Cache SET:', cacheKey, `(${timeframe}, ${(item.size / 1024).toFixed(2)}KB)`);
  }

  /**
   * Check if cached item is still valid based on timeframe TTL
   */
  isValid(item, timeframe) {
    if (!item || !item.timestamp) return false;
    
    const ttl = this.config.TTL[timeframe] || this.config.TTL.default;
    const age = Date.now() - item.timestamp;
    
    return age < ttl;
  }

  /**
   * Check if cached item is stale but still usable (stale-while-revalidate)
   */
  isStale(item, timeframe) {
    if (!item || !item.timestamp) return false;
    
    const staleTTL = this.config.staleWhileRevalidate[timeframe] || this.config.staleWhileRevalidate.default;
    const age = Date.now() - item.timestamp;
    
    return age < staleTTL;
  }

  /**
   * Compress item data for localStorage (simple base64 encoding for now)
   */
  compressItem(item) {
    if (item.size < this.config.compressionThreshold) {
      return item;
    }
    
    try {
      const dataStr = JSON.stringify(item.data);
      const compressed = btoa(encodeURIComponent(dataStr));
      return {
        ...item,
        data: compressed,
        compressed: true
      };
    } catch (error) {
      console.warn('Compression failed:', error);
      return item;
    }
  }

  /**
   * Decompress item data from localStorage
   */
  decompressItem(item) {
    if (!item.compressed) {
      return item;
    }
    
    try {
      const decompressed = decodeURIComponent(atob(item.data));
      return {
        ...item,
        data: JSON.parse(decompressed),
        compressed: false
      };
    } catch (error) {
      console.warn('Decompression failed:', error);
      return item;
    }
  }

  /**
   * Deduplicate simultaneous requests to the same resource
   */
  async deduplicate(cacheKey, fetchFn) {
    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 Deduplicating request:', cacheKey);
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request and store promise
    const promise = fetchFn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(cacheKey);
    });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  /**
   * Manage memory cache size with LRU eviction
   */
  manageMemoryCache() {
    if (this.memoryCache.size <= this.config.maxMemorySize) return;

    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = entries.slice(0, entries.length - this.config.maxMemorySize);
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
      this.metrics.evictions++;
    });
  }

  /**
   * Manage localStorage cache size
   */
  manageLocalStorageCache() {
    try {
      const cacheKeys = this.getLocalStorageCacheKeys();
      
      if (cacheKeys.length <= this.config.maxLocalStorageSize) return;

      const items = cacheKeys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          return { key, lastAccessed: item.lastAccessed || 0 };
        } catch {
          return { key, lastAccessed: 0 };
        }
      });

      items.sort((a, b) => a.lastAccessed - b.lastAccessed);
      const toRemove = items.slice(0, items.length - this.config.maxLocalStorageSize);
      
      toRemove.forEach(({ key }) => {
        localStorage.removeItem(key);
        this.metrics.evictions++;
      });
    } catch (error) {
      console.warn('localStorage cache management error:', error);
    }
  }

  /**
   * Get all localStorage cache keys
   */
  getLocalStorageCacheKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.localStoragePrefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (!this.isValid(item, item.timeframe)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage cache
    try {
      const cacheKeys = this.getLocalStorageCacheKeys();
      cacheKeys.forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (!this.isValid(item, item.timeframe)) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }

  /**
   * Clean up localStorage when it's getting full
   */
  cleanupLocalStorage() {
    try {
      this.cleanupExpired();
      
      const cacheKeys = this.getLocalStorageCacheKeys();
      if (cacheKeys.length > this.config.maxLocalStorageSize * 0.8) {
        const items = cacheKeys.map(key => {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            return { key, lastAccessed: item.lastAccessed || 0 };
          } catch {
            return { key, lastAccessed: 0 };
          }
        });

        items.sort((a, b) => a.lastAccessed - b.lastAccessed);
        const toRemove = items.slice(0, Math.floor(items.length * 0.3));
        
        toRemove.forEach(({ key }) => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('localStorage cleanup error:', error);
    }
  }

  /**
   * Initialize periodic cleanup
   */
  initPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clear all cache
   */
  clear() {
    this.memoryCache.clear();
    
    try {
      const cacheKeys = this.getLocalStorageCacheKeys();
      cacheKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      localStorageSize: this.getLocalStorageCacheKeys().length,
      maxMemorySize: this.config.maxMemorySize,
      maxLocalStorageSize: this.config.maxLocalStorageSize
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
