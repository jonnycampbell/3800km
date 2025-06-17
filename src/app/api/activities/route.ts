import { NextResponse } from 'next/server'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// Enable caching for this route
export const dynamic = 'force-dynamic' // We need dynamic for cache management
export const revalidate = 900 // Revalidate every 15 minutes (900 seconds)

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

async function refreshStravaToken(): Promise<string | null> {
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Strava credentials for token refresh')
    return null
  }

  try {
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

    if (!response.ok) {
      console.error('Failed to refresh token:', response.status, await response.text())
      return null
    }

    const data: StravaTokenResponse = await response.json()
    console.log('Token refreshed successfully, expires at:', new Date(data.expires_at * 1000))
    
    // In a real app, you'd want to update your stored tokens here
    // For now, we'll just return the new access token
    return data.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
  // Check cache first
  const cachedActivities = cache.get<StravaActivity[]>(CACHE_KEYS.STRAVA_ACTIVITIES)
  if (cachedActivities) {
    const cacheInfo = cache.getInfo(CACHE_KEYS.STRAVA_ACTIVITIES)
    console.log(`📦 Using cached activities (age: ${cacheInfo.age}s, ttl: ${cacheInfo.ttl}s)`)
    return cachedActivities
  }

  console.log('🌐 Fetching fresh activities from Strava API...')
  
  // Try to fetch activities with current token
  let response = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=200',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      // Add Next.js caching
      next: { revalidate: 900 } // 15 minutes
    }
  )

  // If unauthorized, try to refresh the token
  if (response.status === 401) {
    console.log('Access token expired or invalid, attempting to refresh...')
    const newAccessToken = await refreshStravaToken()
    
    if (newAccessToken) {
      accessToken = newAccessToken
      console.log('Token refreshed, retrying request...')
      
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
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Strava API Error:', response.status, response.statusText, errorText)
    
    if (response.status === 401) {
      throw new Error('Strava authorization failed')
    }
    
    throw new Error(`Strava API returned ${response.status}: ${response.statusText}`)
  }

  const activities: StravaActivity[] = await response.json()
  console.log(`✅ Fetched ${activities.length} fresh activities from Strava`)
  
  // Cache the activities
  cache.set(CACHE_KEYS.STRAVA_ACTIVITIES, activities, CACHE_TTL.ACTIVITIES)
  console.log(`💾 Cached activities for ${CACHE_TTL.ACTIVITIES} minutes`)
  
  return activities
}

async function fetchActivityDetails(activityId: number, accessToken: string): Promise<unknown> {
  const cacheKey = CACHE_KEYS.STRAVA_ACTIVITY_DETAILS(activityId)
  
  // Check cache first
  const cachedDetails = cache.get(cacheKey)
  if (cachedDetails) {
    return cachedDetails
  }

  // Fetch from API
  const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // Cache individual activity details for longer
    next: { revalidate: 3600 } // 1 hour
  })

  if (response.ok) {
    const details = await response.json()
    // Cache the details for longer since they don't change
    cache.set(cacheKey, details, CACHE_TTL.ACTIVITY_DETAILS)
    return details
  }
  
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    if (forceRefresh) {
      console.log('🔄 Force refresh requested, clearing cache...')
      cache.delete(CACHE_KEYS.STRAVA_ACTIVITIES)
      cache.delete(CACHE_KEYS.FILTERED_ACTIVITIES)
    }

    // Check for cached filtered results first
    if (!forceRefresh) {
      const cachedFiltered = cache.get(CACHE_KEYS.FILTERED_ACTIVITIES)
      if (cachedFiltered) {
        const cacheInfo = cache.getInfo(CACHE_KEYS.FILTERED_ACTIVITIES)
        console.log(`⚡ Returning cached filtered activities (age: ${cacheInfo.age}s)`)
        
        // Add cache headers to the response
        const response = NextResponse.json(cachedFiltered)
        response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
        response.headers.set('X-Cache-Status', 'HIT')
        response.headers.set('X-Cache-Age', cacheInfo.age?.toString() || '0')
        return response
      }
    }

    const accessToken = process.env.STRAVA_ACCESS_TOKEN

    if (!accessToken) {
      console.error('STRAVA_ACCESS_TOKEN not found in environment variables')
      
      // List all missing environment variables for better debugging
      const missingVars = []
      if (!process.env.STRAVA_ACCESS_TOKEN) missingVars.push('STRAVA_ACCESS_TOKEN')
      if (!process.env.STRAVA_CLIENT_ID) missingVars.push('STRAVA_CLIENT_ID')
      if (!process.env.STRAVA_CLIENT_SECRET) missingVars.push('STRAVA_CLIENT_SECRET')
      if (!process.env.STRAVA_REFRESH_TOKEN) missingVars.push('STRAVA_REFRESH_TOKEN')
      
      return NextResponse.json({ 
        error: 'Strava configuration incomplete',
        message: `Missing environment variables: ${missingVars.join(', ')}. Please configure these in your deployment platform.`,
        missingVariables: missingVars,
        setupRequired: true
      }, { status: 500 })
    }

    // Fetch activities (from cache or API)
    const activities = await fetchStravaActivities(accessToken)

    // First filter for hiking activities by type
    const hikingTypes = ['Hike']
    const potentialHikingActivities = activities.filter(activity => 
      hikingTypes.includes(activity.type) || hikingTypes.includes(activity.sport_type)
    )
    
    console.log(`🥾 Found ${potentialHikingActivities.length} potential hiking activities`)

    // Fetch detailed data for all hiking activities concurrently with caching
    console.log('📋 Fetching detailed data for hiking activities...')
    
    const detailPromises = potentialHikingActivities.map(async activity => {
      try {
        const detailedActivity = await fetchActivityDetails(activity.id, accessToken)
        
        if (detailedActivity) {
          const activityWithDescription = detailedActivity as { description?: string }
          const hasHashtag = activityWithDescription.description && 
                            activityWithDescription.description.toLowerCase().includes('#3800km')
          
          console.log(`🔍 "${activity.name}": ${hasHashtag ? '✅ HAS #3800km' : '❌ No hashtag'}`)
          
          return hasHashtag ? {
            ...activity,
            description: activityWithDescription.description
          } : null
        }
        return null
      } catch (error) {
        console.warn(`⚠️ Error fetching details for "${activity.name}":`, error)
        return null
      }
    })

    // Wait for all requests to complete
    const results = await Promise.all(detailPromises)
    const detailedHikingActivities = results.filter(activity => activity !== null)

    console.log(`✅ Filtered to ${detailedHikingActivities.length} hiking activities with #3800km hashtag`)

    // Transform to match your component interface
    const transformedActivities = detailedHikingActivities.map(activity => ({
      id: activity.id,
      strava_id: activity.id.toString(),
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      start_date: activity.start_date,
      location_city: activity.location_city || null,
      location_country: activity.location_country || null,
      elevation_gain: activity.total_elevation_gain,
    }))

    // Cache the final filtered results
    cache.set(CACHE_KEYS.FILTERED_ACTIVITIES, transformedActivities, CACHE_TTL.FILTERED_ACTIVITIES)
    console.log(`💾 Cached filtered results for ${CACHE_TTL.FILTERED_ACTIVITIES} minutes`)

    // Return with cache headers
    const response = NextResponse.json(transformedActivities)
    response.headers.set('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800')
    response.headers.set('X-Cache-Status', 'MISS')
    return response
  } catch (error) {
    console.error('❌ Error fetching activities:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch activities',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
} 