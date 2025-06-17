import { NextResponse } from 'next/server'
import { stravaAPI } from '@/lib/strava'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = cookies()
    const userId = (await cookieStore).get('strava_user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if token needs refresh
    let accessToken = userData.access_token
    if (Date.now() / 1000 > userData.expires_at) {
      const newTokenData = await stravaAPI.refreshToken(userData.refresh_token)
      accessToken = newTokenData.access_token

      // Update tokens in database
      await supabase
        .from('users')
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token,
          expires_at: newTokenData.expires_at,
        })
        .eq('id', userId)
    }

    // Fetch all activities from Strava
    const allActivities = await stravaAPI.getAllActivities(accessToken)
    
    // Filter for hiking activities
    const hikingActivities = stravaAPI.filterHikingActivities(allActivities)

    // Store activities in database
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

    const { error: insertError } = await supabase
      .from('activities')
      .upsert(activitiesToInsert, {
        onConflict: 'strava_id',
        ignoreDuplicates: false,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to sync activities' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Activities synced successfully',
      count: activitiesToInsert.length 
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 