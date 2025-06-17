import { logger } from '@/lib/logger'
import { SupabaseClient } from '@supabase/supabase-js'

export interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  start_date: string
  start_date_local: string
  location_city?: string
  location_country?: string
  sport_type: string
  description?: string
}

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
  }
}

export class StravaAPI {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    logger.debug('Initializing StravaAPI class', undefined, 'strava-api')
    
    this.clientId = process.env.STRAVA_CLIENT_ID!
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET!
    this.redirectUri = process.env.STRAVA_REDIRECT_URI!

    // Validate environment variables
    const hasClientId = !!this.clientId
    const hasClientSecret = !!this.clientSecret
    const hasRedirectUri = !!this.redirectUri

    logger.debug('StravaAPI environment validation', {
      hasClientId,
      hasClientSecret,
      hasRedirectUri,
      redirectUri: this.redirectUri // Safe to log redirect URI
    }, 'strava-api')

    if (!hasClientId || !hasClientSecret || !hasRedirectUri) {
      const missing = []
      if (!hasClientId) missing.push('STRAVA_CLIENT_ID')
      if (!hasClientSecret) missing.push('STRAVA_CLIENT_SECRET')
      if (!hasRedirectUri) missing.push('STRAVA_REDIRECT_URI')
      
      logger.error('Missing required Strava environment variables', undefined, {
        missing,
        environment: process.env.NODE_ENV
      }, 'strava-api')
    } else {
      logger.info('StravaAPI initialized successfully', {
        clientIdLength: this.clientId.length,
        redirectUri: this.redirectUri
      }, 'strava-api')
    }
  }

  getAuthUrl(): string {
    logger.info('Generating Strava authorization URL', undefined, 'strava-api')
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'read,activity:read',
    })
    
    const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`
    
    logger.debug('Generated authorization URL', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scope: 'read,activity:read',
      urlLength: authUrl.length
    }, 'strava-api')
    
    return authUrl
  }

  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    logger.info('Exchanging authorization code for token', {
      codeLength: code.length,
      codePrefix: code.substring(0, 10) + '...'
    }, 'strava-api')
    
    const timer = logger.time('strava-token-exchange', 'strava-api')
    
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
        }),
      })

      timer.end()

      logger.debug('Token exchange response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      }, 'strava-api')

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Failed to exchange code for token', undefined, {
          status: response.status,
          statusText: response.statusText,
          errorText
        }, 'strava-api')
        throw new Error('Failed to exchange code for token')
      }

      const tokenData: StravaTokenResponse = await response.json()
      
      logger.info('Successfully exchanged code for token', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000).toISOString(),
        athleteId: tokenData.athlete.id,
        athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`
      }, 'strava-api')

      return tokenData
    } catch (error) {
      timer.end()
      logger.error('Error exchanging code for token', error, undefined, 'strava-api')
      throw error
    }
  }

  /**
   * Check if a token should be refreshed proactively
   * Strava recommends refreshing tokens that expire within 1 hour (3600 seconds)
   */
  shouldRefreshToken(expiresAt: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt - currentTime
    const oneHour = 3600 // 1 hour in seconds
    
    logger.debug('Token expiry check', {
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString(),
      timeUntilExpiry,
      shouldRefresh: timeUntilExpiry <= oneHour
    }, 'strava-api')
    
    return timeUntilExpiry <= oneHour
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(expiresAt: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000)
    return currentTime >= expiresAt
  }

  async refreshToken(refreshToken: string): Promise<StravaTokenResponse> {
    logger.info('Refreshing Strava access token', {
      refreshTokenLength: refreshToken.length
    }, 'strava-api')
    
    const timer = logger.time('strava-token-refresh', 'strava-api')
    
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      timer.end()

      logger.debug('Token refresh response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      }, 'strava-api')

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Failed to refresh token', undefined, {
          status: response.status,
          statusText: response.statusText,
          errorText
        }, 'strava-api')
        
        // More specific error handling based on Strava's common error responses
        if (response.status === 400) {
          throw new Error('Invalid refresh token or client credentials')
        } else if (response.status === 401) {
          throw new Error('Refresh token has been revoked or expired')
        } else {
          throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
        }
      }

      const tokenData: StravaTokenResponse = await response.json()
      
      // Validate the response has required fields
      if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_at) {
        logger.error('Invalid token response from Strava', undefined, {
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          hasExpiresAt: !!tokenData.expires_at
        }, 'strava-api')
        throw new Error('Invalid token response from Strava API')
      }
      
      logger.info('Successfully refreshed token', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresAt: new Date(tokenData.expires_at * 1000).toISOString(),
        expiresInHours: Math.round((tokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60))
      }, 'strava-api')

      return tokenData
    } catch (error) {
      timer.end()
      logger.error('Error refreshing token', error, undefined, 'strava-api')
      throw error
    }
  }

  async getActivities(
    accessToken: string,
    page = 1,
    perPage = 200
  ): Promise<StravaActivity[]> {
    logger.info('Fetching activities from Strava', {
      page,
      perPage,
      accessTokenLength: accessToken.length
    }, 'strava-api')
    
    const timer = logger.time(`strava-get-activities-page-${page}`, 'strava-api')
    
    try {
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      timer.end()

      logger.debug('Get activities response received', {
        page,
        perPage,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      }, 'strava-api')

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Failed to fetch activities', undefined, {
          page,
          perPage,
          status: response.status,
          statusText: response.statusText,
          errorText
        }, 'strava-api')
        throw new Error('Failed to fetch activities')
      }

      const activities: StravaActivity[] = await response.json()
      
      logger.info('Successfully fetched activities', {
        page,
        perPage,
        activitiesCount: activities.length,
        firstActivityDate: activities[0]?.start_date,
        lastActivityDate: activities[activities.length - 1]?.start_date
      }, 'strava-api')

      return activities
    } catch (error) {
      timer.end()
      logger.error('Error fetching activities', error, {
        page,
        perPage
      }, 'strava-api')
      throw error
    }
  }

  async getAllActivities(accessToken: string): Promise<StravaActivity[]> {
    logger.info('Starting to fetch all activities from Strava', {
      accessTokenLength: accessToken.length
    }, 'strava-api')
    
    const allActivities: StravaActivity[] = []
    let page = 1
    let hasMore = true
    const timer = logger.time('strava-get-all-activities', 'strava-api')

    try {
      while (hasMore) {
        logger.debug('Fetching activities page', { page }, 'strava-api')
        
        const activities = await this.getActivities(accessToken, page)
        
        if (activities.length === 0) {
          hasMore = false
          logger.debug('No more activities found, stopping pagination', { page }, 'strava-api')
        } else {
          allActivities.push(...activities)
          logger.debug('Added activities to collection', {
            page,
            pageActivities: activities.length,
            totalActivities: allActivities.length
          }, 'strava-api')
          page++
        }
      }

      timer.end()
      
      logger.info('Successfully fetched all activities', {
        totalPages: page - 1,
        totalActivities: allActivities.length,
        dateRange: allActivities.length > 0 ? {
          earliest: allActivities[allActivities.length - 1]?.start_date,
          latest: allActivities[0]?.start_date
        } : null
      }, 'strava-api')

      return allActivities
    } catch (error) {
      timer.end()
      logger.error('Error fetching all activities', error, {
        completedPages: page - 1,
        partialResults: allActivities.length
      }, 'strava-api')
      throw error
    }
  }

  filterHikingActivities(activities: StravaActivity[]): StravaActivity[] {
    logger.info('Starting to filter hiking activities', {
      totalActivities: activities.length
    }, 'strava-api')
    
    const hikingTypes = ['Hike']
    const hashtag = '#3800km'
    
    logger.debug('Filter criteria', {
      hikingTypes,
      hashtag,
      caseSensitive: false
    }, 'strava-api')
    
    const filteredActivities = activities.filter(activity => {
      // First check if it's a hiking activity
      const isHikingType = hikingTypes.includes(activity.type) || 
                          hikingTypes.includes(activity.sport_type)
      
      // Then check if it has the #3800km hashtag in the description
      const hasHashtag = activity.description && 
                        activity.description.toLowerCase().includes(hashtag.toLowerCase())
      
      const included = isHikingType && hasHashtag
      
      logger.debug('Activity filter evaluation', {
        activityId: activity.id,
        activityName: activity.name,
        type: activity.type,
        sport_type: activity.sport_type,
        isHikingType,
        hasDescription: !!activity.description,
        descriptionLength: activity.description?.length || 0,
        hasHashtag,
        included
      }, 'strava-api')
      
      return included
    })

    // Calculate summary statistics
    const totalDistance = filteredActivities.reduce((sum, activity) => sum + activity.distance, 0)
    const totalKm = totalDistance / 1000
    
    logger.info('Hiking activities filtering completed', {
      totalActivities: activities.length,
      filteredActivities: filteredActivities.length,
      filterRate: ((filteredActivities.length / activities.length) * 100).toFixed(1) + '%',
      totalDistance,
      totalKm: Math.round(totalKm * 10) / 10,
      dateRange: filteredActivities.length > 0 ? {
        earliest: filteredActivities[filteredActivities.length - 1]?.start_date,
        latest: filteredActivities[0]?.start_date
      } : null
    }, 'strava-api')

    return filteredActivities
  }

  /**
   * Comprehensive token management - checks if refresh is needed and handles the refresh + database update
   * Returns the current valid access token
   */
  async ensureValidToken(
    userId: string,
    currentAccessToken: string,
    currentRefreshToken: string,
    expiresAt: number,
    supabaseClient: SupabaseClient
  ): Promise<string> {
    logger.info('Ensuring valid token', {
      userId,
      tokenExpiresAt: new Date(expiresAt * 1000).toISOString(),
      isExpired: this.isTokenExpired(expiresAt),
      shouldRefresh: this.shouldRefreshToken(expiresAt)
    }, 'strava-api')

    // If token doesn't need refresh, return current token
    if (!this.shouldRefreshToken(expiresAt)) {
      logger.debug('Token is still valid, no refresh needed', {
        userId,
        timeUntilExpiry: Math.round((expiresAt * 1000 - Date.now()) / 1000 / 60) + ' minutes'
      }, 'strava-api')
      return currentAccessToken
    }

    // Token needs refresh
    const refreshReason = this.isTokenExpired(expiresAt) ? 'expired' : 'expires_soon'
    logger.info('Refreshing token', {
      userId,
      reason: refreshReason,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    }, 'strava-api')

    try {
      const newTokenData = await this.refreshToken(currentRefreshToken)
      
      // Update tokens in database
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token,
          expires_at: newTokenData.expires_at,
        })
        .eq('id', userId)

      if (updateError) {
        logger.error('Failed to update tokens in database after refresh', updateError, {
          userId,
          errorCode: updateError.code,
          errorMessage: updateError.message
        }, 'strava-api')
        // Still return the new token even if DB update failed
        // The app can continue working, but next request might need another refresh
      } else {
        logger.info('Successfully refreshed and updated tokens', {
          userId,
          newExpiresAt: new Date(newTokenData.expires_at * 1000).toISOString(),
          expiresInHours: Math.round((newTokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60))
        }, 'strava-api')
      }

      return newTokenData.access_token
    } catch (error) {
      logger.error('Failed to refresh token in ensureValidToken', error, {
        userId,
        refreshTokenLength: currentRefreshToken?.length || 0
      }, 'strava-api')
      throw new Error('Token refresh failed. Re-authentication required.')
    }
  }
}

logger.info('Creating Strava API instance', undefined, 'strava-api')
export const stravaAPI = new StravaAPI() 