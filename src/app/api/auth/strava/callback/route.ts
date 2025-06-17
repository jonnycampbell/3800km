import { NextRequest, NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'
import { supabase } from '@/lib/supabase'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const timer = logger.time('strava-auth-callback-request', 'strava-auth-callback')
  
  logger.logRequest('GET', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'strava-auth-callback', requestId)

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  logger.info('Strava OAuth callback received', {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!state,
    errorType: error,
    codeLength: code?.length || 0
  }, 'strava-auth-callback', undefined, requestId)

  if (error || !code) {
    logger.warn('OAuth callback failed', {
      error,
      hasCode: !!code,
      reason: error || 'missing_code'
    }, 'strava-auth-callback', undefined, requestId)
    
    const response = NextResponse.redirect(new URL('/?error=auth_failed', request.url))
    
    timer.end()
    logger.logResponse('GET', request.url, 302, undefined, {
      redirectTo: 'home_with_error',
      error: error || 'missing_code'
    }, 'strava-auth-callback', requestId)
    
    return withRequestId(response, requestId)
  }

  try {
    logger.info('Exchanging authorization code for tokens', {
      codeLength: code.length
    }, 'strava-auth-callback', undefined, requestId)
    
    const tokenData = await stravaAPI.exchangeCodeForToken(code)
    
    logger.info('Successfully received tokens from Strava', {
      athleteId: tokenData.athlete.id,
      athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresAt: new Date(tokenData.expires_at * 1000).toISOString()
    }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)
    
    // Store user data in Supabase
    logger.info('Storing user data in database', {
      athleteId: tokenData.athlete.id,
      stravaId: tokenData.athlete.id.toString()
    }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)
    
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: tokenData.athlete.id.toString(),
        strava_id: tokenData.athlete.id.toString(),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      })

    if (dbError) {
      logger.error('Database error while storing user', dbError, {
        athleteId: tokenData.athlete.id,
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details
      }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)
      
      const response = NextResponse.redirect(new URL('/?error=db_error', request.url))
      
      timer.end()
      logger.logResponse('GET', request.url, 302, undefined, {
        redirectTo: 'home_with_error',
        error: 'database_error'
      }, 'strava-auth-callback', requestId)
      
      return withRequestId(response, requestId)
    }

    logger.info('User data stored successfully in database', {
      athleteId: tokenData.athlete.id,
      stravaId: tokenData.athlete.id.toString()
    }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)

    // Create redirect response and set cookie
    logger.debug('Setting authentication cookie and redirecting to dashboard', {
      athleteId: tokenData.athlete.id,
      cookieMaxAge: 60 * 60 * 24 * 30, // 30 days
      isProduction: process.env.NODE_ENV === 'production'
    }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)
    
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('strava_user_id', tokenData.athlete.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    logger.info('Authentication completed successfully', {
      athleteId: tokenData.athlete.id,
      athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
      redirectTo: '/dashboard'
    }, 'strava-auth-callback', tokenData.athlete.id.toString(), requestId)

    timer.end()
    logger.logResponse('GET', request.url, 302, undefined, {
      redirectTo: 'dashboard',
      success: true,
      athleteId: tokenData.athlete.id
    }, 'strava-auth-callback', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Authentication error in callback', error, {
      hasCode: !!code,
      codeLength: code?.length || 0,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, 'strava-auth-callback', undefined, requestId)
    
    const response = NextResponse.redirect(new URL('/?error=auth_failed', request.url))
    
    logger.logResponse('GET', request.url, 302, undefined, {
      redirectTo: 'home_with_error',
      error: 'auth_exception'
    }, 'strava-auth-callback', requestId)
    
    return withRequestId(response, requestId)
  }
} 