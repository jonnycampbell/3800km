import { logger } from '@/lib/logger'

logger.info('Initializing cache system', {
  environment: process.env.NODE_ENV
}, 'cache')

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  key: string
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  size: number
  totalMemoryUsage: number
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>>
  private stats: CacheStats
  private maxSize: number

  constructor(maxSize = 1000) {
    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      totalMemoryUsage: 0
    }
    this.maxSize = maxSize
    
    logger.info('Cache initialized', {
      maxSize,
      initialStats: this.stats
    }, 'cache')
  }

  private calculateSize(value: unknown): number {
    // Rough estimation of memory usage
    const str = JSON.stringify(value)
    return str.length * 2 // Approximate bytes (UTF-16)
  }

  private evictOldest(): void {
    if (this.cache.size === 0) return
    
    logger.debug('Cache eviction triggered', {
      currentSize: this.cache.size,
      maxSize: this.maxSize
    }, 'cache')
    
    const oldestKey = this.cache.keys().next().value
    if (oldestKey) {
      const entry = this.cache.get(oldestKey)
      this.cache.delete(oldestKey)
      
      if (entry) {
        this.stats.totalMemoryUsage -= this.calculateSize(entry.value)
        this.stats.size--
        
        logger.debug('Evicted oldest cache entry', {
          key: oldestKey,
          age: Date.now() - entry.timestamp,
          newSize: this.cache.size
        }, 'cache')
      }
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    const age = Date.now() - entry.timestamp
    const expired = age > entry.ttl
    
    if (expired) {
      logger.debug('Cache entry expired', {
        key: entry.key,
        age,
        ttl: entry.ttl,
        expiredBy: age - entry.ttl
      }, 'cache')
    }
    
    return expired
  }

  set<T>(key: string, value: T, ttlMinutes: number): void {
    const ttl = ttlMinutes * 60 * 1000 // Convert to milliseconds
    const size = this.calculateSize(value)
    
    logger.debug('Setting cache entry', {
      key,
      ttlMinutes,
      ttlMs: ttl,
      valueSize: size,
      valueType: typeof value
    }, 'cache')

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)
      if (existing) {
        this.stats.totalMemoryUsage -= this.calculateSize(existing.value)
        this.stats.size--
      }
    }

    // Evict oldest entries if we're at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      key
    }

    this.cache.set(key, entry)
    this.stats.sets++
    this.stats.size++
    this.stats.totalMemoryUsage += size

    logger.info('Cache entry set successfully', {
      key,
      ttlMinutes,
      valueSize: size,
      cacheSize: this.cache.size,
      totalMemoryUsage: this.stats.totalMemoryUsage,
      stats: this.getStats()
    }, 'cache')
  }

  get<T>(key: string): T | null {
    logger.debug('Getting cache entry', { key }, 'cache')
    
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.stats.misses++
      logger.debug('Cache miss', {
        key,
        reason: 'entry_not_found',
        totalMisses: this.stats.misses
      }, 'cache')
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.deletes++
      this.stats.size--
      this.stats.totalMemoryUsage -= this.calculateSize(entry.value)
      
      logger.debug('Cache miss - expired entry removed', {
        key,
        reason: 'expired',
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        totalMisses: this.stats.misses
      }, 'cache')
      return null
    }

    this.stats.hits++
    const age = Date.now() - entry.timestamp
    
    logger.debug('Cache hit', {
      key,
      age,
      ttl: entry.ttl,
      remainingTtl: entry.ttl - age,
      totalHits: this.stats.hits
    }, 'cache')

    return entry.value
  }

  delete(key: string): boolean {
    logger.debug('Deleting cache entry', { key }, 'cache')
    
    const entry = this.cache.get(key)
    const deleted = this.cache.delete(key)

    if (deleted && entry) {
      this.stats.deletes++
      this.stats.size--
      this.stats.totalMemoryUsage -= this.calculateSize(entry.value)
      
      logger.info('Cache entry deleted', {
        key,
        age: Date.now() - entry.timestamp,
        totalDeletes: this.stats.deletes,
        newSize: this.cache.size
      }, 'cache')
    } else {
      logger.debug('Cache delete failed - entry not found', { key }, 'cache')
    }

    return deleted
  }

  clear(): void {
    const previousSize = this.cache.size
    const previousMemory = this.stats.totalMemoryUsage
    
    logger.info('Clearing entire cache', {
      previousSize,
      previousMemory
    }, 'cache')
    
    this.cache.clear()
    this.stats.size = 0
    this.stats.totalMemoryUsage = 0
    
    logger.info('Cache cleared successfully', {
      previousSize,
      previousMemory,
      newSize: this.cache.size
    }, 'cache')
  }

  getInfo(key: string): { exists: boolean; age?: number; ttl?: number; size?: number } {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return { exists: false }
    }

    const age = Math.round((Date.now() - entry.timestamp) / 1000) // Age in seconds
    const ttl = Math.round(entry.ttl / 1000) // TTL in seconds
    const size = this.calculateSize(entry.value)
    
    return {
      exists: true,
      age,
      ttl,
      size
    }
  }

  getStats(): CacheStats & { hitRate: number; missRate: number } {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100
    }
  }

  logStats(): void {
    const stats = this.getStats()
    logger.info('Cache statistics', {
      ...stats,
      memoryUsageMB: Math.round(stats.totalMemoryUsage / 1024 / 1024 * 100) / 100,
      averageEntrySize: stats.size > 0 ? Math.round(stats.totalMemoryUsage / stats.size) : 0
    }, 'cache')
  }

  // Cleanup expired entries
  cleanup(): number {
    logger.debug('Starting cache cleanup', {
      currentSize: this.cache.size
    }, 'cache')
    
    const initialSize = this.cache.size
    let removedCount = 0
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      if (this.delete(key)) {
        removedCount++
      }
    }

    logger.info('Cache cleanup completed', {
      initialSize,
      removedCount,
      finalSize: this.cache.size,
      cleanupEfficiency: removedCount > 0 ? `${Math.round((removedCount / initialSize) * 100)}%` : '0%'
    }, 'cache')

    return removedCount
  }
}

// Create global cache instance
logger.debug('Creating global cache instance', undefined, 'cache')
export const cache = new InMemoryCache(1000)

// Cache keys
export const CACHE_KEYS = {
  STRAVA_ACTIVITIES: 'strava:activities',
  FILTERED_ACTIVITIES: 'strava:filtered_activities',
  STRAVA_ACTIVITY_DETAILS: (id: number) => `strava:activity:${id}`,
  STRAVA_TOKEN: 'strava:token',
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  DASHBOARD_STATS: 'dashboard:stats'
} as const

// Cache TTL (Time To Live) in minutes
export const CACHE_TTL = {
  ACTIVITIES: 15,           // 15 minutes
  FILTERED_ACTIVITIES: 15,  // 15 minutes  
  ACTIVITY_DETAILS: 60,     // 1 hour
  TOKEN: 5,                 // 5 minutes
  USER_PROFILE: 30,         // 30 minutes
  DASHBOARD_STATS: 10       // 10 minutes
} as const

// Log cache configuration
logger.info('Cache configuration loaded', {
  cacheKeyCount: Object.keys(CACHE_KEYS).length,
  ttlConfig: CACHE_TTL,
  maxCacheSize: 1000
}, 'cache')

// Schedule periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    logger.debug('Running scheduled cache cleanup', undefined, 'cache')
    const removed = cache.cleanup()
    if (removed > 0) {
      cache.logStats()
    }
  }, 5 * 60 * 1000) // 5 minutes
  
  logger.info('Scheduled cache cleanup enabled', {
    intervalMinutes: 5
  }, 'cache')
}

logger.info('Cache system initialization complete', undefined, 'cache') 