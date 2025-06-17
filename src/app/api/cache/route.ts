import { NextResponse } from 'next/server'
import { cache, CACHE_KEYS } from '@/lib/cache'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

export async function GET(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('cache-status-request', 'cache-api')
  
  logger.logRequest('GET', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'cache-api', requestId)

  try {
    logger.info('Getting cache status', undefined, 'cache-api', undefined, requestId)
    
    const cacheStatus = {
      stats: cache.getStats(),
      activities: cache.getInfo(CACHE_KEYS.STRAVA_ACTIVITIES),
      filteredActivities: cache.getInfo(CACHE_KEYS.FILTERED_ACTIVITIES),
      timestamp: new Date().toISOString()
    }

    logger.info('Cache status retrieved successfully', {
      totalSize: cacheStatus.stats.size,
      hitRate: cacheStatus.stats.hitRate,
      missRate: cacheStatus.stats.missRate,
      memoryUsage: cacheStatus.stats.totalMemoryUsage,
      activitiesExists: cacheStatus.activities.exists,
      filteredActivitiesExists: cacheStatus.filteredActivities.exists
    }, 'cache-api', undefined, requestId)

    const response = NextResponse.json(cacheStatus)
    
    timer.end()
    logger.logResponse('GET', request.url, 200, undefined, {
      cacheSize: cacheStatus.stats.size,
      hitRate: cacheStatus.stats.hitRate
    }, 'cache-api', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Error getting cache status', error, undefined, 'cache-api', undefined, requestId)
    
    const response = NextResponse.json({ 
      error: 'Failed to get cache status',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requestId
    }, { status: 500 })

    logger.logResponse('GET', request.url, 500, undefined, { error: 'cache_status_failed' }, 'cache-api', requestId)
    return withRequestId(response, requestId)
  }
}

export async function DELETE(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('cache-clear-request', 'cache-api')
  
  logger.logRequest('DELETE', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'cache-api', requestId)

  try {
    logger.info('Clearing cache', undefined, 'cache-api', undefined, requestId)
    
    const sizeBefore = cache.getStats().size
    const memoryBefore = cache.getStats().totalMemoryUsage
    
    cache.clear()
    
    const sizeAfter = cache.getStats().size
    const memoryAfter = cache.getStats().totalMemoryUsage

    logger.info('Cache cleared successfully', {
      itemsRemoved: sizeBefore,
      memoryFreed: memoryBefore - memoryAfter,
      sizeBefore,
      sizeAfter,
      memoryBefore,
      memoryAfter
    }, 'cache-api', undefined, requestId)

    const response = NextResponse.json({
      message: 'Cache cleared successfully',
      itemsRemoved: sizeBefore,
      currentSize: sizeAfter,
      memoryFreed: memoryBefore - memoryAfter,
      timestamp: new Date().toISOString(),
      requestId
    })

    timer.end()
    logger.logResponse('DELETE', request.url, 200, undefined, {
      itemsRemoved: sizeBefore,
      memoryFreed: memoryBefore - memoryAfter
    }, 'cache-api', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Error clearing cache', error, undefined, 'cache-api', undefined, requestId)
    
    const response = NextResponse.json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requestId
    }, { status: 500 })

    logger.logResponse('DELETE', request.url, 500, undefined, { error: 'cache_clear_failed' }, 'cache-api', requestId)
    return withRequestId(response, requestId)
  }
} 