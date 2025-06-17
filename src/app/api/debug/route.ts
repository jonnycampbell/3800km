import { NextResponse } from 'next/server'

export async function GET() {
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
  
  return NextResponse.json(envCheck)
} 