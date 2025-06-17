import { NextResponse } from 'next/server'
import { logger, generateRequestId, withRequestId } from '@/lib/logger'

export async function GET(request: Request) {
  const requestId = generateRequestId()
  const timer = logger.time('debug-api-request', 'debug-api')
  
  logger.logRequest('GET', request.url, {
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, 'debug-api', requestId)

  try {
    logger.info('Debug endpoint called - gathering environment information', undefined, 'debug-api', undefined, requestId)
    
    // This endpoint helps debug production environment issues
    const envCheck = {
      // Environment info
      nodeEnv: process.env.NODE_ENV,
      
      // Required environment variables (check existence, not values for security)
      hasStravaAccessToken: !!process.env.STRAVA_ACCESS_TOKEN,
      hasStravaClientId: !!process.env.STRAVA_CLIENT_ID,
      hasStravaClientSecret: !!process.env.STRAVA_CLIENT_SECRET,
      hasStravaRefreshToken: !!process.env.STRAVA_REFRESH_TOKEN,
      
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
      
      // Deployment info
      timestamp: new Date().toISOString(),
      
      // Missing variables
      missingVariables: [] as string[]
    }
    
    // Check for missing critical variables
    const requiredVars = [
      'STRAVA_ACCESS_TOKEN',
      'STRAVA_CLIENT_ID', 
      'STRAVA_CLIENT_SECRET',
      'STRAVA_REFRESH_TOKEN',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
    
    envCheck.missingVariables = requiredVars.filter(varName => !process.env[varName])

    logger.info('Environment check completed', {
      hasAllRequired: envCheck.missingVariables.length === 0,
      missingCount: envCheck.missingVariables.length,
      missingVars: envCheck.missingVariables,
      environment: envCheck.nodeEnv,
      hasBaseUrl: envCheck.hasBaseUrl,
      baseUrl: envCheck.baseUrl
    }, 'debug-api', undefined, requestId)

    if (envCheck.missingVariables.length > 0) {
      logger.warn('Missing critical environment variables detected', {
        missing: envCheck.missingVariables,
        severity: 'HIGH'
      }, 'debug-api', undefined, requestId)
    }

    const response = NextResponse.json(envCheck)
    
    timer.end()
    logger.logResponse('GET', request.url, 200, undefined, {
      missingVarsCount: envCheck.missingVariables.length,
      environment: envCheck.nodeEnv
    }, 'debug-api', requestId)

    return withRequestId(response, requestId)
  } catch (error) {
    timer.end()
    logger.error('Error in debug endpoint', error, undefined, 'debug-api', undefined, requestId)
    
    const response = NextResponse.json({ 
      error: 'Failed to gather debug information',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requestId
    }, { status: 500 })

    logger.logResponse('GET', request.url, 500, undefined, { error: 'debug_failed' }, 'debug-api', requestId)
    return withRequestId(response, requestId)
  }
} 