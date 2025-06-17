import ActivityList from '@/components/ActivityList'
import SetupRequired from '@/components/SetupRequired'
import { logger } from '@/lib/logger'

async function getActivities() {
  const startTime = Date.now()
  logger.info('Starting activities fetch from dashboard', undefined, 'dashboard-page')
  
  try {
    // Fix: Use proper base URL for both development and production
    // In production, we'll use relative URLs which work with any domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? '' // Use relative URLs in production
                     : 'http://localhost:3000')
    
    const apiUrl = `${baseUrl}/api/activities`
    logger.debug('Constructed API URL', { 
      baseUrl, 
      apiUrl,
      environment: process.env.NODE_ENV,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL
    }, 'dashboard-page')
    
    logger.info('Making fetch request to activities API', { apiUrl }, 'dashboard-page')
    
    const response = await fetch(apiUrl, {
      // Fix: Remove cache: 'no-store' which causes build issues
      next: { revalidate: 900 } // Cache for 15 minutes instead
    })
    
    const duration = Date.now() - startTime
    logger.debug('Activities API response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${duration}ms`,
      headers: {
        cacheStatus: response.headers.get('x-cache-status'),
        cacheAge: response.headers.get('x-cache-age'),
        requestId: response.headers.get('x-request-id')
      }
    }, 'dashboard-page')
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Activities API returned error', undefined, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        duration: `${duration}ms`
      }, 'dashboard-page')
      
      if (errorData.setupRequired) {
        logger.warn('Setup required detected from API response', errorData, 'dashboard-page')
        throw new Error('SETUP_REQUIRED')
      }
      
      logger.warn('API error but continuing with empty activities', {
        status: response.status,
        errorData
      }, 'dashboard-page')
      return []
    }
    
    const activities = await response.json()
    logger.info('Successfully fetched activities from API', {
      activitiesCount: activities.length,
      duration: `${duration}ms`,
      totalDistance: activities.reduce((sum: number, activity: { distance: number }) => sum + activity.distance, 0),
      cacheStatus: response.headers.get('x-cache-status')
    }, 'dashboard-page')
    
    return activities
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching activities', error, { 
      duration: `${duration}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, 'dashboard-page')
    
    if (error instanceof Error && error.message === 'SETUP_REQUIRED') {
      logger.info('Setup required, throwing error to parent', undefined, 'dashboard-page')
      throw error
    }
    
    logger.warn('Returning empty activities due to error', undefined, 'dashboard-page')
    return []
  }
}

export default async function Dashboard() {
  const pageStartTime = Date.now()
  logger.info('Dashboard page rendering started', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  }, 'dashboard-page')
  
  let activities = []
  let setupRequired = false
  
  try {
    logger.debug('Attempting to fetch activities', undefined, 'dashboard-page')
    activities = await getActivities()
    logger.debug('Activities fetch completed', { activitiesCount: activities.length }, 'dashboard-page')
  } catch (error) {
    logger.error('Error in dashboard activities fetch', error, undefined, 'dashboard-page')
    if (error instanceof Error && error.message === 'SETUP_REQUIRED') {
      setupRequired = true
      logger.info('Setting setupRequired flag to true', undefined, 'dashboard-page')
    }
  }
  
  // Calculate statistics
  const totalDistance = activities.reduce((sum: number, activity: { distance: number }) => sum + activity.distance, 0)
  const totalKm = totalDistance / 1000
  const goalKm = 3800
  const remainingKm = goalKm - totalKm
  const progressPercentage = (totalKm / goalKm) * 100

  const stats = {
    totalActivities: activities.length,
    totalDistance,
    totalKm: Math.round(totalKm * 10) / 10,
    goalKm,
    remainingKm: Math.round(remainingKm * 10) / 10,
    progressPercentage: Math.round(progressPercentage * 10) / 10
  }

  logger.info('Dashboard statistics calculated', stats, 'dashboard-page')

  const pageRenderTime = Date.now() - pageStartTime
  logger.info('Dashboard page rendering completed', {
    renderTime: `${pageRenderTime}ms`,
    setupRequired,
    activitiesCount: activities.length,
    stats
  }, 'dashboard-page')

  // Show setup instructions if needed
  if (setupRequired) {
    logger.info('Rendering SetupRequired component', undefined, 'dashboard-page')
    return <SetupRequired />
  }

  logger.debug('Rendering main dashboard content', {
    hasActivities: activities.length > 0,
    stats
  }, 'dashboard-page')

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