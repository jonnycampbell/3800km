'use client'

import { useEffect } from 'react'

export default function TestPage() {
  useEffect(() => {
    console.log('🧪 Test page loaded!')
    console.log('🧪 Current time:', new Date().toISOString())
    console.log('🧪 Window object:', typeof window)
    console.log('🧪 Document object:', typeof document)
    
    // Test different console methods
    console.info('🧪 Console.info is working')
    console.warn('🧪 Console.warn is working')
    console.error('🧪 Console.error is working')
    console.debug('🧪 Console.debug is working')
    
    // Test with objects
    console.log('🧪 Object logging test:', {
      test: true,
      nested: { value: 42 },
      array: [1, 2, 3]
    })
  }, [])
  
  const handleClick = () => {
    console.log('🧪 Button clicked!')
    alert('Button clicked! Check console for logs.')
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">🧪 Debug Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <p className="text-lg text-gray-700">
            This is a test page to verify your app is working.
          </p>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">What to check:</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Open your browser's developer console (F12)</li>
              <li>Look for log messages starting with 🧪</li>
              <li>Check the terminal running `npm run dev` for server logs</li>
              <li>Look for the red debug box in the top-left corner</li>
            </ul>
          </div>
          
          <button
            onClick={handleClick}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Click me to test console logging
          </button>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-yellow-800">Where to find logs:</h3>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              <li><strong>Browser Console:</strong> Press F12 → Console tab</li>
              <li><strong>Server Logs:</strong> Terminal running `npm run dev`</li>
              <li><strong>Network Tab:</strong> F12 → Network tab (for API calls)</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-500 mt-4">
            <p>Current time: {new Date().toISOString()}</p>
            <p>User agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 