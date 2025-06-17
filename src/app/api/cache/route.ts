import { NextResponse } from 'next/server'
import { cache, CACHE_KEYS } from '@/lib/cache'

export async function GET() {
  try {
    const cacheStatus = {
      size: cache.size(),
      activities: cache.getInfo(CACHE_KEYS.STRAVA_ACTIVITIES),
      filteredActivities: cache.getInfo(CACHE_KEYS.FILTERED_ACTIVITIES),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(cacheStatus)
  } catch (error) {
    console.error('Error getting cache status:', error)
    return NextResponse.json({ 
      error: 'Failed to get cache status',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const sizeBefore = cache.size()
    cache.clear()
    const sizeAfter = cache.size()

    console.log(`🗑️ Cache cleared: ${sizeBefore} items removed`)

    return NextResponse.json({
      message: 'Cache cleared successfully',
      itemsRemoved: sizeBefore,
      currentSize: sizeAfter,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
} 