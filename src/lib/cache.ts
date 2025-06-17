interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>()

  set<T>(key: string, data: T, ttlMinutes: number = 30): void {
    const ttl = ttlMinutes * 60 * 1000 // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if cache has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  size(): number {
    return this.cache.size
  }

  // Get cache info for debugging
  getInfo(key: string): { exists: boolean; age?: number; ttl?: number } {
    const item = this.cache.get(key)
    if (!item) return { exists: false }
    
    const age = Date.now() - item.timestamp
    return {
      exists: true,
      age: Math.round(age / 1000), // age in seconds
      ttl: Math.round(item.ttl / 1000) // ttl in seconds
    }
  }
}

// Create singleton instance
export const cache = new MemoryCache()

// Cache keys
export const CACHE_KEYS = {
  STRAVA_ACTIVITIES: 'strava_activities',
  STRAVA_ACTIVITY_DETAILS: (id: number) => `strava_activity_${id}`,
  FILTERED_ACTIVITIES: 'filtered_hiking_activities'
} as const

// Cache TTL in minutes
export const CACHE_TTL = {
  ACTIVITIES: 15, // 15 minutes for activity list
  ACTIVITY_DETAILS: 60, // 1 hour for individual activity details
  FILTERED_ACTIVITIES: 15 // 15 minutes for filtered results
} as const 