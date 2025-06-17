'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error with comprehensive context
    logger.error('Application error boundary triggered', error, {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorDigest: error.digest,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      severity: 'HIGH'
    }, 'error-boundary')

    // Log additional browser context if available
    if (typeof window !== 'undefined') {
      logger.info('Browser context at error time', {
        location: {
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash
        },
        navigator: {
          userAgent: window.navigator.userAgent,
          language: window.navigator.language,
          onLine: window.navigator.onLine,
          cookieEnabled: window.navigator.cookieEnabled
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight
        },
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        }
      }, 'error-boundary')
    }

    // Log performance metrics if available
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        logger.debug('Performance metrics at error time', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
          loadComplete: navigation.loadEventEnd - navigation.startTime,
          domInteractive: navigation.domInteractive - navigation.startTime,
          firstPaint: navigation.responseEnd - navigation.startTime
        }, 'error-boundary')
      }
    }
  }, [error])

  const handleReset = () => {
    logger.info('Error boundary reset triggered', {
      errorName: error.name,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    }, 'error-boundary')
    
    reset()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              We encountered an unexpected error. This has been logged and we&apos;ll investigate.
            </p>
          </div>

          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Development Debug Info:
              </h3>
              <div className="text-xs text-gray-700 space-y-1">
                <div><strong>Error:</strong> {error.name}</div>
                <div><strong>Message:</strong> {error.message}</div>
                {error.digest && (
                  <div><strong>Digest:</strong> {error.digest}</div>
                )}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Stack Trace</summary>
                    <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              onClick={handleReset}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try again
            </button>
            
            <button
              onClick={() => {
                logger.info('User navigated to home from error page', {
                  errorName: error.name,
                  timestamp: new Date().toISOString()
                }, 'error-boundary')
                window.location.href = '/'
              }}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to homepage
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Error ID: {error.digest || 'N/A'} | Time: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 