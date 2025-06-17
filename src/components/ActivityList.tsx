'use client'

import { format } from 'date-fns'
import { MapPin, Clock, TrendingUp } from 'lucide-react'

interface Activity {
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
}

interface ActivityListProps {
  activities: Activity[]
}

export default function ActivityList({ activities }: ActivityListProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activities</h2>
      
      {sortedActivities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="font-normal">No hiking activities found.</p>
          <p className="font-light text-sm mt-2">Make sure your Strava access token is configured correctly.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {activity.name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 space-x-4">
                    <span className="font-normal">{format(new Date(activity.start_date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">KM</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Distance</p>
                    <p className="font-semibold text-gray-900">{(activity.distance / 1000).toFixed(2)} km</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Duration</p>
                    <p className="font-semibold text-gray-900">{formatDuration(activity.moving_time)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">Elevation</p>
                    <p className="font-semibold text-gray-900">{activity.elevation_gain.toFixed(0)} m</p>
                  </div>
                </div>

                {(activity.location_city || activity.location_country) && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">Location</p>
                      <p className="font-semibold text-sm text-gray-900">
                        {[activity.location_city, activity.location_country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="font-light text-sm text-gray-500">
                  Avg Pace: <span className="font-semibold">{((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(1)} min/km</span>
                </div>
                <a
                  href={`https://www.strava.com/activities/${activity.strava_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-orange-600 hover:text-orange-700 text-sm"
                >
                  View on Strava →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 