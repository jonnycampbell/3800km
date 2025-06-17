import { NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

export async function GET(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('strava-auth-request', 'strava-auth')
  
  logger.logRequest('GET', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'strava-auth', requestId)

  try {
    logger.info('Generating Strava authorization URL', undefined, 'strava-auth', undefined, requestId)
    
    const authUrl = stravaAPI.getAuthUrl()
    
    logger.info('Redirecting to Strava authorization', {
      authUrlLength: authUrl.length,
      authDomain: new URL(authUrl).hostname
    }, 'strava-auth', undefined, requestId)

    const response = NextResponse.redirect(authUrl)
    
    timer.end()
    logger.logResponse('GET', request.url, 302, undefined, {
      redirectTo: 'strava_oauth',
      authUrlDomain: new URL(authUrl).hostname
    }, 'strava-auth', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Error generating Strava auth URL', error, undefined, 'strava-auth', undefined, requestId)
    
    const response = NextResponse.json({
      error: 'Failed to generate authorization URL',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requestId
    }, { status: 500 })

    logger.logResponse('GET', request.url, 500, undefined, { error: 'auth_url_generation_failed' }, 'strava-auth', requestId)
    return withRequestId(response, requestId)
  }
} 