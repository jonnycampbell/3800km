-- 3800km Hiking Tracker Database Schema
-- Run this SQL in your Supabase SQL editor to set up the database

-- Users table to store Strava authentication data
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  strava_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table to store hiking/walking activities
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  strava_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance REAL NOT NULL,
  moving_time INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location_city TEXT,
  location_country TEXT,
  elevation_gain REAL NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_start_date ON activities(start_date);
CREATE INDEX idx_activities_strava_id ON activities(strava_id);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to both tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for easy progress tracking
CREATE OR REPLACE VIEW user_progress AS
SELECT 
    u.id as user_id,
    u.strava_id,
    COUNT(a.id) as total_activities,
    COALESCE(SUM(a.distance), 0) as total_distance_meters,
    COALESCE(SUM(a.distance) / 1000, 0) as total_distance_km,
    COALESCE(SUM(a.moving_time), 0) as total_moving_time_seconds,
    COALESCE(SUM(a.elevation_gain), 0) as total_elevation_gain,
    ROUND((COALESCE(SUM(a.distance), 0) / 1000 / 3800) * 100, 2) as progress_percentage,
    MAX(a.start_date) as last_activity_date
FROM users u
LEFT JOIN activities a ON u.id = a.user_id
GROUP BY u.id, u.strava_id;

-- Sample query to check progress (uncomment to use):
-- SELECT * FROM user_progress; 