import ActivityList from '@/components/ActivityList'
import SetupRequired from '@/components/SetupRequired'

async function getActivities() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/activities`, {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to fetch activities:', errorData)
      
      if (errorData.setupRequired) {
        throw new Error('SETUP_REQUIRED')
      }
      
      return []
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching activities:', error)
    if (error instanceof Error && error.message === 'SETUP_REQUIRED') {
      throw error
    }
    return []
  }
}

export default async function Dashboard() {
  let activities = []
  let setupRequired = false
  
  try {
    activities = await getActivities()
  } catch (error) {
    if (error instanceof Error && error.message === 'SETUP_REQUIRED') {
      setupRequired = true
    }
  }
  
  const totalDistance = activities.reduce((sum: number, activity: { distance: number }) => sum + activity.distance, 0)
  const totalKm = totalDistance / 1000
  const goalKm = 3800
  const remainingKm = goalKm - totalKm
  const progressPercentage = (totalKm / goalKm) * 100

  // Show setup instructions if needed
  if (setupRequired) {
    return <SetupRequired />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-gray-900">3800km</h1>
              <p className="font-light text-gray-600 mt-2">
                Documenting my hiking adventures, one step at a time
              </p>
            </div>
            <div className="font-light text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* No Activities Message */}
        {activities.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-yellow-600">ℹ️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-800">No Activities Found</h3>
                <p className="font-normal text-yellow-700 mt-1">
                  No hiking or walking activities were found in your Strava account. 
                  Make sure you have some activities recorded on Strava.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">KM</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="font-medium text-sm text-gray-800">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900">{totalKm.toFixed(1)} km</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">%</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="font-medium text-sm text-gray-800">Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progressPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="font-medium text-sm text-gray-800">Activities</p>
                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🎯</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="font-medium text-sm text-gray-800">Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(0, remainingKm).toFixed(1)} km
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Meter */}
        {activities.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Progress to 3,800km</h2>
                <span className="text-lg font-semibold text-blue-600">
                  {totalKm.toFixed(1)} km ({progressPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span className="font-light">0 km</span>
                <span className="font-light">{goalKm.toLocaleString()} km goal</span>
              </div>
            </div>
          </div>
        )}

        {/* Activity List */}
        {activities.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ActivityList activities={activities} />
          </div>
        )}
      </div>
    </div>
  )
} 