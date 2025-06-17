import { NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'

export async function GET() {
  const authUrl = stravaAPI.getAuthUrl()
  return NextResponse.redirect(authUrl)
} 