import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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