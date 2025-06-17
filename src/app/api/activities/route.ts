import { NextResponse } from 'next/server'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

// Enable better caching for production
export const dynamic = 'force-dynamic'
export const revalidate = 900 // Revalidate every 15 minutes

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  start_date: string
  start_date_local: string
  location_city?: string
  location_country?: string
  description?: string
}

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

async function refreshStravaToken(requestId: string): Promise<string | null> {
  logger.debug('Attempting to refresh Strava token', undefined, 'activities-api', undefined, requestId)
  
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    logger.error('Missing Strava credentials for token refresh', undefined, {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken
    }, 'activities-api', undefined, requestId)
    return null
  }

  try {
    logger.info('Making token refresh request to Strava', undefined, 'activities-api', undefined, requestId)
    
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    logger.debug('Token refresh response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    }, 'activities-api', undefined, requestId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Failed to refresh token', undefined, {
        status: response.status,
        statusText: response.statusText,
        errorText
      }, 'activities-api', undefined, requestId)
      return null
    }

    const data: StravaTokenResponse = await response.json()
    logger.info('Token refreshed successfully', {
      expiresAt: new Date(data.expires_at * 1000).toISOString(),
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token
    }, 'activities-api', undefined, requestId)
    
    return data.access_token
  } catch (error) {
    logger.error('Error refreshing token', error, undefined, 'activities-api', undefined, requestId)
    return null
  }
}

async function fetchStravaActivities(accessToken: string, requestId: string): Promise<StravaActivity[]> {
  logger.debug('Starting Strava activities fetch', undefined, 'activities-api', undefined, requestId)
  
  // Check cache first
  const cachedActivities = cache.get<StravaActivity[]>(CACHE_KEYS.STRAVA_ACTIVITIES)
  if (cachedActivities) {
    const cacheInfo = cache.getInfo(CACHE_KEYS.STRAVA_ACTIVITIES)
    logger.info('Using cached activities', {
      cacheAge: cacheInfo.age,
      cacheTtl: cacheInfo.ttl,
      activitiesCount: cachedActivities.length
    }, 'activities-api', undefined, requestId)
    return cachedActivities
  }

  logger.info('Fetching fresh activities from Strava API', undefined, 'activities-api', undefined, requestId)
  
  const timer = logger.time('strava-api-fetch', 'activities-api')
  
  // Try to fetch activities with current token
  let response = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=200',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      // Better caching for production
      next: { revalidate: 900 }
    }
  )

  logger.debug('Initial Strava API response', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  }, 'activities-api', undefined, requestId)

  // If unauthorized, try to refresh the token
  if (response.status === 401) {
    logger.warn('Access token expired or invalid, attempting to refresh', undefined, 'activities-api', undefined, requestId)
    const newAccessToken = await refreshStravaToken(requestId)
    
    if (newAccessToken) {
      accessToken = newAccessToken
      logger.info('Token refreshed, retrying request', undefined, 'activities-api', undefined, requestId)
      
      // Retry with new token
      response = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=200',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          next: { revalidate: 900 }
        }
      )
      
      logger.debug('Retry Strava API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      }, 'activities-api', undefined, requestId)
    } else {
      logger.error('Failed to refresh token, cannot retry request', undefined, undefined, 'activities-api', undefined, requestId)
    }
  }

  timer.end()

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Strava API Error', undefined, {
      status: response.status,
      statusText: response.statusText,
      errorText,
      url: response.url
    }, 'activities-api', undefined, requestId)
    
    if (response.status === 401) {
      throw new Error('Strava authorization failed')
    }
    
    throw new Error(`Strava API returned ${response.status}: ${response.statusText}`)
  }

  const activities: StravaActivity[] = await response.json()
  logger.info('Successfully fetched activities from Strava', {
    activitiesCount: activities.length,
    firstActivityDate: activities[0]?.start_date,
    lastActivityDate: activities[activities.length - 1]?.start_date
  }, 'activities-api', undefined, requestId)
  
  // Cache the activities
  cache.set(CACHE_KEYS.STRAVA_ACTIVITIES, activities, CACHE_TTL.ACTIVITIES)
  logger.debug('Cached activities', {
    cacheKey: CACHE_KEYS.STRAVA_ACTIVITIES,
    ttlMinutes: CACHE_TTL.ACTIVITIES,
    activitiesCount: activities.length
  }, 'activities-api', undefined, requestId)
  
  return activities
}

export async function GET(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('activities-api-request', 'activities-api')
  
  logger.logRequest('GET', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'activities-api', requestId)

  try {
    // Validate environment
    const requiredEnvVars = [
      'STRAVA_ACCESS_TOKEN',
      'STRAVA_CLIENT_ID', 
      'STRAVA_CLIENT_SECRET',
      'STRAVA_REFRESH_TOKEN'
    ]
    
    if (!logger.validateEnvironment(requiredEnvVars, 'activities-api')) {
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      
      logger.error('Environment validation failed', undefined, {
        missingVars,
        environment: process.env.NODE_ENV
      }, 'activities-api', undefined, requestId)
      
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Server configuration error. Please check environment variables.'
        : `Missing environment variables: ${missingVars.join(', ')}`
      
      const response = NextResponse.json(
        { 
          error: errorMessage,
          setupRequired: true,
          missingVariables: missingVars,
          requestId 
        },
        { status: 500 }
      )
      
      logger.logResponse('GET', request.url, 500, undefined, { errorMessage }, 'activities-api', requestId)
      return withRequestId(response, requestId)
    }

    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    logger.debug('Request parameters parsed', {
      forceRefresh,
      searchParams: Object.fromEntries(searchParams.entries())
    }, 'activities-api', undefined, requestId)
    
    if (forceRefresh) {
      logger.info('Force refresh requested, clearing cache', undefined, 'activities-api', undefined, requestId)
      cache.delete(CACHE_KEYS.STRAVA_ACTIVITIES)
      cache.delete(CACHE_KEYS.FILTERED_ACTIVITIES)
    }

    // Check for cached filtered results first
    if (!forceRefresh) {
      const cachedFiltered = cache.get(CACHE_KEYS.FILTERED_ACTIVITIES)
      if (cachedFiltered) {
        const cacheInfo = cache.getInfo(CACHE_KEYS.FILTERED_ACTIVITIES)
        logger.info('Returning cached filtered activities', {
          cacheAge: cacheInfo.age,
          activitiesCount: Array.isArray(cachedFiltered) ? cachedFiltered.length : 'unknown'
        }, 'activities-api', undefined, requestId)
        
        const response = NextResponse.json(cachedFiltered)
        response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
        response.headers.set('X-Cache-Status', 'HIT')
        response.headers.set('X-Cache-Age', cacheInfo.age?.toString() || '0')
        
        timer.end()
        logger.logResponse('GET', request.url, 200, undefined, { cacheHit: true }, 'activities-api', requestId)
        return withRequestId(response, requestId)
      }
    }

    const accessToken = process.env.STRAVA_ACCESS_TOKEN

    if (!accessToken) {
      logger.error('STRAVA_ACCESS_TOKEN not found in environment variables', undefined, undefined, 'activities-api', undefined, requestId)
      
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Authentication configuration error'
        : 'STRAVA_ACCESS_TOKEN environment variable is not set'
      
      const response = NextResponse.json(
        { 
          error: errorMessage,
          setupRequired: true,
          requestId
        },
        { status: 500 }
      )
      
      timer.end()
      logger.logResponse('GET', request.url, 500, undefined, { error: 'missing_access_token' }, 'activities-api', requestId)
      return withRequestId(response, requestId)
    }

    logger.debug('Access token found, proceeding with API call', {
      hasToken: true,
      tokenLength: accessToken.length
    }, 'activities-api', undefined, requestId)

    // Fetch activities from Strava
    const activities = await fetchStravaActivities(accessToken, requestId)

    // Filter for hiking activities with #3800km hashtag
    logger.info('Filtering activities for hiking with #3800km hashtag', {
      totalActivities: activities.length
    }, 'activities-api', undefined, requestId)

    const hikingTypes = ['Hike']
    const filteredActivities = activities.filter(activity => {
      const isHikingType = hikingTypes.includes(activity.type) || 
                          hikingTypes.includes(activity.sport_type)
      
      const hasHashtag = activity.description && 
                        activity.description.toLowerCase().includes('#3800km')
      
      logger.debug('Activity filter check', {
        activityId: activity.id,
        activityName: activity.name,
        type: activity.type,
        sport_type: activity.sport_type,
        isHikingType,
        hasDescription: !!activity.description,
        hasHashtag,
        included: isHikingType && hasHashtag
      }, 'activities-api', undefined, requestId)
      
      return isHikingType && hasHashtag
    })

    logger.info('Activity filtering completed', {
      totalActivities: activities.length,
      filteredActivities: filteredActivities.length,
      totalDistance: filteredActivities.reduce((sum, a) => sum + a.distance, 0),
      filterCriteria: { hikingTypes, hashtag: '#3800km' }
    }, 'activities-api', undefined, requestId)

    // Calculate summary statistics
    const totalDistance = filteredActivities.reduce((sum, activity) => sum + activity.distance, 0)
    const totalKm = totalDistance / 1000
    const goalKm = 3800
    const progressPercentage = (totalKm / goalKm) * 100

    const stats = {
      totalActivities: filteredActivities.length,
      totalDistance,
      totalKm: Math.round(totalKm * 10) / 10,
      goalKm,
      progressPercentage: Math.round(progressPercentage * 10) / 10,
      remainingKm: Math.round((goalKm - totalKm) * 10) / 10
    }

    logger.info('Statistics calculated', stats, 'activities-api', undefined, requestId)

    // Cache the filtered results
    cache.set(CACHE_KEYS.FILTERED_ACTIVITIES, filteredActivities, CACHE_TTL.FILTERED_ACTIVITIES)
    logger.debug('Cached filtered activities', {
      cacheKey: CACHE_KEYS.FILTERED_ACTIVITIES,
      ttlMinutes: CACHE_TTL.FILTERED_ACTIVITIES
    }, 'activities-api', undefined, requestId)

    const response = NextResponse.json(filteredActivities)
    response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
    response.headers.set('X-Cache-Status', 'MISS')
    response.headers.set('X-Stats', JSON.stringify(stats))

    timer.end()
    logger.logResponse('GET', request.url, 200, undefined, {
      cacheHit: false,
      activitiesCount: filteredActivities.length,
      stats
    }, 'activities-api', requestId)

    return withRequestId(response, requestId)

  } catch (error) {
    timer.end()
    logger.error('Activities API error', error, {
      url: request.url,
      method: request.method
    }, 'activities-api', undefined, requestId)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    const response = NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : errorMessage,
        setupRequired: errorMessage.includes('authorization') || errorMessage.includes('token'),
        requestId
      },
      { status: 500 }
    )

    logger.logResponse('GET', request.url, 500, undefined, { error: errorMessage }, 'activities-api', requestId)
    return withRequestId(response, requestId)
  }
} 