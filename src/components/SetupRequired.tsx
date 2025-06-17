'use client'

export default function SetupRequired() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Required</h1>
            <p className="font-normal text-gray-600">
              Your Strava API access token is missing or doesn't have the required permissions.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Setup Steps:</h2>
            <ol className="font-normal list-decimal list-inside space-y-2 text-gray-700">
              <li>Open your terminal in the project directory</li>
              <li>Run: <code className="bg-gray-200 px-2 py-1 rounded">node scripts/setup-strava-auth.js</code></li>
              <li>Follow the prompts to authorize your app with Strava</li>
              <li>Add the generated tokens to your <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code> file</li>
              <li>Restart your development server</li>
            </ol>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="font-normal text-blue-800 text-sm">
              <strong className="font-semibold">Note:</strong> Make sure your Strava app has the following scopes: 
              <code className="bg-blue-100 px-1 rounded">read</code>, 
              <code className="bg-blue-100 px-1 rounded">activity:read_all</code>, and 
              <code className="bg-blue-100 px-1 rounded">profile:read_all</code>
            </p>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="font-medium bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page After Setup
          </button>
        </div>
      </div>
    </div>
  )
} 