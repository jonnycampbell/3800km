import { NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

export async function POST(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('sync-activities-request', 'sync-activities-api')
  
  logger.logRequest('POST', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'sync-activities-api', requestId)

  try {
    logger.info('Starting activity synchronization', undefined, 'sync-activities-api', undefined, requestId)
    
    const cookieStore = cookies()
    const userId = (await cookieStore).get('strava_user_id')?.value

    if (!userId) {
      logger.warn('Sync attempt without authentication', {
        hasUserId: false,
        cookies: Object.keys(Object.fromEntries((await cookieStore).getAll().map(c => [c.name, '[REDACTED]'])))
      }, 'sync-activities-api', undefined, requestId)
      
      const response = NextResponse.json({ error: 'Not authenticated', requestId }, { status: 401 })
      
      timer.end()
      logger.logResponse('POST', request.url, 401, undefined, { error: 'not_authenticated' }, 'sync-activities-api', requestId)
      return withRequestId(response, requestId)
    }

    logger.info('User authenticated for sync', { userId }, 'sync-activities-api', userId, requestId)

    // Get user data from database
    logger.debug('Fetching user data from database', { userId }, 'sync-activities-api', userId, requestId)
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      logger.error('User not found in database', userError, {
        userId,
        errorCode: userError?.code,
        errorMessage: userError?.message
      }, 'sync-activities-api', userId, requestId)
      
      const response = NextResponse.json({ error: 'User not found', requestId }, { status: 404 })
      
      timer.end()
      logger.logResponse('POST', request.url, 404, undefined, { error: 'user_not_found' }, 'sync-activities-api', requestId)
      return withRequestId(response, requestId)
    }

    logger.info('User data retrieved from database', {
      userId,
      stravaId: userData.strava_id,
      tokenExpiresAt: new Date(userData.expires_at * 1000).toISOString(),
      tokenExpired: stravaAPI.isTokenExpired(userData.expires_at),
      shouldRefresh: stravaAPI.shouldRefreshToken(userData.expires_at)
    }, 'sync-activities-api', userId, requestId)

    // Ensure we have a valid access token (handles refresh automatically)
    let accessToken: string
    try {
      accessToken = await stravaAPI.ensureValidToken(
        userId,
        userData.access_token,
        userData.refresh_token,
        userData.expires_at,
        supabase
      )
    } catch (tokenError) {
      logger.error('Failed to ensure valid token', tokenError, {
        userId,
        expiresAt: new Date(userData.expires_at * 1000).toISOString()
      }, 'sync-activities-api', userId, requestId)
      
      const response = NextResponse.json({ 
        error: 'Authentication failed',
        message: 'Unable to refresh access token. Please re-authenticate with Strava.',
        requestId,
        requiresReauth: true
      }, { status: 401 })
      
      timer.end()
      logger.logResponse('POST', request.url, 401, undefined, { error: 'token_refresh_failed' }, 'sync-activities-api', requestId)
      return withRequestId(response, requestId)
    }

    // Fetch all activities from Strava
    logger.info('Fetching all activities from Strava', { userId }, 'sync-activities-api', userId, requestId)
    const allActivities = await stravaAPI.getAllActivities(accessToken)
    
    logger.info('Activities fetched from Strava', {
      userId,
      totalActivities: allActivities.length,
      dateRange: allActivities.length > 0 ? {
        earliest: allActivities[allActivities.length - 1]?.start_date,
        latest: allActivities[0]?.start_date
      } : null
    }, 'sync-activities-api', userId, requestId)
    
    // Filter for hiking activities
    logger.info('Filtering for hiking activities', {
      userId,
      totalActivities: allActivities.length
    }, 'sync-activities-api', userId, requestId)
    
    const hikingActivities = stravaAPI.filterHikingActivities(allActivities)

    logger.info('Activities filtered', {
      userId,
      totalActivities: allActivities.length,
      hikingActivities: hikingActivities.length,
      filterRate: ((hikingActivities.length / allActivities.length) * 100).toFixed(1) + '%',
      totalDistance: hikingActivities.reduce((sum, activity) => sum + activity.distance, 0)
    }, 'sync-activities-api', userId, requestId)

    // Store activities in database
    logger.info('Preparing activities for database insertion', {
      userId,
      activitiesToInsert: hikingActivities.length
    }, 'sync-activities-api', userId, requestId)
    
    const activitiesToInsert = hikingActivities.map(activity => ({
      strava_id: activity.id.toString(),
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      start_date: activity.start_date,
      location_city: activity.location_city || null,
      location_country: activity.location_country || null,
      elevation_gain: activity.total_elevation_gain,
      user_id: userId,
    }))

    logger.debug('Inserting activities into database', {
      userId,
      activitiesCount: activitiesToInsert.length,
      sampleActivity: activitiesToInsert[0] ? {
        stravaId: activitiesToInsert[0].strava_id,
        name: activitiesToInsert[0].name,
        distance: activitiesToInsert[0].distance
      } : null
    }, 'sync-activities-api', userId, requestId)

    const { error: insertError } = await supabase
      .from('activities')
      .upsert(activitiesToInsert, {
        onConflict: 'strava_id',
        ignoreDuplicates: false,
      })

    if (insertError) {
      logger.error('Failed to insert activities into database', insertError, {
        userId,
        activitiesCount: activitiesToInsert.length,
        errorCode: insertError.code,
        errorMessage: insertError.message,
        errorDetails: insertError.details
      }, 'sync-activities-api', userId, requestId)
      
      const response = NextResponse.json({ 
        error: 'Failed to sync activities',
        message: insertError.message,
        requestId
      }, { status: 500 })
      
      timer.end()
      logger.logResponse('POST', request.url, 500, undefined, { error: 'database_insert_failed' }, 'sync-activities-api', requestId)
      return withRequestId(response, requestId)
    }

    logger.info('Activities synchronized successfully', {
      userId,
      activitiesSynced: activitiesToInsert.length,
      totalDistance: activitiesToInsert.reduce((sum, activity) => sum + activity.distance, 0),
      totalKm: Math.round(activitiesToInsert.reduce((sum, activity) => sum + activity.distance, 0) / 1000 * 10) / 10
    }, 'sync-activities-api', userId, requestId)

    const response = NextResponse.json({ 
      message: 'Activities synced successfully',
      count: activitiesToInsert.length,
      totalDistance: activitiesToInsert.reduce((sum, activity) => sum + activity.distance, 0),
      requestId
    })

    timer.end()
    logger.logResponse('POST', request.url, 200, undefined, {
      activitiesSynced: activitiesToInsert.length,
      totalDistance: activitiesToInsert.reduce((sum, activity) => sum + activity.distance, 0)
    }, 'sync-activities-api', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Error in sync activities endpoint', error, {
      url: request.url,
      method: request.method,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, 'sync-activities-api', undefined, requestId)
    
    const response = NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requestId
    }, { status: 500 })

    logger.logResponse('POST', request.url, 500, undefined, { error: 'internal_server_error' }, 'sync-activities-api', requestId)
    return withRequestId(response, requestId)
  }
} 