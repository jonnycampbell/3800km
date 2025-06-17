import { NextRequest, NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }

  try {
    const tokenData = await stravaAPI.exchangeCodeForToken(code)
    
    // Store user data in Supabase
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
      console.error('Database error:', dbError)
      return NextResponse.redirect(new URL('/?error=db_error', request.url))
    }

    // Create redirect response and set cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('strava_user_id', tokenData.athlete.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
} 