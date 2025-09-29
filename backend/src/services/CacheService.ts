export interface CacheEntry<T> {
  value: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default time-to-live in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  currentEntries: number;
  hitRate: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private stats: Omit<CacheStats, 'hitRate'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
    currentEntries: 0
  };
  
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private config: CacheConfig) {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, config.cleanupInterval);
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSize(value: T): number {
    try {
      // Simple JSON-based size estimation
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB default
    }
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLRU(): void {
    while (
      (this.stats.currentSize > this.config.maxSize || 
       this.stats.currentEntries >= this.config.maxEntries) &&
      this.accessOrder.length > 0
    ) {
      const lruKey = this.accessOrder.shift();
      if (lruKey && this.cache.has(lruKey)) {
        const entry = this.cache.get(lruKey)!;
        this.cache.delete(lruKey);
        this.stats.currentSize -= entry.size;
        this.stats.currentEntries--;
        this.stats.evictions++;
      }
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.config.defaultTTL);
    const size = this.estimateSize(value);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.stats.currentSize -= oldEntry.size;
      this.stats.currentEntries--;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      value,
      expiry,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    // Check if we need to evict
    if (this.stats.currentSize + size > this.config.maxSize || 
        this.stats.currentEntries >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, entry);
    this.stats.currentSize += size;
    this.stats.currentEntries++;
    this.updateAccessOrder(key);
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    const now = Date.now();
    
    // Check if expired
    if (entry.expiry < now) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiry < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.stats.currentSize -= entry.size;
    this.stats.currentEntries--;

    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.currentSize = 0;
    this.stats.currentEntries = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): {
    currentSize: number;
    maxSize: number;
    currentEntries: number;
    maxEntries: number;
    utilizationPercent: number;
  } {
    return {
      currentSize: this.stats.currentSize,
      maxSize: this.config.maxSize,
      currentEntries: this.stats.currentEntries,
      maxEntries: this.config.maxEntries,
      utilizationPercent: (this.stats.currentSize / this.config.maxSize) * 100
    };
  }

  /**
   * Get entries sorted by access pattern (most recently used first)
   */
  getMostRecentlyUsed(limit: number = 10): Array<{ key: string; entry: CacheEntry<T> }> {
    return this.accessOrder
      .slice(-limit)
      .reverse()
      .map(key => ({ key, entry: this.cache.get(key)! }))
      .filter(item => item.entry);
  }

  /**
   * Get entries sorted by access count (most frequently used first)
   */
  getMostFrequentlyUsed(limit: number = 10): Array<{ key: string; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => b.entry.accessCount - a.entry.accessCount)
      .slice(0, limit);
  }

  /**
   * Cleanup and destroy cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Multi-level cache service for the schedule builder
 */
export class CacheService {
  // Different cache instances for different data types
  private scheduleCache: LRUCache<any>;
  private courseCache: LRUCache<any>;
  private teacherCache: LRUCache<any>;
  private groupCache: LRUCache<any>;
  private lessonCache: LRUCache<any>;
  private metadataCache: LRUCache<any>;

  constructor() {
    const defaultConfig: CacheConfig = {
      maxSize: 64 * 1024 * 1024, // 64MB
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      maxEntries: 1000,
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    };

    // Specialized cache configurations
    this.scheduleCache = new LRUCache({
      ...defaultConfig,
      maxSize: 32 * 1024 * 1024, // 32MB for schedules
      defaultTTL: 60 * 60 * 1000, // 1 hour for schedules
      maxEntries: 100 // Fewer but larger entries
    });

    this.courseCache = new LRUCache({
      ...defaultConfig,
      maxSize: 16 * 1024 * 1024, // 16MB for courses
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for courses
      maxEntries: 500
    });

    this.teacherCache = new LRUCache({
      ...defaultConfig,
      maxSize: 8 * 1024 * 1024, // 8MB for teachers
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for teachers
      maxEntries: 200
    });

    this.groupCache = new LRUCache({
      ...defaultConfig,
      maxSize: 8 * 1024 * 1024, // 8MB for groups
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for groups
      maxEntries: 300
    });

    this.lessonCache = new LRUCache({
      ...defaultConfig,
      maxSize: 32 * 1024 * 1024, // 32MB for lessons
      defaultTTL: 60 * 60 * 1000, // 1 hour for lessons
      maxEntries: 2000
    });

    this.metadataCache = new LRUCache({
      ...defaultConfig,
      maxSize: 4 * 1024 * 1024, // 4MB for metadata
      defaultTTL: 10 * 60 * 1000, // 10 minutes for metadata
      maxEntries: 1000
    });
  }

  /**
   * Get the appropriate cache for a given type
   */
  private getCache(type: string): LRUCache<any> {
    switch (type.toLowerCase()) {
      case 'schedule':
        return this.scheduleCache;
      case 'course':
        return this.courseCache;
      case 'teacher':
        return this.teacherCache;
      case 'group':
        return this.groupCache;
      case 'lesson':
        return this.lessonCache;
      case 'metadata':
        return this.metadataCache;
      default:
        return this.metadataCache; // Default fallback
    }
  }

  /**
   * Set a value in the appropriate cache
   */
  set(type: string, key: string, value: any, ttl?: number): void {
    const cache = this.getCache(type);
    cache.set(key, value, ttl);
  }

  /**
   * Get a value from the appropriate cache
   */
  get(type: string, key: string): any {
    const cache = this.getCache(type);
    return cache.get(key);
  }

  /**
   * Check if a key exists in the appropriate cache
   */
  has(type: string, key: string): boolean {
    const cache = this.getCache(type);
    return cache.has(key);
  }

  /**
   * Delete a key from the appropriate cache
   */
  delete(type: string, key: string): boolean {
    const cache = this.getCache(type);
    return cache.delete(key);
  }

  /**
   * Clear a specific cache type
   */
  clearType(type: string): void {
    const cache = this.getCache(type);
    cache.clear();
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.scheduleCache.clear();
    this.courseCache.clear();
    this.teacherCache.clear();
    this.groupCache.clear();
    this.lessonCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Get comprehensive cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    return {
      schedule: this.scheduleCache.getStats(),
      course: this.courseCache.getStats(),
      teacher: this.teacherCache.getStats(),
      group: this.groupCache.getStats(),
      lesson: this.lessonCache.getStats(),
      metadata: this.metadataCache.getStats()
    };
  }

  /**
   * Get cache size information for all caches
   */
  getAllSizeInfo(): Record<string, ReturnType<LRUCache<any>['getSizeInfo']>> {
    return {
      schedule: this.scheduleCache.getSizeInfo(),
      course: this.courseCache.getSizeInfo(),
      teacher: this.teacherCache.getSizeInfo(),
      group: this.groupCache.getSizeInfo(),
      lesson: this.lessonCache.getSizeInfo(),
      metadata: this.metadataCache.getSizeInfo()
    };
  }

  /**
   * Generate cache health report
   */
  getHealthReport(): {
    overall: {
      totalHitRate: number;
      totalSizeUsed: number;
      totalMaxSize: number;
      utilizationPercent: number;
    };
    byType: Record<string, {
      stats: CacheStats;
      sizeInfo: ReturnType<LRUCache<any>['getSizeInfo']>;
      health: 'good' | 'warning' | 'critical';
    }>;
    recommendations: string[];
  } {
    const allStats = this.getAllStats();
    const allSizeInfo = this.getAllSizeInfo();
    
    let totalHits = 0;
    let totalRequests = 0;
    let totalSizeUsed = 0;
    let totalMaxSize = 0;

    const byType: Record<string, any> = {};
    const recommendations: string[] = [];

    for (const [type, stats] of Object.entries(allStats)) {
      const sizeInfo = allSizeInfo[type];
      totalHits += stats.hits;
      totalRequests += stats.hits + stats.misses;
      totalSizeUsed += sizeInfo.currentSize;
      totalMaxSize += sizeInfo.maxSize;

      let health: 'good' | 'warning' | 'critical' = 'good';
      
      // Determine health status
      if (stats.hitRate < 0.5 || sizeInfo.utilizationPercent > 90) {
        health = 'critical';
      } else if (stats.hitRate < 0.7 || sizeInfo.utilizationPercent > 75) {
        health = 'warning';
      }

      // Generate recommendations
      if (stats.hitRate < 0.5) {
        recommendations.push(`Low hit rate for ${type} cache (${(stats.hitRate * 100).toFixed(1)}%) - consider increasing TTL or cache size`);
      }
      
      if (sizeInfo.utilizationPercent > 90) {
        recommendations.push(`High memory utilization for ${type} cache (${sizeInfo.utilizationPercent.toFixed(1)}%) - consider increasing cache size`);
      }

      if (stats.evictions > stats.hits * 0.1) {
        recommendations.push(`High eviction rate for ${type} cache - consider increasing cache size or reducing TTL`);
      }

      byType[type] = {
        stats,
        sizeInfo,
        health
      };
    }

    return {
      overall: {
        totalHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        totalSizeUsed,
        totalMaxSize,
        utilizationPercent: totalMaxSize > 0 ? (totalSizeUsed / totalMaxSize) * 100 : 0
      },
      byType,
      recommendations
    };
  }

  /**
   * Cleanup and destroy all caches
   */
  destroy(): void {
    this.scheduleCache.destroy();
    this.courseCache.destroy();
    this.teacherCache.destroy();
    this.groupCache.destroy();
    this.lessonCache.destroy();
    this.metadataCache.destroy();
  }
}

// Singleton instance
export const cacheService = new CacheService();