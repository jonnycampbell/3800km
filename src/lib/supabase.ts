import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

logger.info('Initializing Supabase client', {
  environment: process.env.NODE_ENV
}, 'supabase')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
const hasUrl = !!supabaseUrl
const hasAnonKey = !!supabaseAnonKey

logger.debug('Supabase environment validation', {
  hasUrl,
  hasAnonKey,
  url: supabaseUrl, // Safe to log URL
  keyLength: supabaseAnonKey?.length || 0
}, 'supabase')

if (!hasUrl || !hasAnonKey) {
  const missing = []
  if (!hasUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!hasAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  logger.error('Missing required Supabase environment variables', undefined, {
    missing,
    environment: process.env.NODE_ENV
  }, 'supabase')
} else {
  logger.info('Supabase environment variables validated successfully', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey.length
  }, 'supabase')
}

logger.debug('Creating Supabase client instance', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey
}, 'supabase')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // Disable auth persistence for server-side usage
  }
})

logger.info('Supabase client created successfully', undefined, 'supabase')

// Test connection function
export async function testSupabaseConnection() {
  logger.info('Testing Supabase connection', undefined, 'supabase')
  
  const timer = logger.time('supabase-connection-test', 'supabase')
  
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('count(*)')
      .limit(1)
    
    timer.end()
    
    if (error) {
      logger.error('Supabase connection test failed', error, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      }, 'supabase')
      return { success: false, error }
    }
    
    logger.info('Supabase connection test successful', { data }, 'supabase')
    return { success: true, data }
  } catch (error) {
    timer.end()
    logger.error('Error testing Supabase connection', error, undefined, 'supabase')
    return { success: false, error }
  }
}

// Enhanced database operations with logging
export async function insertActivity(activity: Database['public']['Tables']['activities']['Insert']) {
  logger.info('Inserting activity into database', {
    stravaId: activity.strava_id,
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    userId: activity.user_id
  }, 'supabase')
  
  const timer = logger.time('supabase-insert-activity', 'supabase')
  
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert(activity)
      .select()
    
    timer.end()
    
    if (error) {
      logger.error('Failed to insert activity', error, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        activity: {
          stravaId: activity.strava_id,
          name: activity.name,
          type: activity.type
        }
      }, 'supabase')
      throw error
    }
    
    logger.info('Activity inserted successfully', {
      insertedData: data,
      stravaId: activity.strava_id,
      name: activity.name
    }, 'supabase')
    
    return data
  } catch (error) {
    timer.end()
    logger.error('Error inserting activity', error, {
      activity: {
        stravaId: activity.strava_id,
        name: activity.name,
        type: activity.type
      }
    }, 'supabase')
    throw error
  }
}

export async function getActivitiesByUserId(userId: string) {
  logger.info('Fetching activities by user ID', { userId }, 'supabase')
  
  const timer = logger.time('supabase-get-activities-by-user', 'supabase')
  
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    
    timer.end()
    
    if (error) {
      logger.error('Failed to fetch activities by user ID', error, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        userId
      }, 'supabase')
      throw error
    }
    
    logger.info('Activities fetched successfully', {
      userId,
      activitiesCount: data?.length || 0,
      totalDistance: data?.reduce((sum, activity) => sum + activity.distance, 0) || 0
    }, 'supabase')
    
    return data
  } catch (error) {
    timer.end()
    logger.error('Error fetching activities by user ID', error, { userId }, 'supabase')
    throw error
  }
}

export async function upsertUser(user: Database['public']['Tables']['users']['Insert']) {
  logger.info('Upserting user', {
    id: user.id,
    stravaId: user.strava_id,
    expiresAt: new Date(user.expires_at * 1000).toISOString()
  }, 'supabase')
  
  const timer = logger.time('supabase-upsert-user', 'supabase')
  
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(user)
      .select()
    
    timer.end()
    
    if (error) {
      logger.error('Failed to upsert user', error, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        user: {
          id: user.id,
          stravaId: user.strava_id
        }
      }, 'supabase')
      throw error
    }
    
    logger.info('User upserted successfully', {
      data,
      id: user.id,
      stravaId: user.strava_id
    }, 'supabase')
    
    return data
  } catch (error) {
    timer.end()
    logger.error('Error upserting user', error, {
      user: {
        id: user.id,
        stravaId: user.strava_id
      }
    }, 'supabase')
    throw error
  }
}

export async function getUserByStravaId(stravaId: string) {
  logger.info('Fetching user by Strava ID', { stravaId }, 'supabase')
  
  const timer = logger.time('supabase-get-user-by-strava-id', 'supabase')
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('strava_id', stravaId)
      .single()
    
    timer.end()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is expected for new users
        logger.info('No user found with Strava ID (expected for new users)', { stravaId }, 'supabase')
        return null
      }
      
      logger.error('Failed to fetch user by Strava ID', error, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        stravaId
      }, 'supabase')
      throw error
    }
    
    logger.info('User fetched successfully', {
      stravaId,
      userId: data.id,
      tokenExpiresAt: new Date(data.expires_at * 1000).toISOString()
    }, 'supabase')
    
    return data
  } catch (error) {
    timer.end()
    logger.error('Error fetching user by Strava ID', error, { stravaId }, 'supabase')
    throw error
  }
}

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: number
          strava_id: string
          name: string
          type: string
          distance: number
          moving_time: number
          start_date: string
          location_city: string | null
          location_country: string | null
          elevation_gain: number
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          strava_id: string
          name: string
          type: string
          distance: number
          moving_time: number
          start_date: string
          location_city?: string | null
          location_country?: string | null
          elevation_gain: number
          user_id: string
        }
        Update: {
          name?: string
          type?: string
          distance?: number
          moving_time?: number
          start_date?: string
          location_city?: string | null
          location_country?: string | null
          elevation_gain?: number
        }
      }
      users: {
        Row: {
          id: string
          strava_id: string
          access_token: string
          refresh_token: string
          expires_at: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          strava_id: string
          access_token: string
          refresh_token: string
          expires_at: number
        }
        Update: {
          access_token?: string
          refresh_token?: string
          expires_at?: number
        }
      }
    }
  }
} 